import { NextResponse } from "next/server";
import Papa from "papaparse";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authHelper";
import { parseMoney } from "@/lib/parseMoney";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // ~5 MB
const MAX_ROWS = 20_000;
const MAX_ERRORS_RETURNED = 100;

const REQUIRED_HEADERS = [
  "atletaNome",
  "clubeOrigem",
  "clubeDestino",
  "dataTransferencia",
  "valor",
  "moeda",
] as const;

type ImportFail = { ok: false; errors: string[] };

function fail(status: number, errors: string[]) {
  return NextResponse.json({ ok: false, errors } satisfies ImportFail, { status });
}

function normalizeHeader(h: string) {
  return h.trim();
}

function hasAllRequiredHeaders(headers: string[]) {
  const set = new Set(headers.map(normalizeHeader));
  return REQUIRED_HEADERS.every((h) => set.has(h));
}

/** YYYY-MM-DD ou DD/MM/YYYY, validando o dia de verdade (31/02 é erro). */
function parseDateStrict(v: string): Date {
  const s = (v ?? "").trim();
  if (!s) throw new Error("dataTransferencia vazia");

  let y: number, m: number, d: number;
  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (match) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else {
    match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
    if (!match) throw new Error("dataTransferencia deve ser YYYY-MM-DD ou DD/MM/YYYY");
    [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  }

  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    throw new Error("dataTransferencia inválida");
  }
  if (date.getTime() > Date.now()) throw new Error("dataTransferencia no futuro");
  return date;
}

function normalizeText(v: unknown) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

