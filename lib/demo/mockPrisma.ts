/**
 * Mock Prisma client — modo demo (sem banco).
 *
 * Implementa o subconjunto da API do Prisma usado pela app sobre arrays em
 * memória (lib/demo/dataset.ts). Cobre findMany/findUnique/findFirst/count/
 * aggregate/create/createMany/update/updateMany/delete/deleteMany/$transaction
 * e $queryRaw (por tag determinística — ver lib/dashboard/sqlTag.ts).
 *
 * Fidelidade ao Prisma real que importa para a app:
 * - `mode: "insensitive"` em equals/contains/startsWith/endsWith/in
 * - `select: { _count: { select: { rel: true } } }`
 * - unique (id/email/slug/dedupeKey): create → erro P2002; createMany com skipDuplicates → ignora
 * - registro inexistente em update/delete → erro com code "P2025"
 * - onDelete do schema: Cascade (conversa → mensagens; usuário → conversas/relatórios)
 *   e SetNull (clube → jogadores.clubeId; conversa → relatórios.conversationId)
 * - Transferencia.valor sempre number
 *
 * Estado: um sandbox por navegador (cookie demo_sbx), salvo no Runtime Cache da Vercel
 * por 12 h — ver lib/demo/sandbox.ts.
 */
import {
  users,
  clubs,
  players,
  transferencias,
  reports,
  chatConversations,
  chatMessages,
} from "./dataset";
import { RAW_QUERY_META_KEY, type RawQueryMeta } from "@/lib/dashboard/sqlTag";
import type { WidgetFilters } from "@/type/dashboard";
import { currentTables, inSandbox, markDirty, registerSeed, type Tables } from "./sandbox";

type Row = Record<string, any>;

/**
 * As tabelas são as do sandbox da requisição atual (lib/demo/sandbox.ts): cada navegador
 * tem a sua cópia do dataset, sincronizada entre instâncias pelo Runtime Cache da Vercel.
 */
registerSeed(() =>
  structuredClone({
    user: users as Row[],
    club: clubs as Row[],
    player: players as Row[],
    transferencia: transferencias as Row[],
    report: reports as Row[],
    chatConversation: chatConversations as Row[],
    chatMessage: chatMessages as Row[],
  }),
);
const tables: Tables = new Proxy({} as Tables, { get: (_t, model: string) => currentTables()[model] });

type Rel = { type: "one" | "many"; model: string; fk: string; ref: string };
const relations: Record<string, Record<string, Rel>> = {
  player: { clube: { type: "one", model: "club", fk: "clubeId", ref: "id" } },
  club: { players: { type: "many", model: "player", fk: "clubeId", ref: "id" } },
  user: {
    conversations: { type: "many", model: "chatConversation", fk: "userId", ref: "id" },
    reports: { type: "many", model: "report", fk: "userId", ref: "id" },
  },
  chatConversation: {
    user: { type: "one", model: "user", fk: "userId", ref: "id" },
    messages: { type: "many", model: "chatMessage", fk: "conversationId", ref: "id" },
    reports: { type: "many", model: "report", fk: "conversationId", ref: "id" },
  },
  chatMessage: {
    conversation: { type: "one", model: "chatConversation", fk: "conversationId", ref: "id" },
  },
  report: {
    user: { type: "one", model: "user", fk: "userId", ref: "id" },
    conversation: { type: "one", model: "chatConversation", fk: "conversationId", ref: "id" },
  },
};

/** Campos únicos por model (espelha @id/@unique do schema). */
const uniqueFields: Record<string, string[]> = {
  user: ["id", "email"],
  club: ["id", "slug"],
  player: ["id"],
  transferencia: ["id", "dedupeKey"],
  report: ["id"],
  chatConversation: ["id"],
  chatMessage: ["id"],
};

/** onDelete do schema, aplicado quando o pai é removido. */
type OnDelete = { model: string; fk: string; action: "cascade" | "setNull" };
const onDeleteRules: Record<string, OnDelete[]> = {
  user: [
    { model: "chatConversation", fk: "userId", action: "cascade" },
    { model: "report", fk: "userId", action: "cascade" },
  ],
  club: [{ model: "player", fk: "clubeId", action: "setNull" }],
  chatConversation: [
    { model: "chatMessage", fk: "conversationId", action: "cascade" },
    { model: "report", fk: "conversationId", action: "setNull" },
  ],
};

