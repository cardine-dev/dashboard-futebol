/**
 * Sandbox da demo: cada navegador tem a sua cópia dos dados.
 *
 * Por quê: na Vercel o mock roda em várias instâncias ao mesmo tempo. Com estado só em
 * memória, um jogador criado numa instância sumia na requisição seguinte (medido: 34 de
 * 40 GETs paralelos davam 404 logo após o create). Aqui o estado de cada sandbox vive no
 * Runtime Cache da Vercel (compartilhado pelas instâncias da região) com um número de
 * versão; cada instância guarda uma cópia local e só baixa o snapshot quando a versão muda.
 * Fora da Vercel, `getCache()` cai num cache em memória do processo (mesmo código).
 *
 * O id do sandbox vem do cookie `demo_sbx` (criado no login). Sem cookie → cópia descartável
 * por requisição (somente leitura na prática: escrita sem sandbox não persiste).
 * Cada sandbox expira após SANDBOX_TTL sem escrita e volta ao dataset original.
 * O proxy (proxy.ts) recria o cookie para sessões logadas que ainda não têm um.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { getCache } from "@vercel/functions";

type Row = Record<string, any>;
export type Tables = Record<string, Row[]>;

export { SANDBOX_COOKIE, newSandboxId } from "./sandboxCookie";
import { SANDBOX_COOKIE } from "./sandboxCookie";
/** Mesma duração da sessão (lib/jwt.ts): o sandbox não pode expirar antes do login. */
export const SANDBOX_TTL = 60 * 60 * 24 * 7;
const LOCAL_MAX = 40;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

/** `stale`: o cache tem versão mais nova que não deu pra ler. Escrita nesse estado apagaria dados. */
type State = { id: string; version: number; tables: Tables; dirty: boolean; stale?: boolean };

const als = new AsyncLocalStorage<State>();
// globalThis: o Next empacota cada rota com a sua cópia do módulo; o mapa precisa ser um só.
const g = globalThis as unknown as { __demoSandboxes?: Map<string, State> };
const local = (g.__demoSandboxes ??= new Map<string, State>());
const perRequest = new WeakMap<object, Promise<State>>();
const inflight = new Map<string, Promise<State>>();

const validId = (v: string | undefined) => (v && /^[\w-]{8,64}$/.test(v) ? v : null);

// sha256 em vez do hash padrão de 32 bits: colisão faria dois navegadores dividirem o sandbox.
const cache = () =>
  getCache({ namespace: "demo-sbx", keyHashFunction: (k) => createHash("sha256").update(k).digest("hex") });
const vKey = (id: string) => `v:${id}`;
const dKey = (id: string) => `d:${id}`;

let seed: () => Tables;
/** O mockPrisma registra como montar uma cópia nova do dataset. */
export function registerSeed(fn: () => Tables) {
  seed = fn;
}

/** Tabelas do sandbox da requisição atual (fora de requisição: o seed compartilhado). */
let fallback: Tables | null = null;
export function currentTables(): Tables {
  const s = als.getStore();
  if (s) return s.tables;
  return (fallback ??= seed());
}

export function markDirty() {
  const s = als.getStore();
  if (s) s.dirty = true;
}

async function requestContext(): Promise<{ id: string; key: object | null }> {
  try {
    const { cookies } = await import("next/headers");
    const jar = await cookies();
    return { id: validId(jar.get(SANDBOX_COOKIE)?.value) ?? "public", key: jar };
  } catch {
    return { id: "public", key: null }; // fora de uma requisição (scripts, build)
  }
}

function remember(state: State) {
  local.delete(state.id);
  local.set(state.id, state);
  if (local.size > LOCAL_MAX) local.delete(local.keys().next().value!);
}

function load(id: string): Promise<State> {
  // Uma carga por sandbox por vez: requisições simultâneas do mesmo navegador dividem o mesmo estado.
  let p = inflight.get(id);
  if (!p) {
    p = loadOnce(id).finally(() => inflight.delete(id));
    inflight.set(id, p);
  }
  return p;
}

async function loadOnce(id: string): Promise<State> {
  const c = cache();
  // O cliente do cache não lança erro: falha ou timeout viram null.
  const remoteV = Number((await c.get(vKey(id)).catch(() => null)) ?? 0) || 0;
  const mine = local.get(id);
  // Cópia local tão nova quanto a remota: usa a local.
  if (mine && mine.version >= remoteV) return mine;
  if (remoteV === 0) {
    const fresh: State = { id, version: 0, tables: seed(), dirty: false };
    remember(fresh);
    return fresh;
  }

  // Snapshot guarda a própria versão; só vale se for a versão anunciada (ou mais nova).
  let snap: { v: number; t: Tables } | null = null;
  const raw = await c.get(dKey(id)).catch(() => null);
  if (typeof raw === "string") {
    try {
      snap = JSON.parse(raw, (_k, v) => (typeof v === "string" && ISO_DATE.test(v) ? new Date(v) : v));
    } catch {
      snap = null;
    }
  }
  if (snap && snap.v >= remoteV) {
    if (mine) {
      // atualiza no lugar: quem já segura este objeto vê os dados novos
      mine.tables = snap.t;
      mine.version = snap.v;
      return mine;
    }
    const state: State = { id, version: snap.v, tables: snap.t, dirty: false };
    remember(state);
    return state;
  }
  // Versão anunciada mas snapshot ilegível: lê com o que houver, mas não deixa gravar.
  return { id, version: mine?.version ?? 0, tables: mine?.tables ?? seed(), dirty: false, stale: true };
}

async function commit(state: State) {
  state.dirty = false;
  state.version = Math.max(Date.now(), state.version + 1); // nunca anda pra trás
  remember(state);
  const c = cache();
  const opts = { ttl: SANDBOX_TTL, name: "" };
  try {
    // snapshot (com a versão dentro) antes do número de versão
    await c.set(dKey(state.id), JSON.stringify({ v: state.version, t: state.tables }), opts);
    await c.set(vKey(state.id), state.version, opts);
  } catch (err) {
    console.warn("[demo] não consegui salvar o sandbox no cache", err);
  }
}

/** Roda uma operação do mock dentro do sandbox da requisição e salva se houve escrita. */
export async function inSandbox<T>(fn: () => Promise<T> | T): Promise<T> {
  const active = als.getStore();
  if (active) return fn(); // aninhado ($transaction): já está no sandbox

  const { id, key } = await requestContext();
  if (id === "public") {
    // Sem cookie de sandbox (antes do login, scripts): cópia descartável por requisição.
    // Nada gravado aqui chega a outro visitante — é o sandbox onde todo mundo faz login.
    const scratch: State = { id, version: 0, tables: seed(), dirty: false };
    return als.run(scratch, async () => fn());
  }
  let pending = key ? perRequest.get(key) : undefined;
  if (!pending) {
    pending = load(id);
    if (key) perRequest.set(key, pending);
  }
  const state = await pending;
  return als.run(state, async () => {
    const out = await fn();
    if (state.dirty && state.stale) {
      throw new Error("[demo] sandbox desatualizado: escrita recusada para não apagar dados");
    }
    if (state.dirty) await commit(state);
    return out;
  });
}
