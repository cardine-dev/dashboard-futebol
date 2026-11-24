/**
 * Dataset sintético do modo demo.
 *
 * Todos os jogadores, clubes e transferências aqui são FICTÍCIOS — gerados
 * deterministicamente. Nenhum dado real de cliente. Alimenta dashboard, KPIs,
 * mapa, lista de jogadores, transferências, relatórios e chat.
 */
import { hashSync } from "bcryptjs";

/* ----------------------------- PRNG determinístico ----------------------------- */
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
const rnd = mulberry32(20260602);
const pick = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const between = (min: number, max: number) => min + rnd() * (max - min);
const intBetween = (min: number, max: number) => Math.floor(between(min, max + 1));
const id = (p: string, n: number) => `${p}_${String(n).padStart(3, "0")}`;

/**
 * "Hoje" = data real do servidor (calculada quando o módulo carrega). Tudo que é
 * temporal (contratos, transferências, idades) é relativo a ela, então a demo
 * nunca mostra transferência no futuro nem contrato "vencido" por data fixa.
 * O PRNG continua com semente fixa: a estrutura dos dados é estável entre reinícios.
 */
export const NOW = new Date();
const DAY_MS = 24 * 60 * 60 * 1000;
const daysFromNow = (days: number) => new Date(NOW.getTime() + days * DAY_MS);
const monthsFromNow = (months: number) => {
  const d = new Date(NOW);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
};
/** Idade completa em `at` para quem nasceu em `birth`. */
const ageAt = (birth: Date, at: Date) => {
  let age = at.getUTCFullYear() - birth.getUTCFullYear();
  const m = at.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && at.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age;
};

/* ----------------------------- Usuários ----------------------------- */
export type DemoUser = {
  id: string;
  name: string | null;
  email: string;
  passwordHash: string;
  role: "ADMIN" | "CLIENT";
  image: string | null;
  createdAt: Date;
  mustChangePassword: boolean;
};

export const users: DemoUser[] = [
  {
    id: "user_admin",
    name: "Admin Demo",
    email: "admin@demo.com",
    passwordHash: hashSync("admin@2025", 8),
    role: "ADMIN",
    image: null,
    createdAt: new Date("2026-01-10T10:00:00Z"),
    mustChangePassword: false,
  },
  {
    id: "user_cliente",
    name: "Cliente Demo",
    email: "cliente@demo.com",
    passwordHash: hashSync("cliente@2025", 8),
    role: "CLIENT",
    image: null,
    createdAt: new Date("2026-01-12T10:00:00Z"),
    mustChangePassword: false,
  },
];

/* ----------------------------- Clubes ----------------------------- */
export type DemoClub = {
  id: string;
  nome: string;
  slug: string;
  logoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  countryCode: string | null;
  countryName: string | null;
  stateCode: string | null;
  stateName: string | null;
  city: string | null;
  continentCode: string | null;
};

const clubSeed: Array<[string, string, string, string, string, string]> = [
  // nome, countryCode, countryName, stateCode, stateName, city
  ["Atlético Litoral", "BR", "Brasil", "RJ", "Rio de Janeiro", "Niterói"],
  ["União Planalto", "BR", "Brasil", "SP", "São Paulo", "Campinas"],
  ["Esporte Serra Azul", "BR", "Brasil", "MG", "Minas Gerais", "Juiz de Fora"],
  ["Grêmio Pampa", "BR", "Brasil", "RS", "Rio Grande do Sul", "Pelotas"],
  ["Náutico Recôncavo", "BR", "Brasil", "BA", "Bahia", "Feira de Santana"],
  ["Clube do Cerrado", "BR", "Brasil", "GO", "Goiás", "Anápolis"],
  ["Lisboa Atlântico", "PT", "Portugal", null, null, "Lisboa"],
  ["Atlético Ribera Sur", "AR", "Argentina", null, null, "Buenos Aires"],
  ["Albufera CF", "ES", "Espanha", null, null, "Valência"],
  ["Austin Prairie SC", "US", "Estados Unidos", null, null, "Austin"],
];

