/**
 * Dados FICTÍCIOS da tela de Formação.
 *
 * Gera, de forma determinística, uma base histórica de atletas de base de
 * clubes formadores classificados em 5 níveis, com o desfecho aos 21 anos
 * (virou profissional ou não), e o elenco atual de base de um clube de
 * demonstração. Nenhum dado real de atleta ou clube.
 *
 * As chances por nível e o peso das variáveis individuais são inventados para
 * a demonstração. O desempenho individual tem efeito propositalmente modesto:
 * na prática, o nível do clube formador explica a maior parte da chance.
 */

import type { Nivel } from "@/type/formacao";

/* ----------------------------- aleatório determinístico ----------------------------- */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261117);
const between = (min: number, max: number) => min + rnd() * (max - min);
const intBetween = (min: number, max: number) => Math.floor(between(min, max + 1));
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
function normal(): number {
  const u = Math.max(rnd(), 1e-12);
  const v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function poisson(lambda: number): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rnd();
  } while (p > L && k < 60);
  return k - 1;
}
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const logit = (p: number) => Math.log(p / (1 - p));
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
function pickPeso<T>(opcoes: Array<[T, number]>): T {
  const total = opcoes.reduce((a, [, w]) => a + w, 0);
  let r = rnd() * total;
  for (const [v, w] of opcoes) {
    r -= w;
    if (r <= 0) return v;
  }
  return opcoes[opcoes.length - 1][0];
}

/* ----------------------------- definições ----------------------------- */
export const JOGOS_PROFISSIONAL = 5;
export const IDADE_LIMITE_PROFISSIONAL = 21;
export const TURMAS = [2014, 2015, 2016, 2017, 2018, 2019];
export const TURMAS_ESTIMACAO = [2014, 2015, 2016, 2017];
export const TURMAS_TESTE = [2018, 2019];

/** Chance fictícia de virar profissional por nível do clube formador. */
const CHANCE_FICTICIA: Record<Nivel, number> = {
  1: 0.28,
  2: 0.16,
  3: 0.085,
  4: 0.055,
  5: 0.028,
};

const DESTINOS: Record<Nivel, Array<[string, number]>> = {
  1: [["Série A", 55], ["Série B", 20], ["Série C", 8], ["Série D", 3], ["Estadual", 4], ["Exterior", 10]],
  2: [["Série A", 20], ["Série B", 35], ["Série C", 20], ["Série D", 10], ["Estadual", 8], ["Exterior", 7]],
  3: [["Série A", 5], ["Série B", 20], ["Série C", 30], ["Série D", 22], ["Estadual", 18], ["Exterior", 5]],
  4: [["Série A", 2], ["Série B", 10], ["Série C", 25], ["Série D", 30], ["Estadual", 28], ["Exterior", 5]],
  5: [["Série A", 1], ["Série B", 5], ["Série C", 20], ["Série D", 32], ["Estadual", 38], ["Exterior", 4]],
};

export const POSICOES = ["GOL", "ZAG", "LAT", "VOL", "MEI", "ATA"] as const;
export type Posicao = (typeof POSICOES)[number];
export type Setor = "goleiro" | "defesa" | "meio" | "ataque";
export function setorDe(p: Posicao): Setor {
  if (p === "GOL") return "goleiro";
  if (p === "ZAG" || p === "LAT") return "defesa";
  if (p === "VOL" || p === "MEI") return "meio";
  return "ataque";
}
const GOLS_POR_90: Record<Setor, number> = {
  goleiro: 0.005,
  defesa: 0.07,
  meio: 0.18,
  ataque: 0.42,
};

/* ----------------------------- estruturas ----------------------------- */
export type Temporada = {
  idade: number;
  jogosTime: number;
  minutosTime: number;
  jogos: number;
  titular: number;
  minutos: number;
  minutosAcimaIdade: number;
  gols: number;
  cartoes: number;
  subiuCategoria: boolean;
};

export type ClubeFormador = {
  id: string;
  rotulo: string;
  nivel: Nivel;
  ehSeuClube: boolean;
};

export type AtletaHistorico = {
  id: string;
  clubeId: string;
  nivel: Nivel;
  turma: number;
  posicao: Posicao;
  setor: Setor;
  temporadas: Temporada[];
  profissional: boolean;
  idadeEstreia: number | null;
  divisaoDestino: string | null;
};

export type AtletaAtual = {
  id: string;
  nome: string;
  idade: number;
  categoria: string;
  posicao: Posicao;
  setor: Setor;
  temporadas: Temporada[];
};

/* ----------------------------- temporadas ----------------------------- */
const JOGOS_TIME = 18;
const MINUTOS_JOGO = 80;

function gerarTemporada(idade: number, talento: number, setor: Setor, outlier: boolean): Temporada {
  const jogosTime = JOGOS_TIME;
  const minutosTime = JOGOS_TIME * MINUTOS_JOGO;

  if (outlier) {
    // O caso "4 gols em um jogo": quase sem minutos e muitos gols.
    const minutos = intBetween(55, 80);
    return {
      idade,
      jogosTime,
      minutosTime,
      jogos: 1,
      titular: rnd() > 0.5 ? 1 : 0,
      minutos,
      minutosAcimaIdade: 0,
      gols: intBetween(3, 4),
      cartoes: 0,
      subiuCategoria: false,
    };
  }

  const fracMin = clamp(sigmoid(0.6 * talento + 0.9 * normal() - 0.2), 0.02, 0.97);
  const minutos = Math.round(fracMin * minutosTime);
  const jogosMin = Math.max(1, Math.ceil(minutos / MINUTOS_JOGO));
  const jogos = clamp(jogosMin + intBetween(0, 3), 1, jogosTime);
  const titular = clamp(Math.round(jogos * clamp(fracMin * 1.15 + 0.15 * normal(), 0, 1)), 0, jogos);
  const acima =
    rnd() < sigmoid(0.7 * talento - 1.6) ? Math.round(between(80, 700)) : 0;
  const gols = poisson(GOLS_POR_90[setor] * Math.exp(0.25 * talento) * (minutos / 90));
  const cartoes = poisson(0.16 * (minutos / 90));
  const subiuCategoria = idade === 15 && rnd() < sigmoid(0.6 * talento - 1.4);

  return {
    idade,
    jogosTime,
    minutosTime,
    jogos,
    titular,
    minutos,
    minutosAcimaIdade: acima,
    gols,
    cartoes,
    subiuCategoria,
  };
}

