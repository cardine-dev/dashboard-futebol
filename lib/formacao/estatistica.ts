/**
 * Funções estatísticas da tela de Formação.
 *
 * Tudo aqui é determinístico e explicável:
 * - chance sempre condicional ao grupo (k profissionais ÷ n atletas do grupo);
 * - intervalo de Wilson de 90%, que se comporta bem com chances pequenas;
 * - taxas por 90 minutos encolhidas para a média do nível, para que poucos
 *   minutos com muitos gols (o caso "4 gols em um jogo") não distorçam o atleta;
 * - z-scores cortados em ±3 desvios, para que um valor extremo não domine a
 *   semelhança entre atletas.
 */

import type { Intervalo } from "@/type/formacao";

/** z de 90% bicaudal. */
export const Z90 = 1.6449;

export function wilson(k: number, n: number, z = Z90): Intervalo {
  if (n <= 0) return { inferior: 0, superior: 1 };
  const p = k / n;
  const z2 = z * z;
  const den = 1 + z2 / n;
  const centro = (p + z2 / (2 * n)) / den;
  const meia = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / den;
  return {
    inferior: Math.max(0, centro - meia),
    superior: Math.min(1, centro + meia),
  };
}

/**
 * Taxa por 90 minutos encolhida para a média do grupo.
 * Equivale a somar `minutosPrior` minutos "médios" ao atleta: com muitos
 * minutos o dado próprio domina; com poucos, a média do nível domina.
 */
export const MINUTOS_PRIOR = 900;

export function porNoventaEncolhido(
  eventos: number,
  minutos: number,
  mediaPorNoventa: number,
  minutosPrior = MINUTOS_PRIOR,
): number {
  const eventosPrior = (mediaPorNoventa * minutosPrior) / 90;
  return ((eventos + eventosPrior) / (minutos + minutosPrior)) * 90;
}

export function media(xs: number[]): number {
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function desvio(xs: number[]): number {
  if (xs.length < 2) return 1;
  const m = media(xs);
  const v = xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (xs.length - 1);
  return Math.sqrt(v) || 1;
}

export const CORTE_Z = 3;

export function zCortado(x: number, m: number, s: number): number {
  const z = (x - m) / (s || 1);
  return Math.max(-CORTE_Z, Math.min(CORTE_Z, z));
}

/**
 * Semelhança entre dois atletas, de 0 a 1.
 * Média, entre as variáveis, de 1 − |za − zb| ÷ 6. Como cada z está entre
 * −3 e 3, a diferença máxima é 6. Semelhança de 90% equivale a uma diferença
 * média de 0,6 desvio por variável.
 */
export function semelhanca(za: number[], zb: number[]): number {
  if (!za.length || za.length !== zb.length) return 0;
  let soma = 0;
  for (let i = 0; i < za.length; i++) {
    soma += 1 - Math.abs(za[i] - zb[i]) / (2 * CORTE_Z);
  }
  return soma / za.length;
}
