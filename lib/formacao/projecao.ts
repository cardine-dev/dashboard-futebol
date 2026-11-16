/**
 * Monta a resposta da tela de Formação a partir dos dados fictícios.
 *
 * O que entra (robusto):
 * - chance de virar profissional por nível do clube formador, condicional ao
 *   nível, com a conta, o intervalo de 90% e o teste fora da amostra;
 * - comparação com clubes do mesmo nível, com os outros clubes anônimos;
 * - casos parecidos anônimos, como referência e não como previsão.
 *
 * O que fica de fora (não robusto): valor de mercado projetado, valor da
 * carteira e chance individual vinda de um modelo.
 */

import type {
  AtletaElenco,
  ChanceNivel,
  ClubeComparado,
  DestinoDivisao,
  FormacaoResponse,
  Nivel,
  VariavelAtleta,
} from "@/type/formacao";
import {
  clubesFormadores,
  elencoAtual,
  historico,
  IDADE_LIMITE_PROFISSIONAL,
  JOGOS_PROFISSIONAL,
  SEU_CLUBE,
  TURMAS_ESTIMACAO,
  TURMAS_TESTE,
  type Setor,
  type Temporada,
} from "./dados";
import {
  desvio,
  media,
  porNoventaEncolhido,
  semelhanca,
  wilson,
  zCortado,
} from "./estatistica";

export const LIMIAR_SEMELHANCA = 0.9;
export const MINIMO_CASOS = 20;

const NIVEIS: Nivel[] = [1, 2, 3, 4, 5];

/** Ordem das variáveis usadas na semelhança. */
export const VARIAVEIS = [
  "fracMinutos",
  "fracTitular",
  "fracAcimaIdade",
  "gols90",
  "cartoes90",
  "continuidade",
  "subiuCategoria",
] as const;
type Chave = (typeof VARIAVEIS)[number];

type Totais = {
  minutos: number;
  minutosTime: number;
  titular: number;
  jogosTime: number;
  jogos: number;
  acima: number;
  gols: number;
  cartoes: number;
  temporadas: number;
  subiu: boolean;
};

function totaisAte(temporadas: Temporada[], corte: number): Totais {
  const t: Totais = {
    minutos: 0,
    minutosTime: 0,
    titular: 0,
    jogosTime: 0,
    jogos: 0,
    acima: 0,
    gols: 0,
    cartoes: 0,
    temporadas: 0,
    subiu: false,
  };
  for (const s of temporadas) {
    if (s.idade > corte) continue;
    t.minutos += s.minutos;
    t.minutosTime += s.minutosTime;
    t.titular += s.titular;
    t.jogosTime += s.jogosTime;
    t.jogos += s.jogos;
    t.acima += s.minutosAcimaIdade;
    t.gols += s.gols;
    t.cartoes += s.cartoes;
    t.temporadas += 1;
    t.subiu = t.subiu || s.subiuCategoria;
  }
  return t;
}

const corteDe = (idade: number) => (idade <= 15 ? 15 : 16);

/* ----------------------------- médias de referência por grupo ----------------------------- */
type Ref = { gols90: number; cartoes90: number };
const refCache = new Map<string, Ref>();

function referencia(nivel: Nivel, setor: Setor, corte: number): Ref {
  const chave = `${nivel}|${setor}|${corte}`;
  const pronto = refCache.get(chave);
  if (pronto) return pronto;
  let gols = 0;
  let minutosSetor = 0;
  let cartoes = 0;
  let minutosNivel = 0;
  for (const a of historico) {
    if (a.nivel !== nivel) continue;
    const t = totaisAte(a.temporadas, corte);
    cartoes += t.cartoes;
    minutosNivel += t.minutos;
    if (a.setor === setor) {
      gols += t.gols;
      minutosSetor += t.minutos;
    }
  }
  const ref = {
    gols90: minutosSetor ? (gols / minutosSetor) * 90 : 0,
    cartoes90: minutosNivel ? (cartoes / minutosNivel) * 90 : 0,
  };
  refCache.set(chave, ref);
  return ref;
}

type Vetor = { bruto: Record<Chave, number>; usado: Record<Chave, number> };

