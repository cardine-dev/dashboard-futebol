import type { Jogador } from "@/type/jogador";
import { setorDe, type Setor } from "@/lib/ui/sector";

/**
 * Perfil de atributos (0–100) GERADO para a demonstração.
 *
 * O cadastro real não tem notas de scout; aqui elas saem de forma
 * determinística do id do atleta (mesmo atleta, mesmas notas, sempre),
 * com viés pelo setor e pela idade para ficarem plausíveis. A interface
 * sempre avisa que são dados de demonstração.
 */

export const ATRIBUTOS = ["tecnica", "fisico", "tatica", "mental", "velocidade", "potencial"] as const;
export type Atributo = (typeof ATRIBUTOS)[number];
export type Perfil = Record<Atributo, number>;

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

const VIES: Record<Setor, Partial<Perfil>> = {
  GOL: { tecnica: -6, fisico: 4, tatica: 6, mental: 8, velocidade: -10 },
  DEF: { fisico: 8, tatica: 8, velocidade: -2, tecnica: -4 },
  MEI: { tecnica: 8, tatica: 6, mental: 2, fisico: -3 },
  ATA: { tecnica: 5, velocidade: 9, fisico: 1, tatica: -5 },
};

const clamp = (n: number) => Math.max(28, Math.min(97, Math.round(n)));

export function perfilDe(j: Pick<Jogador, "id" | "posicao" | "idade" | "valorMercado">): Perfil {
  const r = rng(hash(j.id));
  const setor = setorDe(j.posicao);
  const vies = VIES[setor];
  const idade = typeof j.idade === "number" ? j.idade : 24;
  const valor = Number(j.valorMercado) || 0;
  // Valor de mercado puxa a média para cima (até ~+10)
  const nivel = 58 + Math.min(12, Math.log10(1 + valor) * 9);

  const out = {} as Perfil;
  for (const a of ATRIBUTOS) {
    let v = nivel + (r() - 0.5) * 22 + (vies[a] ?? 0);
    if (a === "potencial") v = nivel + (25 - idade) * 2.4 + (r() - 0.5) * 10;
    if (a === "fisico") v += idade < 19 ? -6 : idade > 31 ? -5 : 2;
    if (a === "mental") v += Math.min(8, (idade - 20) * 0.9);
    out[a] = clamp(v);
  }
  return out;
}

export function media(p: Perfil) {
  return Math.round(ATRIBUTOS.reduce((s, a) => s + p[a], 0) / ATRIBUTOS.length);
}

/** Atletas mais parecidos: mesmo setor, distância por idade, valor e perfil. */
export function parecidos<T extends Pick<Jogador, "id" | "posicao" | "idade" | "valorMercado">>(
  alvo: T,
  todos: T[],
  n = 4,
): T[] {
  const sa = setorDe(alvo.posicao);
  const pa = perfilDe(alvo);
  return todos
    .filter((j) => j.id !== alvo.id && setorDe(j.posicao) === sa)
    .map((j) => {
      const pj = perfilDe(j);
      const dPerfil = ATRIBUTOS.reduce((s, a) => s + Math.abs(pa[a] - pj[a]), 0) / ATRIBUTOS.length;
      const dIdade = Math.abs((alvo.idade ?? 0) - (j.idade ?? 0)) * 2.2;
      const dValor = Math.abs(Math.log1p(Number(alvo.valorMercado) || 0) - Math.log1p(Number(j.valorMercado) || 0)) * 8;
      return { j, d: dPerfil + dIdade + dValor };
    })
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((x) => x.j);
}