export const clubs: DemoClub[] = clubSeed.map(
  ([nome, cc, cn, sc, sn, city], i) => ({
    id: id("club", i + 1),
    nome,
    slug: nome.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    logoUrl: null,
    createdAt: new Date("2026-01-05T10:00:00Z"),
    updatedAt: new Date("2026-01-05T10:00:00Z"),
    countryCode: cc,
    countryName: cn,
    stateCode: sc,
    stateName: sn,
    city,
    continentCode:
      cc === "BR" || cc === "AR"
        ? "SA"
        : cc === "US"
          ? "NA"
          : "EU",
  }),
);

/* ----------------------------- Jogadores ----------------------------- */
export type DemoPlayer = {
  id: string;
  nome: string;
  cpf: string | null;
  idade: number;
  posicao: string;
  peDominante: string;
  valorMercado: number; // milhões de EUR
  altura: number | null;
  situacao: string | null;
  contratoInicio: Date | null;
  contratoFim: Date | null;
  imagemUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  numeroCamisa: number | null;
  representacao: string | null;
  possePct: number | null;
  anoNascimento: number | null;
  cidade: string | null;
  nacionalidade: string | null;
  empresario: string | null;
  observacoes: string | null;
  racionalProspecao: string | null;
  direitosBase: number | null;
  clubeId: string | null;
  [k: string]: unknown;
};

const FIRST = [
  "Lucas", "Gabriel", "Matheus", "Rafael", "Bruno", "Diego", "Felipe", "Thiago",
  "André", "Vinícius", "Caio", "Pedro", "João", "Eduardo", "Rodrigo", "Marcos",
  "Henrique", "Leandro", "Igor", "Murilo", "Davi", "Enzo", "Arthur", "Bernardo",
];
const LAST = [
  "Silva", "Santos", "Oliveira", "Souza", "Lima", "Costa", "Pereira", "Almeida",
  "Ferreira", "Rodrigues", "Gomes", "Martins", "Araújo", "Ribeiro", "Carvalho",
  "Barbosa", "Rocha", "Dias", "Nascimento", "Moreira", "Cardoso", "Teixeira",
];
const POSICOES = ["GOL", "ZAG", "LAT", "VOL", "MEI", "ATA"];
const AGENCIES = [
  "Prime Sports", "Elite Football", "Vértice Agency", "GoalMakers",
  "NextGen Talents", "Atlas Management", null, null,
];
const NACIONALIDADES = ["Brasil", "Brasil", "Brasil", "Argentina", "Portugal", "Uruguai"];
const CIDADES = ["São Paulo", "Rio de Janeiro", "Belo Horizonte", "Porto Alegre", "Salvador", "Curitiba"];
const SITUACOES = ["Ativo", "Ativo", "Emprestado", "Em negociação"];

/** Contrato relativo a hoje: ~1 em 4 vence em 3–9 meses (alimenta o widget de risco). */
function contractFor(): { inicio: Date; fim: Date } {
  const inicio = monthsFromNow(-intBetween(6, 42));
  const roll = rnd();
  const fim =
    roll < 0.25
      ? monthsFromNow(intBetween(3, 9))
      : roll < 0.4
        ? monthsFromNow(intBetween(10, 18))
        : monthsFromNow(intBetween(19, 54));
  return { inicio, fim };
}