function vetor(temporadas: Temporada[], corte: number, ref: Ref): Vetor {
  const t = totaisAte(temporadas, corte);
  const gols90Bruto = t.minutos ? (t.gols / t.minutos) * 90 : 0;
  const cartoes90Bruto = t.minutos ? (t.cartoes / t.minutos) * 90 : 0;
  const comum = {
    fracMinutos: t.minutosTime ? t.minutos / t.minutosTime : 0,
    fracTitular: t.jogosTime ? t.titular / t.jogosTime : 0,
    fracAcimaIdade: t.minutos + t.acima ? t.acima / (t.minutos + t.acima) : 0,
    continuidade: t.temporadas,
    subiuCategoria: t.subiu ? 1 : 0,
  };
  return {
    bruto: { ...comum, gols90: gols90Bruto, cartoes90: cartoes90Bruto },
    usado: {
      ...comum,
      gols90: porNoventaEncolhido(t.gols, t.minutos, ref.gols90),
      cartoes90: porNoventaEncolhido(t.cartoes, t.minutos, ref.cartoes90),
    },
  };
}

/* ----------------------------- grupos de comparação ----------------------------- */
type Grupo = {
  usados: Array<Record<Chave, number>>;
  profissional: boolean[];
  medias: Record<Chave, number>;
  desvios: Record<Chave, number>;
  zs: number[][];
};
const grupoCache = new Map<string, Grupo>();

function grupo(nivel: Nivel, setor: Setor, corte: number): Grupo {
  const chave = `${nivel}|${setor}|${corte}`;
  const pronto = grupoCache.get(chave);
  if (pronto) return pronto;

  const ref = referencia(nivel, setor, corte);
  const membros = historico.filter((a) => a.nivel === nivel && a.setor === setor);
  const usados = membros.map((a) => vetor(a.temporadas, corte, ref).usado);

  const medias = {} as Record<Chave, number>;
  const desvios = {} as Record<Chave, number>;
  for (const k of VARIAVEIS) {
    const xs = usados.map((u) => u[k]);
    medias[k] = media(xs);
    desvios[k] = desvio(xs);
  }
  const zs = usados.map((u) => VARIAVEIS.map((k) => zCortado(u[k], medias[k], desvios[k])));

  const g = { usados, profissional: membros.map((a) => a.profissional), medias, desvios, zs };
  grupoCache.set(chave, g);
  return g;
}

/* ----------------------------- chance por nível ----------------------------- */
function chancePorNivel(): ChanceNivel[] {
  return NIVEIS.map((nivel) => {
    const doNivel = historico.filter((a) => a.nivel === nivel);
    const k = doNivel.filter((a) => a.profissional).length;
    const n = doNivel.length;

    const est = doNivel.filter((a) => TURMAS_ESTIMACAO.includes(a.turma));
    const tst = doNivel.filter((a) => TURMAS_TESTE.includes(a.turma));
    const kEst = est.filter((a) => a.profissional).length;
    const kTst = tst.filter((a) => a.profissional).length;
    const chanceEstimada = est.length ? kEst / est.length : 0;
    const intervaloObservado = wilson(kTst, tst.length);

    return {
      nivel,
      atletas: n,
      profissionais: k,
      chance: n ? k / n : 0,
      intervalo90: wilson(k, n),
      clubes: clubesFormadores.filter((c) => c.nivel === nivel).length,
      teste: {
        turmasEstimacao: `${TURMAS_ESTIMACAO[0]}–${TURMAS_ESTIMACAO[TURMAS_ESTIMACAO.length - 1]}`,
        turmasTeste: `${TURMAS_TESTE[0]}–${TURMAS_TESTE[TURMAS_TESTE.length - 1]}`,
        chanceEstimada,
        chanceObservada: tst.length ? kTst / tst.length : 0,
        intervaloObservado,
        aprovado:
          chanceEstimada >= intervaloObservado.inferior &&
          chanceEstimada <= intervaloObservado.superior,
      },
    };
  });
}