function gerarTemporadas(idadeMax: number, talento: number, setor: Setor): Temporada[] {
  const outlierIdade = rnd() < 0.02 ? pick([14, 15, 16].filter((i) => i <= idadeMax)) : null;
  const temporadas: Temporada[] = [];
  for (const idade of [14, 15, 16]) {
    if (idade > idadeMax) break;
    const presente =
      idade === 15 ? true : idade === 14 ? rnd() < 0.6 : rnd() < clamp(0.72 + 0.08 * talento, 0.4, 0.95);
    if (!presente) continue;
    temporadas.push(gerarTemporada(idade, talento, setor, outlierIdade === idade));
  }
  return temporadas;
}

/* ----------------------------- clubes ----------------------------- */
export const SEU_CLUBE = { id: "club_006", nome: "Clube do Cerrado", nivel: 4 as Nivel };

const CLUBES_POR_NIVEL = 8;
const ATLETAS_POR_TURMA = 32;

const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const clubesFormadores: ClubeFormador[] = [];
const multiplicadorClube = new Map<string, number>();

for (const nivel of [1, 2, 3, 4, 5] as Nivel[]) {
  for (let i = 0; i < CLUBES_POR_NIVEL; i++) {
    const ehSeuClube = nivel === SEU_CLUBE.nivel && i === 0;
    const id = ehSeuClube ? SEU_CLUBE.id : `form_${nivel}_${i + 1}`;
    clubesFormadores.push({
      id,
      rotulo: ehSeuClube ? SEU_CLUBE.nome : `Clube ${LETRAS[i]}`,
      nivel,
      ehSeuClube,
    });
    multiplicadorClube.set(id, Math.exp(0.22 * normal()));
  }
}

/* ----------------------------- histórico ----------------------------- */
export const historico: AtletaHistorico[] = [];

{
  let seq = 0;
  for (const clube of clubesFormadores) {
    const mult = multiplicadorClube.get(clube.id) ?? 1;
    const base = clamp(CHANCE_FICTICIA[clube.nivel] * mult, 0.005, 0.6);
    for (const turma of TURMAS) {
      for (let j = 0; j < ATLETAS_POR_TURMA; j++) {
        seq++;
        const posicao = pickPeso<Posicao>([
          ["GOL", 1], ["ZAG", 2], ["LAT", 2], ["VOL", 2], ["MEI", 2], ["ATA", 2],
        ]);
        const setor = setorDe(posicao);
        const talento = normal();
        const temporadas = gerarTemporadas(16, talento, setor);
        const profissional = rnd() < sigmoid(logit(base) + 0.55 * talento - 0.12);
        historico.push({
          id: `hist_${seq}`,
          clubeId: clube.id,
          nivel: clube.nivel,
          turma,
          posicao,
          setor,
          temporadas,
          profissional,
          idadeEstreia: profissional ? pickPeso([[18, 3], [19, 4], [20, 3], [21, 2]]) : null,
          divisaoDestino: profissional ? pickPeso(DESTINOS[clube.nivel]) : null,
        });
      }
    }
  }
}

/* ----------------------------- elenco atual do clube de demonstração ----------------------------- */
const NOMES = [
  "Kauã", "Ryan", "Yuri", "Otávio", "Heitor", "Benício", "Cauê", "Lorenzo",
  "Samuel", "Nicolas", "Joaquim", "Vitor", "Luan", "Emanuel", "Isaque", "Wesley",
];
const SOBRENOMES = [
  "Prado", "Mendes", "Nunes", "Freitas", "Vieira", "Campos", "Duarte", "Moura",
  "Reis", "Pires", "Lopes", "Sales", "Brito", "Farias", "Guedes", "Tavares",
];

export const elencoAtual: AtletaAtual[] = Array.from({ length: 28 }, (_, i) => {
  const idade = i < 10 ? 15 : i < 20 ? 16 : 17;
  const posicao = pickPeso<Posicao>([
    ["GOL", 1], ["ZAG", 2], ["LAT", 2], ["VOL", 2], ["MEI", 2], ["ATA", 2],
  ]);
  const setor = setorDe(posicao);
  const talento = normal();
  let temporadas = gerarTemporadas(Math.min(idade, 16), talento, setor);
  // Garante um exemplo visível do caso "4 gols em um jogo".
  if (i === 3) {
    temporadas = [gerarTemporada(15, 0, "ataque", true)];
  }
  return {
    id: `base_${String(i + 1).padStart(2, "0")}`,
    nome: `${pick(NOMES)} ${pick(SOBRENOMES)}`,
    idade,
    categoria: idade <= 15 ? "Sub-15" : "Sub-17",
    posicao: i === 3 ? "ATA" : posicao,
    setor: i === 3 ? "ataque" : setor,
    temporadas,
  };
});
