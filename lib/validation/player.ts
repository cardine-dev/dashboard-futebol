import { z } from "zod";
import { Prisma } from "@prisma/client";
import { isDemo } from "@/lib/prisma";

/**
 * Validação do corpo de POST/PATCH de jogador.
 * Todos os campos são opcionais (PATCH parcial; o POST checa `nome` e aplica os padrões).
 * Chaves desconhecidas são descartadas. Formulário manda "" em campo limpo → vira null.
 */

const POSICOES = ["GOL", "LD", "LE", "LAT", "ZAG", "VOL", "MC", "MEI", "PD", "PE", "PON", "ATA"] as const;

const blankToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

const text = (max: number) => z.preprocess(blankToNull, z.string().trim().max(max).nullable());

const num = (min: number, max: number, int = false) =>
  z.preprocess(
    (v) => {
      const b = blankToNull(v);
      return typeof b === "string" ? Number(b.replace(",", ".")) : b;
    },
    (int ? z.number().int() : z.number()).min(min).max(max).nullable(),
  );

const date = z.preprocess(blankToNull, z.coerce.date().nullable());

const HTTP = /^https?:\/\//i;
/** http(s) absoluto; `allowPath` aceita também caminho do próprio site ("/assets/..."). */
const url = (allowPath = false) =>
  z.preprocess(
    blankToNull,
    z
      .string()
      .trim()
      .max(500)
      .refine((v) => HTTP.test(v) || (allowPath && /^\/(?!\/)/.test(v)), "URL inválida")
      .nullable(),
  );

const MONEY = 1e12;

export const PlayerInput = z.object({
  nome: z.string().trim().max(120),
  cpf: text(20),
  idade: num(0, 60, true).transform((v) => v ?? 0),
  posicao: z.enum(POSICOES),
  peDominante: z.enum(["D", "E"]),
  valorMercado: num(0, MONEY).transform((v) => v ?? 0),
  altura: num(0, 2.5),
  situacao: text(60),
  contratoInicio: date,
  contratoFim: date,
  possePct: num(0, 100),
  representacao: text(120),
  numeroCamisa: num(0, 99, true),
  imagemUrl: url(true),

  anoNascimento: num(1900, 2100, true),
  cidade: text(120),
  nacionalidade: text(60),

  dataTransferencia: date,
  parceria: text(120),
  empresario: text(120),
  percPrimeiraOpcao: num(0, 100),
  valorPrimeiraOpcao: num(0, MONEY),
  prazoPrimeiraOpcao: num(0, 1200),
  percSegundaOpcao: num(0, 100),
  valorSegundaOpcao: num(0, MONEY),
  prazoSegundaOpcao: num(0, 1200),
  observacoes: text(5000),
  qtdTransfRef: num(0, 1e6),
  idadeTransfRef: num(0, 60),
  valorTransfRef: num(0, MONEY),
  direitosBase: num(0, MONEY),
  tempoAteIdadeVenda: num(0, 60),
  racionalProspecao: text(5000),
  valorProsp: num(0, MONEY),
  comissao: num(0, MONEY),

  instagramHandle: text(60),
  instagramPosts: z
    .array(z.object({ href: z.string().max(500).regex(HTTP), thumbUrl: z.string().max(500).regex(HTTP).nullish() }))
    .max(24)
    .nullable(),
  xUrl: url(),
  youtubeUrl: url(),
  videoUrl: url(),

  passaporte: z.object({ europeu: z.boolean(), pais: z.string().max(60).nullish() }).nullable(),
  selecao: z
    .object({
      convocado: z.boolean(),
      anos: z.array(z.number().int().min(1900).max(2100)).max(30).nullish(),
      categoria: z.string().max(60).nullish(),
    })
    .nullable(),
  statsPorTemporada: z
    .record(
      z.string().max(20),
      z.object({
        gols: z.number().min(0).max(1000).nullish(),
        assistencias: z.number().min(0).max(1000).nullish(),
        partidas: z.number().min(0).max(1000).nullish(),
      }),
    )
    .nullable(),

  clubeId: z.preprocess(blankToNull, z.string().max(64).nullable()),
}).partial();

/** Campo Json limpo: o Prisma real exige o sentinela DbNull; o mock da demo guarda null. */
export const jsonNull = (v: unknown) =>
  (v === null ? (isDemo ? null : Prisma.DbNull) : v) as Prisma.InputJsonValue | typeof Prisma.DbNull;

const JSON_FIELDS = ["passaporte", "selecao", "statsPorTemporada", "instagramPosts"] as const;

/**
 * Corpo validado → `data` do Prisma: só os campos enviados, CPF só com dígitos,
 * Json limpo com o sentinela certo. Devolve `error` se o CPF vier incompleto.
 */
export function toPlayerData(body: z.infer<typeof PlayerInput>) {
  const data: Record<string, unknown> = Object.fromEntries(
    Object.entries(body).filter(([, v]) => v !== undefined),
  );
  if (typeof body.cpf === "string") {
    const cpf = body.cpf.replace(/\D/g, "").slice(0, 11);
    if (cpf && cpf.length !== 11) return { error: "CPF inválido (precisa ter 11 dígitos)." } as const;
    data.cpf = cpf || null;
  }
  for (const k of JSON_FIELDS) if (k in data) data[k] = jsonNull(data[k]);
  return { data } as const;
}