/* ----------------------------- clubes do mesmo nível ----------------------------- */
function clubesDoNivel(nivel: Nivel): ClubeComparado[] {
  const lista = clubesFormadores
    .filter((c) => c.nivel === nivel)
    .map((c) => {
      const atletas = historico.filter((a) => a.clubeId === c.id);
      const pros = atletas.filter((a) => a.profissional);
      const idades = pros.map((a) => a.idadeEstreia).filter((x): x is number => x != null);
      return {
        rotulo: c.rotulo,
        ehSeuClube: c.ehSeuClube,
        atletas: atletas.length,
        profissionais: pros.length,
        chance: atletas.length ? pros.length / atletas.length : 0,
        intervalo90: wilson(pros.length, atletas.length),
        idadeMediaEstreia: idades.length ? Math.round(media(idades) * 10) / 10 : null,
      };
    });
  // Seu clube primeiro; os outros, anônimos, por chance.
  return lista.sort((a, b) =>
    a.ehSeuClube === b.ehSeuClube ? b.chance - a.chance : a.ehSeuClube ? -1 : 1,
  );
}

function destinosDoNivel(nivel: Nivel): DestinoDivisao[] {
  const pros = historico.filter((a) => a.nivel === nivel && a.profissional);
  const ordem = ["Série A", "Série B", "Série C", "Série D", "Estadual", "Exterior"];
  return ordem.map((divisao) => {
    const k = pros.filter((a) => a.divisaoDestino === divisao).length;
    return { divisao, profissionais: k, fracao: pros.length ? k / pros.length : 0 };
  });
}

/* ----------------------------- elenco ----------------------------- */
function elenco(chanceNivel: number, nivel: Nivel): AtletaElenco[] {
  return elencoAtual.map((atleta) => {
    const corte = corteDe(atleta.idade);
    const ref = referencia(nivel, atleta.setor, corte);
    const g = grupo(nivel, atleta.setor, corte);
    const v = vetor(atleta.temporadas, corte, ref);
    const z = VARIAVEIS.map((k) => zCortado(v.usado[k], g.medias[k], g.desvios[k]));

    let casos = 0;
    let pros = 0;
    for (let i = 0; i < g.zs.length; i++) {
      if (semelhanca(z, g.zs[i]) >= LIMIAR_SEMELHANCA) {
        casos++;
        if (g.profissional[i]) pros++;
      }
    }
    const suficiente = casos >= MINIMO_CASOS;

    const variaveis: VariavelAtleta[] = VARIAVEIS.map((k, i) => ({
      chave: k,
      bruto: v.bruto[k],
      usado: v.usado[k],
      z: z[i],
      mediaNivel: g.medias[k],
    }));

    const tudo = totaisAte(atleta.temporadas, 99);
    return {
      id: atleta.id,
      nome: atleta.nome,
      idade: atleta.idade,
      categoria: atleta.categoria,
      posicao: atleta.posicao,
      jogos: tudo.jogos,
      minutos: tudo.minutos,
      gols: tudo.gols,
      idadeCorte: corte,
      chanceNivel,
      casosParecidos: {
        limiarSemelhanca: LIMIAR_SEMELHANCA,
        casos,
        profissionais: pros,
        chance: suficiente ? pros / casos : null,
        intervalo90: suficiente ? wilson(pros, casos) : null,
        minimoCasos: MINIMO_CASOS,
        suficiente,
      },
      variaveis,
    };
  });
}

/* ----------------------------- resposta ----------------------------- */
let cache: FormacaoResponse | null = null;

export function montarFormacao(): FormacaoResponse {
  if (cache) return cache;
  const niveis = chancePorNivel();
  const nivelSeu = niveis.find((n) => n.nivel === SEU_CLUBE.nivel)!;
  cache = {
    ficticio: true,
    definicaoProfissional: {
      jogosMinimos: JOGOS_PROFISSIONAL,
      idadeLimite: IDADE_LIMITE_PROFISSIONAL,
    },
    seuClube: { nome: SEU_CLUBE.nome, nivel: SEU_CLUBE.nivel },
    niveis,
    totalHistorico: historico.length,
    clubesMesmoNivel: clubesDoNivel(SEU_CLUBE.nivel),
    destinosNivel: destinosDoNivel(SEU_CLUBE.nivel),
    elenco: elenco(nivelSeu.chance, SEU_CLUBE.nivel),
  };
  return cache;
}