export const players: DemoPlayer[] = Array.from({ length: 48 }, (_, i) => {
  // nascimento sorteado → idade e ano de nascimento sempre coerentes com hoje
  const birth = daysFromNow(-Math.round(between(16, 34.99) * 365.25));
  const idade = ageAt(birth, NOW);
  const posicao = pick(POSICOES);
  // valor maior pra MEI/ATA jovens; menor pra GOL/idade alta
  const baseVal = posicao === "ATA" || posicao === "MEI" ? between(2, 42) : between(0.4, 22);
  const ageFactor = idade <= 23 ? 1.15 : idade >= 30 ? 0.6 : 1;
  const valorMercado = Math.round(baseVal * ageFactor * 10) / 10;
  const hasClub = rnd() > 0.12;
  const possePct = rnd() > 0.15 ? intBetween(20, 100) : null;
  const contrato = contractFor();
  return {
    id: id("plr", i + 1),
    nome: `${pick(FIRST)} ${pick(LAST)}`,
    cpf: String(intBetween(10000000000, 99999999999)),
    idade,
    posicao,
    peDominante: rnd() > 0.78 ? "E" : "D",
    valorMercado,
    altura: Math.round(between(1.66, 1.98) * 100) / 100,
    situacao: pick(SITUACOES),
    contratoInicio: contrato.inicio,
    contratoFim: contrato.fim,
    imagemUrl: null,
    createdAt: monthsFromNow(-intBetween(1, 10)),
    updatedAt: daysFromNow(-intBetween(0, 30)),
    numeroCamisa: intBetween(1, 45),
    representacao: pick(AGENCIES),
    possePct,
    anoNascimento: birth.getUTCFullYear(),
    cidade: pick(CIDADES),
    nacionalidade: pick(NACIONALIDADES),
    empresario: pick(AGENCIES),
    observacoes: null,
    racionalProspecao:
      idade <= 21
        ? "Jovem com alto teto de evolução e boa janela de revenda."
        : "Atleta consolidado, contribui no curto prazo.",
    direitosBase: possePct,
    clubeId: hasClub ? pick(clubs).id : null,
  };
});

/* ----------------------------- Transferências ----------------------------- */
export type DemoTransfer = {
  id: string;
  atletaNome: string;
  atletaIdade: number | null;
  atletaPosicao: string | null;
  clubeFormador: string | null;
  cidadeClubeFormador: string | null;
  paisClubeFormador: string | null;
  clubeOrigem: string | null;
  clubeDestino: string | null;
  cidadeClubeDestino: string | null;
  paisClubeDestino: string | null;
  dataTransferencia: Date | null;
  valor: number | null; // EUR absoluto
  moeda: string | null;
  fonte: string | null;
  criadoEm: Date;
  dedupeKey: string | null;
};

/**
 * Clubes de mercado INVENTADOS (nomes plausíveis, países reais). Nenhum clube real.
 * [nome, país, cidade]
 */
const EXT_CLUBS: Array<[string, string, string]> = [
  ["Atlético Ribeira", "Brasil", "Ribeirão Preto"],
  ["Esporte Clube Vale Verde", "Brasil", "Joinville"],
  ["Sociedade Litoral Norte", "Brasil", "Fortaleza"],
  ["Sporting Douro", "Portugal", "Porto"],
  ["União Tejo", "Portugal", "Santarém"],
  ["Real Cantábrico", "Espanha", "Santander"],
  ["Deportivo Sierra Alta", "Espanha", "Granada"],
  ["Olympique Rhône-Alpes", "França", "Grenoble"],
  ["FC Lagune", "França", "Montpellier"],
  ["Polder United", "Holanda", "Zwolle"],
  ["Atlético Pampa Sur", "Argentina", "Rosario"],
  ["Club Ribera del Plata", "Argentina", "La Plata"],
  ["Dínamo Carpático", "Ucrânia", "Lviv"],
  ["AC Laguna Veneta", "Itália", "Treviso"],
  ["Calcio Appennino", "Itália", "Perugia"],
  ["Harbour Town FC", "Inglaterra", "Plymouth"],
];

/** Transferências espalhadas nos últimos ~30 meses, todas com data ≤ hoje. */
const TRANSFER_WINDOW_DAYS = 30 * 30;

/** Índice aleatório diferente de `except`. */
const otherIdx = (except: number, n: number) => (except + 1 + Math.floor(rnd() * (n - 1))) % n;