/* ----------------------------- erros estilo Prisma ----------------------------- */
function prismaError(code: "P2025" | "P2002", message: string) {
  const err = new Error(message) as Error & { code: string };
  err.code = code;
  return err;
}

/* ----------------------------- id gen ----------------------------- */
let seq = 1000;
function genId(prefix: string) {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${seq}`;
}

/* ----------------------------- where ----------------------------- */
function eqInsensitive(a: unknown, b: unknown, insensitive: boolean) {
  if (insensitive && typeof a === "string" && typeof b === "string") {
    return a.toLowerCase() === b.toLowerCase();
  }
  if (a instanceof Date || b instanceof Date) return toComparable(a) === toComparable(b);
  return a === b;
}

function matchCondition(value: any, cond: any): boolean {
  if (cond === null) return value === null || value === undefined;
  if (typeof cond !== "object" || cond instanceof Date) {
    return eqInsensitive(value, cond, false);
  }
  const ins = cond.mode === "insensitive";
  const str = (v: unknown) => (ins ? String(v ?? "").toLowerCase() : String(v ?? ""));

  for (const [op, target] of Object.entries(cond)) {
    switch (op) {
      case "equals":
        if (target === null) {
          if (!(value === null || value === undefined)) return false;
        } else if (!eqInsensitive(value, target, ins)) return false;
        break;
      case "not":
        if (target === null) {
          if (value === null || value === undefined) return false;
        } else if (target !== null && typeof target === "object" && !(target instanceof Date)) {
          if (matchCondition(value, target)) return false;
        } else if (eqInsensitive(value, target, ins)) return false;
        break;
      case "in":
        if (!Array.isArray(target) || !target.some((t) => eqInsensitive(value, t, ins))) return false;
        break;
      case "notIn":
        if (Array.isArray(target) && target.some((t) => eqInsensitive(value, t, ins))) return false;
        break;
      case "gt":
        if (value == null || !(toComparable(value) > toComparable(target))) return false;
        break;
      case "gte":
        if (value == null || !(toComparable(value) >= toComparable(target))) return false;
        break;
      case "lt":
        if (value == null || !(toComparable(value) < toComparable(target))) return false;
        break;
      case "lte":
        if (value == null || !(toComparable(value) <= toComparable(target))) return false;
        break;
      case "contains":
        if (value == null || !str(value).includes(str(target))) return false;
        break;
      case "startsWith":
        if (value == null || !str(value).startsWith(str(target))) return false;
        break;
      case "endsWith":
        if (value == null || !str(value).endsWith(str(target))) return false;
        break;
      case "mode":
        break; // modificador dos operadores acima
      default:
        // operador não suportado → ignora (não filtra)
        break;
    }
  }
  return true;
}

function toComparable(v: any): number | string {
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
      const d = Date.parse(v);
      if (!Number.isNaN(d)) return d;
    }
    return v;
  }
  return Number(v);
}

function matchWhere(row: Row, where: any): boolean {
  if (!where) return true;
  for (const [key, cond] of Object.entries(where)) {
    if (cond === undefined) continue;
    if (key === "AND") {
      const arr = Array.isArray(cond) ? cond : [cond];
      if (!arr.every((w) => matchWhere(row, w))) return false;
    } else if (key === "OR") {
      const arr = Array.isArray(cond) ? cond : [cond];
      if (arr.length && !arr.some((w) => matchWhere(row, w))) return false;
    } else if (key === "NOT") {
      const arr = Array.isArray(cond) ? cond : [cond];
      if (arr.some((w) => matchWhere(row, w))) return false;
    } else {
      if (!matchCondition(row[key], cond)) return false;
    }
  }
  return true;
}

/* ----------------------------- select / relations ----------------------------- */
function relatedRows(model: string, row: Row, relName: string): Row[] {
  const rel = relations[model]?.[relName];
  if (!rel || rel.type !== "many") return [];
  return (tables[rel.model] ?? []).filter((r) => r[rel.fk] === row[rel.ref]);
}

function resolveCount(model: string, row: Row, spec: any): Row | number {
  // _count: true → total de cada relação "many"; _count: { select: { rel: true | { where } } }
  const sel = spec === true ? Object.fromEntries(Object.keys(relations[model] ?? {}).map((k) => [k, true])) : spec?.select;
  const out: Row = {};
  for (const [relName, v] of Object.entries(sel ?? {})) {
    if (!v) continue;
    let list = relatedRows(model, row, relName);
    if (typeof v === "object" && (v as any).where) list = list.filter((r) => matchWhere(r, (v as any).where));
    out[relName] = list.length;
  }
  return out;
}

function resolveRelation(model: string, row: Row, relName: string, sub: any): any {
  const rel = relations[model]?.[relName];
  if (!rel) return undefined;
  const target = tables[rel.model] ?? [];
  if (rel.type === "one") {
    const found = target.find((r) => r[rel.ref] === row[rel.fk]) ?? null;
    if (!found) return null;
    return projectRow(rel.model, found, sub === true ? undefined : sub);
  }
  let many = target.filter((r) => r[rel.fk] === row[rel.ref]);
  if (sub && typeof sub === "object") {
    if (sub.where) many = many.filter((r) => matchWhere(r, sub.where));
    if (sub.orderBy) many = orderRows(many, sub.orderBy);
    if (typeof sub.skip === "number") many = many.slice(sub.skip);
    if (typeof sub.take === "number") many = many.slice(0, sub.take);
  }
  return many.map((r) =>
    projectRow(rel.model, r, sub && typeof sub === "object" ? sub : undefined),
  );
}

function projectRow(model: string, row: Row, opts?: { select?: any; include?: any }): Row {
  const select = opts?.select;
  const include = opts?.include;

  // sem select/include → linha cheia (scalars) + includes
  if (!select) {
    const out: Row = { ...row };
    if (include) {
      for (const [k, v] of Object.entries(include)) {
        if (!v) continue;
        out[k] = k === "_count" ? resolveCount(model, row, v) : resolveRelation(model, row, k, v);
      }
    }
    return out;
  }

  const out: Row = {};
  for (const [k, v] of Object.entries(select)) {
    if (!v) continue;
    if (k === "_count") out[k] = resolveCount(model, row, v);
    else if (relations[model]?.[k]) out[k] = resolveRelation(model, row, k, v);
    else out[k] = row[k];
  }
  return out;
}

/* ----------------------------- orderBy ----------------------------- */
function orderRows(rows: Row[], orderBy: any): Row[] {
  if (!orderBy) return rows;
  const specs = Array.isArray(orderBy) ? orderBy : [orderBy];
  const out = [...rows];
  out.sort((a, b) => {
    for (const spec of specs) {
      for (const [field, dirSpec] of Object.entries(spec)) {
        const dir = typeof dirSpec === "object" && dirSpec ? (dirSpec as any).sort : dirSpec;
        const an = a[field] == null;
        const bn = b[field] == null;
        // Postgres: NULLS LAST no ASC, NULLS FIRST no DESC
        if (an || bn) {
          if (an && bn) continue;
          const nullCmp = an ? 1 : -1;
          return dir === "desc" ? -nullCmp : nullCmp;
        }
        const av = toComparable(a[field]);
        const bv = toComparable(b[field]);
        let cmp = 0;
        if (typeof av === "string" && typeof bv === "string") cmp = av.localeCompare(bv, "pt-BR");
        else if (av < bv) cmp = -1;
        else if (av > bv) cmp = 1;
        if (cmp !== 0) return dir === "desc" ? -cmp : cmp;
      }
    }
    return 0;
  });
  return out;
}

/* ----------------------------- aggregate ----------------------------- */
function aggregate(rows: Row[], args: any) {
  const res: Row = {};
  const apply = (key: "_sum" | "_avg" | "_min" | "_max") => {
    if (!args[key]) return;
    res[key] = {};
    for (const field of Object.keys(args[key])) {
      const nums = rows
        .map((r) => (r[field] == null ? NaN : Number(r[field])))
        .filter((n) => Number.isFinite(n));
      if (key === "_sum") res[key][field] = nums.length ? nums.reduce((a, b) => a + b, 0) : null;
      if (key === "_avg") res[key][field] = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
      if (key === "_min") res[key][field] = nums.length ? Math.min(...nums) : null;
      if (key === "_max") res[key][field] = nums.length ? Math.max(...nums) : null;
    }
  };
  apply("_sum");
  apply("_avg");
  apply("_min");
  apply("_max");
  if (args._count) {
    if (args._count === true) res._count = rows.length;
    else {
      res._count = {};
      for (const field of Object.keys(args._count)) {
        res._count[field] =
          field === "_all" ? rows.length : rows.filter((r) => r[field] !== null && r[field] !== undefined).length;
      }
    }
  }
  return res;
}

/* ----------------------------- normalização / unique ----------------------------- */
function normalizeRow(model: string, row: Row): Row {
  if (model === "transferencia" && row.valor != null) {
    const n = Number(row.valor);
    row.valor = Number.isFinite(n) ? n : null;
  }
  return row;
}

function findUniqueConflict(model: string, row: Row, ignore?: Row): string | null {
  for (const field of uniqueFields[model] ?? []) {
    const v = row[field];
    if (v === null || v === undefined) continue;
    if (tables[model].some((r) => r !== ignore && r[field] === v)) return field;
  }
  return null;
}

/* ----------------------------- cascades ----------------------------- */
function applyOnDelete(model: string, removed: Row[]) {
  for (const rule of onDeleteRules[model] ?? []) {
    const ids = new Set(removed.map((r) => r.id));
    const arr = tables[rule.model];
    if (rule.action === "setNull") {
      for (const r of arr) if (ids.has(r[rule.fk])) r[rule.fk] = null;
    } else {
      const children: Row[] = [];
      for (let i = arr.length - 1; i >= 0; i--) {
        if (ids.has(arr[i][rule.fk])) children.push(...arr.splice(i, 1));
      }
      if (children.length) applyOnDelete(rule.model, children);
    }
  }
}

/* ----------------------------- delegate ----------------------------- */
function makeDelegate(model: string, prefix: string) {
  const rows = () => tables[model];
  const filtered = (where: any) => rows().filter((r) => matchWhere(r, where));

  const methods = {
    async findMany(args: any = {}) {
      let res = filtered(args.where);
      if (args.distinct) {
        const seen = new Set<string>();
        const fields = Array.isArray(args.distinct) ? args.distinct : [args.distinct];
        res = res.filter((r) => {
          const k = fields.map((f: string) => r[f]).join("|");
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
      }
      if (args.orderBy) res = orderRows(res, args.orderBy);
      if (typeof args.skip === "number") res = res.slice(args.skip);
      if (typeof args.take === "number") res = res.slice(0, args.take);
      return res.map((r) => projectRow(model, r, args));
    },
    async findUnique(args: any) {
      const r = filtered(args.where)[0] ?? null;
      return r ? projectRow(model, r, args) : null;
    },
    async findUniqueOrThrow(args: any) {
      const r = filtered(args.where)[0];
      if (!r) throw prismaError("P2025", `${model} not found`);
      return projectRow(model, r, args);
    },
    async findFirst(args: any = {}) {
      let res = filtered(args.where);
      if (args.orderBy) res = orderRows(res, args.orderBy);
      const r = res[0] ?? null;
      return r ? projectRow(model, r, args) : null;
    },
    async count(args: any = {}) {
      return filtered(args.where).length;
    },
    async aggregate(args: any = {}) {
      return aggregate(filtered(args.where), args);
    },
    async create(args: any) {
      const now = new Date();
      const row = normalizeRow(model, {
        id: args.data?.id ?? genId(prefix),
        createdAt: now,
        updatedAt: now,
        ...args.data,
      });
      const conflict = findUniqueConflict(model, row);
      if (conflict) throw prismaError("P2002", `${model}.${conflict} já existe`);
      rows().push(row);
      markDirty();
      return projectRow(model, row, args);
    },
    async createMany(args: any) {
      const list = Array.isArray(args?.data) ? args.data : [];
      const now = new Date();
      const accepted: Row[] = [];
      for (const d of list) {
        const row = normalizeRow(model, { id: d.id ?? genId(prefix), createdAt: now, updatedAt: now, ...d });
        // checa contra o banco E contra o próprio lote (ON CONFLICT DO NOTHING do Postgres)
        const conflict =
          findUniqueConflict(model, row) ??
          (uniqueFields[model] ?? []).find(
            (f) => row[f] != null && accepted.some((a) => a[f] === row[f]),
          ) ??
          null;
        if (conflict) {
          if (args?.skipDuplicates) continue;
          throw prismaError("P2002", `${model}.${conflict} já existe`);
        }
        accepted.push(row);
      }
      rows().push(...accepted);
      if (accepted.length) markDirty();
      return { count: accepted.length };
    },
    async update(args: any) {
      const r = filtered(args.where)[0];
      if (!r) throw prismaError("P2025", `${model} update: registro não encontrado`);
      const next = normalizeRow(model, { ...r, ...args.data });
      const conflict = findUniqueConflict(model, next, r);
      if (conflict) throw prismaError("P2002", `${model}.${conflict} já existe`);
      Object.assign(r, next, { updatedAt: new Date() });
      markDirty();
      return projectRow(model, r, args);
    },
    async updateMany(args: any) {
      const list = filtered(args.where);
      for (const r of list) Object.assign(r, normalizeRow(model, { ...args.data }), { updatedAt: new Date() });
      if (list.length) markDirty();
      return { count: list.length };
    },
    async delete(args: any) {
      const arr = rows();
      const idx = arr.findIndex((r) => matchWhere(r, args.where));
      if (idx < 0) throw prismaError("P2025", `${model} delete: registro não encontrado`);
      const [removed] = arr.splice(idx, 1);
      applyOnDelete(model, [removed]);
      markDirty();
      return projectRow(model, removed, args);
    },
    async deleteMany(args: any = {}) {
      const arr = rows();
      const removed: Row[] = [];
      for (let i = arr.length - 1; i >= 0; i--) {
        if (matchWhere(arr[i], args.where)) removed.push(...arr.splice(i, 1));
      }
      if (removed.length) {
        applyOnDelete(model, removed);
        markDirty();
      }
      return { count: removed.length };
    },
  };
  return Object.fromEntries(
    Object.entries(methods).map(([name, fn]) => [
      name,
      (args?: any) => inSandbox<unknown>(() => (fn as (a?: any) => unknown)(args)),
    ]),
  ) as unknown as typeof methods;
}

/* ----------------------------- $queryRaw (por tag) ----------------------------- */
function sqlText(query: any): string {
  if (query == null) return "";
  if (typeof query === "string") return query;
  if (typeof query.sql === "string") return query.sql;
  if (Array.isArray(query.strings)) return query.strings.join(" ? ");
  return String(query);
}

function readQueryMeta(query: any): RawQueryMeta | null {
  const meta = query?.[RAW_QUERY_META_KEY] as RawQueryMeta | undefined;
  if (meta?.tag) return meta;
  const m = /\/\*\s*q:([\w.]+)\s*\*\//.exec(sqlText(query));
  return m ? ({ tag: m[1], filters: null } as RawQueryMeta) : null;
}

type T = Row;

/** Mesmo recorte que buildWhereSql() em lib/dashboard/loaders/market.ts. */
function filterTransfers(list: T[], f: WidgetFilters | null): T[] {
  if (!f) return list;
  const from = f.period?.from ? new Date(f.period.from).getTime() : null;
  const to = f.period?.to ? new Date(f.period.to).getTime() : null;
  const inList = (v: unknown, arr?: string[]) => !arr?.length || (typeof v === "string" && arr.includes(v));

  return list.filter((t) => {
    const ts = t.dataTransferencia instanceof Date ? t.dataTransferencia.getTime() : null;
    if (from !== null && (ts === null || ts < from)) return false;
    if (to !== null && (ts === null || ts > to)) return false;
    if (!inList(t.atletaPosicao, f.position)) return false;
    if (!inList(t.paisClubeDestino, f.country)) return false;
    if (f.club?.length && !(inList(t.clubeOrigem, f.club) || inList(t.clubeDestino, f.club))) return false;
    return true; // liga: não existe coluna no schema → ignorado (igual ao real)
  });
}

const hasFee = (t: T) => t.valor != null && Number(t.valor) > 0;
const hasDate = (t: T) => t.dataTransferencia instanceof Date;

function byMonth(list: T[], metric: (acc: number, t: T) => number, key: "deals" | "value") {
  const map = new Map<string, { year: number; month: number; v: number }>();
  for (const t of list) {
    const y = t.dataTransferencia.getUTCFullYear();
    const m = t.dataTransferencia.getUTCMonth() + 1;
    const k = `${y}-${m}`;
    const e = map.get(k) ?? { year: y, month: m, v: 0 };
    e.v = metric(e.v, t);
    map.set(k, e);
  }
  return [...map.values()]
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .map((e) => ({ year: e.year, month: e.month, [key]: e.v }));
}

function groupSum(list: T[], field: string) {
  const map = new Map<string, number>();
  for (const t of list) {
    const key = String(t[field] ?? "").trim();
    if (!key || !hasFee(t)) continue;
    map.set(key, (map.get(key) ?? 0) + Number(t.valor));
  }
  return [...map.entries()]
    .map(([clube, total]) => ({ clube, total }))
    .sort((a, b) => b.total - a.total);
}

let warnedUntagged = false;

function handleQueryRaw(query: any): any[] {
  const meta = readQueryMeta(query);
  if (!meta) {
    if (!warnedUntagged) {
      warnedUntagged = true;
      console.warn("[mockPrisma] $queryRaw sem tag /* q:... */ — devolvendo []. Use taggedSql().");
    }
    return [];
  }

  const all = tables.transferencia;
  const scoped = () => filterTransfers(all, meta.filters);

  switch (meta.tag) {
    case "meta.transfer_columns":
      return [];

    case "kpi.base_weighted_value": {
      const weighted = tables.player
        .filter((p) => p.valorMercado != null && p.possePct != null)
        .reduce((acc, p) => acc + Number(p.valorMercado) * 1_000_000 * (Number(p.possePct) / 100), 0);
      return [{ weighted }];
    }

    case "kpi.market_deals_per_month": {
      const withT = all.filter(hasDate);
      const months = new Set(
        withT.map((t) => `${t.dataTransferencia.getUTCFullYear()}-${t.dataTransferencia.getUTCMonth()}`),
      );
      return [{ deals: withT.length, months: months.size }];
    }

    case "market.deals_by_month":
      return byMonth(scoped().filter(hasDate), (acc) => acc + 1, "deals");

    case "market.fee_by_month":
      return byMonth(scoped().filter((t) => hasDate(t) && hasFee(t)), (acc, t) => acc + Number(t.valor), "value");

    case "market.fee_distribution":
      return scoped()
        .filter(hasFee)
        .map((t) => ({ valor: Number(t.valor) }));

    case "market.top_buyers":
      return groupSum(scoped(), "clubeDestino").slice(0, 12);

    case "market.top_sellers":
      return groupSum(scoped(), "clubeOrigem").slice(0, 12);

    case "market.top_leagues_countries": {
      const map = new Map<string, number>();
      for (const t of scoped()) {
        const label = String(t.paisClubeDestino ?? "").trim() || "—";
        map.set(label, (map.get(label) ?? 0) + 1);
      }
      return [...map.entries()]
        .map(([label, deals]) => ({ label, deals }))
        .sort((a, b) => b.deals - a.deals)
        .slice(0, 12);
    }

    case "market.age_vs_fee_scatter":
      return scoped()
        .filter((t) => t.atletaIdade != null && hasFee(t))
        .slice(0, 800)
        .map((t) => ({
          idade: t.atletaIdade,
          valor: Number(t.valor),
          posicao: String(t.atletaPosicao ?? "").trim() || null,
          label: String(t.atletaNome ?? "").trim() || null,
        }));

    case "market.position_avg_fee": {
      const map = new Map<string, { sum: number; deals: number }>();
      for (const t of scoped()) {
        if (!hasFee(t)) continue;
        const pos = String(t.atletaPosicao ?? "").trim() || "—";
        const e = map.get(pos) ?? { sum: 0, deals: 0 };
        e.sum += Number(t.valor);
        e.deals += 1;
        map.set(pos, e);
      }
      return [...map.entries()]
        .map(([posicao, v]) => ({ posicao, avg: v.sum / v.deals, deals: v.deals }))
        .sort((a, b) => b.avg - a.avg);
    }

    default:
      console.warn(`[mockPrisma] tag de query desconhecida: ${String(meta.tag)}`);
      return [];
  }
}

/* ----------------------------- client ----------------------------- */
export const mockPrisma: any = {
  user: makeDelegate("user", "user"),
  club: makeDelegate("club", "club"),
  player: makeDelegate("player", "plr"),
  transferencia: makeDelegate("transferencia", "trf"),
  report: makeDelegate("report", "rep"),
  chatConversation: makeDelegate("chatConversation", "conv"),
  chatMessage: makeDelegate("chatMessage", "msg"),

  $queryRaw(query: any) {
    return inSandbox(() => handleQueryRaw(query));
  },
  $queryRawUnsafe(query: any) {
    return inSandbox(() => handleQueryRaw(query));
  },
  async $executeRaw() {
    return 0;
  },
  async $executeRawUnsafe() {
    return 0;
  },
  async $transaction(arg: any) {
    if (typeof arg === "function") return inSandbox(() => arg(mockPrisma));
    return Promise.all(arg ?? []);
  },
  async $connect() {},
  async $disconnect() {},
};