//  DEDUPE KEY (SEM DATA)
function makeDedupeKey(t: {
  atletaNome: string;
  atletaIdade: number | null;
  atletaPosicao: string | null;
  clubeOrigem: string | null;
  clubeFormador: string | null;
  clubeDestino: string | null;
  valor: number;
  moeda: string | null;
}) {
  const atleta = normalizeText(t.atletaNome);
  const idade = t.atletaIdade == null ? "" : String(t.atletaIdade);
  const pos = normalizeText(t.atletaPosicao);
  const orig = normalizeText(t.clubeOrigem);
  const form = normalizeText(t.clubeFormador);
  const dest = normalizeText(t.clubeDestino);
  const val = t.valor.toFixed(2);
  const moeda = normalizeText(t.moeda ?? "eur") || "eur";

  const raw = `atleta=${atleta}|idade=${idade}|pos=${pos}|orig=${orig}|form=${form}|dest=${dest}|valor=${val}|moeda=${moeda}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function toNullableString(v: unknown) {
  const s = String(v ?? "").trim();
  return s || null;
}

function toNullableInt(v: unknown) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

type TransferRow = {
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
  dataTransferencia: Date;
  valor: number;
  moeda: string;
  fonte: string | null;
  dedupeKey: string;
};

/** Valida uma linha; devolve a linha pronta ou a lista de problemas dela. */
function parseRow(r: Record<string, string>): { row: TransferRow } | { problems: string[] } {
  const problems: string[] = [];

  const atletaNome = String(r.atletaNome ?? "").trim();
  const clubeOrigem = toNullableString(r.clubeOrigem);
  const clubeDestino = toNullableString(r.clubeDestino);
  const moeda = (toNullableString(r.moeda) ?? "EUR").toUpperCase();
  const valorRaw = String(r.valor ?? "").trim();

  if (!atletaNome) problems.push("atletaNome vazio");
  if (!clubeOrigem) problems.push("clubeOrigem vazio");
  if (!clubeDestino) problems.push("clubeDestino vazio");

  let dataTransferencia: Date | null = null;
  try {
    dataTransferencia = parseDateStrict(String(r.dataTransferencia ?? ""));
  } catch (e) {
    problems.push((e as Error).message);
  }

  let valor: number | null = null;
  if (!valorRaw) problems.push("valor vazio");
  else {
    valor = parseMoney(valorRaw);
    if (valor === null) problems.push(`valor inválido ("${valorRaw.slice(0, 30)}")`);
    else if (valor < 0) problems.push("valor negativo");
  }

  if (problems.length || !dataTransferencia || valor === null) return { problems };

  const atletaIdade = toNullableInt(r.atletaIdade);
  const atletaPosicao = toNullableString(r.atletaPosicao);
  const clubeFormador = toNullableString(r.clubeFormador);

  return {
    row: {
      atletaNome,
      atletaIdade,
      atletaPosicao,
      clubeFormador,
      cidadeClubeFormador: toNullableString(r.cidadeClubeFormador),
      paisClubeFormador: toNullableString(r.paisClubeFormador),
      clubeOrigem,
      clubeDestino,
      cidadeClubeDestino: toNullableString(r.cidadeClubeDestino),
      paisClubeDestino: toNullableString(r.paisClubeDestino),
      dataTransferencia,
      valor,
      moeda,
      fonte: toNullableString(r.fonte),
      dedupeKey: makeDedupeKey({
        atletaNome,
        atletaIdade,
        atletaPosicao,
        clubeOrigem,
        clubeFormador,
        clubeDestino,
        valor,
        moeda,
      }),
    },
  };
}

/**
 * POST /api/transferencias/import (ADMIN)
 * - CSV até ~5 MB, separador vírgula ou ponto-e-vírgula.
 * - Linha inválida não derruba o lote: entra em `errors` ("Linha N: ...") e as válidas são gravadas.
 * - Resposta (compatível com o front): { ok, parsed, inserted, skippedDuplicates, invalid, errors }.
 */
export async function POST(req: Request) {
  const auth = await requireUser(req, { role: "ADMIN" });
  if (auth instanceof NextResponse) return auth;

  try {
    const declared = Number(req.headers.get("content-length") ?? "0");
    if (Number.isFinite(declared) && declared > MAX_FILE_BYTES + 64 * 1024) {
      return fail(413, ["Arquivo muito grande (máximo ~5 MB)."]);
    }

    const form = await req.formData().catch(() => null);
    const file = form?.get("file");

    if (!(file instanceof File)) {
      return fail(400, ["Arquivo não enviado (field 'file')."]);
    }
    if (file.size > MAX_FILE_BYTES) {
      return fail(413, ["Arquivo muito grande (máximo ~5 MB)."]);
    }

    const csv = (await file.text()).replace(/^﻿/, "");

    const parsed = Papa.parse<Record<string, string>>(csv, {
      header: true,
      skipEmptyLines: true,
      delimiter: "",
      transformHeader: (h) => normalizeHeader(h.replace(/^"|"$/g, "")),
    });

    const headers = (parsed.meta.fields ?? []).map(normalizeHeader);

    if (!hasAllRequiredHeaders(headers)) {
      return fail(400, [
        "CSV inválido: faltando colunas obrigatórias.",
        `Obrigatórias: ${REQUIRED_HEADERS.join(", ")}`,
        `Recebido: ${headers.join(", ").slice(0, 300) || "(vazio)"}`,
      ]);
    }

    const rows = parsed.data;
    if (rows.length > MAX_ROWS) {
      return fail(413, [`Máximo de ${MAX_ROWS} linhas por importação.`]);
    }

    // Erros de estrutura do Papa viram erro da linha correspondente (não do lote).
    const lineErrors = new Map<number, string[]>();
    for (const e of parsed.errors ?? []) {
      if (typeof e.row !== "number") continue;
      const list = lineErrors.get(e.row) ?? [];
      list.push(e.message);
      lineErrors.set(e.row, list);
    }

    const errors: string[] = [];
    const valid: TransferRow[] = [];

    rows.forEach((r, idx) => {
      const line = idx + 2; // +1 cabeçalho, +1 base 1
      const structural = lineErrors.get(idx);
      if (structural?.length) {
        errors.push(`Linha ${line}: ${structural.join("; ")}`);
        return;
      }
      const res = parseRow(r);
      if ("problems" in res) errors.push(`Linha ${line}: ${res.problems.join("; ")}`);
      else valid.push(res.row);
    });

    if (!valid.length) {
      return fail(400, errors.length ? errors.slice(0, MAX_ERRORS_RETURNED) : ["CSV sem linhas de dados."]);
    }

    const res = await prisma.transferencia.createMany({
      data: valid,
      skipDuplicates: true,
    });

    const inserted = res.count ?? 0;

    return NextResponse.json({
      ok: true,
      parsed: rows.length,
      inserted,
      skippedDuplicates: Math.max(0, valid.length - inserted),
      invalid: errors.length,
      errors: errors.slice(0, MAX_ERRORS_RETURNED),
    });
  } catch (err) {
    console.error("[api] POST /api/transferencias/import:", err);
    return fail(500, ["Erro interno ao importar o CSV."]);
  }
}