export const transferencias: DemoTransfer[] = Array.from({ length: 44 }, (_, i) => {
  const origemIdx = Math.floor(rnd() * EXT_CLUBS.length);
  // destino sempre diferente da origem
  const destinoIdx = otherIdx(origemIdx, EXT_CLUBS.length);
  // formador sorteado à parte: ~60% das vezes é outro clube que não a origem
  const formadorIdx = rnd() < 0.6 ? otherIdx(origemIdx, EXT_CLUBS.length) : origemIdx;

  const [origem] = EXT_CLUBS[origemIdx];
  const [destino, paisDestino, cidadeDestino] = EXT_CLUBS[destinoIdx];
  const [formador, paisFormador, cidadeFormador] = EXT_CLUBS[formadorIdx];

  const dataTransferencia = daysFromNow(-intBetween(1, TRANSFER_WINDOW_DAYS));
  dataTransferencia.setUTCHours(0, 0, 0, 0);
  const valor = Math.round(between(0.3, 28) * 1_000_000);

  return {
    id: id("trf", i + 1),
    atletaNome: `${pick(FIRST)} ${pick(LAST)}`,
    atletaIdade: intBetween(17, 31),
    atletaPosicao: pick(POSICOES),
    clubeFormador: formador,
    cidadeClubeFormador: cidadeFormador,
    paisClubeFormador: paisFormador,
    clubeOrigem: origem,
    clubeDestino: destino,
    cidadeClubeDestino: cidadeDestino,
    paisClubeDestino: paisDestino,
    dataTransferencia,
    valor,
    moeda: "EUR",
    fonte: "Mercado (demo)",
    criadoEm: dataTransferencia,
    dedupeKey: `dk_${i + 1}`,
  };
});

/* ----------------------------- Relatórios + Chat ----------------------------- */
export type DemoReport = {
  id: string;
  title: string;
  content: string;
  userId: string;
  conversationId: string | null;
  createdAt: Date;
};

export const reports: DemoReport[] = [
  {
    id: "rep_001",
    title: "Análise de elenco — oportunidades de venda",
    content:
      "## Resumo\n\nO elenco concentra valor em atletas jovens de meio-campo e ataque. " +
      "Três jogadores combinam alto valor de mercado e alto percentual de direitos, " +
      "representando as melhores janelas de revenda com ROI elevado.\n\n" +
      "## Recomendação\n\nPriorizar negociação dos atletas sub-23 com cláusula favorável " +
      "antes da próxima janela.",
    userId: "user_admin",
    conversationId: "conv_001",
    createdAt: daysFromNow(-12),
  },
  {
    id: "rep_002",
    title: "Panorama de mercado por posição",
    content:
      "## Mercado\n\nO ticket médio por posição mostra prêmio para atacantes e meias. " +
      "O volume de transações se concentra no segundo semestre.",
    userId: "user_admin",
    conversationId: null,
    createdAt: daysFromNow(-4),
  },
];

export type DemoConversation = {
  id: string;
  title: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};
export type DemoMessage = {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  toolTraces: unknown | null;
  attachments: unknown | null;
  createdAt: Date;
};

export const chatConversations: DemoConversation[] = [
  {
    id: "conv_001",
    title: "Oportunidades de venda",
    userId: "user_admin",
    createdAt: daysFromNow(-12.1),
    updatedAt: daysFromNow(-12.09),
  },
];

export const chatMessages: DemoMessage[] = [
  {
    id: "msg_001",
    conversationId: "conv_001",
    role: "user",
    content: "Quais jogadores têm maior potencial de revenda?",
    toolTraces: null,
    attachments: null,
    createdAt: daysFromNow(-12.099),
  },
  {
    id: "msg_002",
    conversationId: "conv_001",
    role: "assistant",
    content:
      "Os atletas sub-23 de meio-campo e ataque com alto valor de mercado e percentual de direitos " +
      "acima de 70% são os de maior potencial de revenda.",
    toolTraces: null,
    attachments: null,
    createdAt: daysFromNow(-12.098),
  },
];
