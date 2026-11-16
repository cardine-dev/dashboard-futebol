/**
 * Tipos da tela de Formação: chance de profissionalização por nível do clube
 * formador e casos parecidos anônimos. Sem projeção financeira.
 */

export type Nivel = 1 | 2 | 3 | 4 | 5;

export type Intervalo = { inferior: number; superior: number };

/** Chance condicional: profissionais do nível ÷ atletas de base do nível. */
export type ChanceNivel = {
  nivel: Nivel;
  atletas: number;
  profissionais: number;
  chance: number;
  intervalo90: Intervalo;
  clubes: number;
  /** Teste fora da amostra: estima com turmas antigas, confere nas recentes. */
  teste: {
    turmasEstimacao: string;
    turmasTeste: string;
    chanceEstimada: number;
    chanceObservada: number;
    intervaloObservado: Intervalo;
    aprovado: boolean;
  };
};

export type ClubeComparado = {
  rotulo: string;
  ehSeuClube: boolean;
  atletas: number;
  profissionais: number;
  chance: number;
  intervalo90: Intervalo;
  idadeMediaEstreia: number | null;
};

export type DestinoDivisao = { divisao: string; profissionais: number; fracao: number };

export type VariavelAtleta = {
  chave: string;
  bruto: number;
  usado: number;
  z: number;
  mediaNivel: number;
};

export type CasosParecidos = {
  limiarSemelhanca: number;
  casos: number;
  profissionais: number;
  chance: number | null;
  intervalo90: Intervalo | null;
  minimoCasos: number;
  suficiente: boolean;
};

export type AtletaElenco = {
  id: string;
  nome: string;
  idade: number;
  categoria: string;
  posicao: string;
  jogos: number;
  minutos: number;
  gols: number;
  idadeCorte: number;
  chanceNivel: number;
  casosParecidos: CasosParecidos;
  variaveis: VariavelAtleta[];
};

export type FormacaoResponse = {
  ficticio: true;
  definicaoProfissional: { jogosMinimos: number; idadeLimite: number };
  seuClube: { nome: string; nivel: Nivel };
  niveis: ChanceNivel[];
  totalHistorico: number;
  clubesMesmoNivel: ClubeComparado[];
  destinosNivel: DestinoDivisao[];
  elenco: AtletaElenco[];
};
