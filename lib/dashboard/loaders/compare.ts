import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { WidgetApiResponse, WidgetFilters } from "@/type/dashboard";

/* ============================================================
   BUCKETS DE COMPARAÇÃO
   - PON = PD + PE (+ PONTA)
   - LAT = LD + LE (+ LAT/LATERAL)
============================================================ */

type ComparePos = "GOL" | "ZAG" | "LAT" | "VOL" | "MC" | "MEI" | "PON" | "ATA";

const COMPARE_POSITIONS: ComparePos[] = [
  "GOL",
  "ZAG",
  "LAT",
  "VOL",
  "MC",
  "MEI",
  "PON",
  "ATA",
];

/* ============================================================
   HELPERS
============================================================ */

function ok(widgetId: string, payload: any, filters?: WidgetFilters): WidgetApiResponse {
  return {
    ok: true,
    widgetId: widgetId as any,
    generatedAt: new Date().toISOString(),
    ...(filters ? { filters } : {}),
    payload,
  };
}

function empty(widgetId: string, reason: string, hint?: string): WidgetApiResponse {
  return ok(widgetId, { kind: "empty", reason, ...(hint ? { hint } : {}) });
}

function toFiniteNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* ============================================================
   NORMALIZAÇÃO -> BUCKET (mesma regra para BASE e MERCADO)
   Códigos canônicos do projeto: GOL, LD, ZAG, LE, LAT, VOL, MC, MEI, PD, PE, ATA
   + aliases por extenso/inglês que aparecem em CSV de mercado.
============================================================ */

const POSITION_BUCKET: Record<string, ComparePos> = {
  // canônicos
  GOL: "GOL",
  ZAG: "ZAG",
  LAT: "LAT",
  LD: "LAT",
  LE: "LAT",
  VOL: "VOL",
  MC: "MC",
  MEI: "MEI",
  PD: "PON",
  PE: "PON",
  PON: "PON",
  ATA: "ATA",

  // por extenso (pt)
  GOLEIRO: "GOL",
  ZAGUEIRO: "ZAG",
  LATERAL: "LAT",
  "LATERAL DIREITO": "LAT",
  "LATERAL ESQUERDO": "LAT",
  VOLANTE: "VOL",
  "MEIO-CAMPO": "MC",
  "MEIO CAMPO": "MC",
  MEIA: "MEI",
  "MEIA ATACANTE": "MEI",
  "MEIA-ATACANTE": "MEI",
  PONTA: "PON",
  "PONTA DIREITA": "PON",
  "PONTA ESQUERDA": "PON",
  ATACANTE: "ATA",
  CENTROAVANTE: "ATA",

  // inglês
  GK: "GOL",
  CB: "ZAG",
  RB: "LAT",
  LB: "LAT",
  FB: "LAT",
  DM: "VOL",
  CDM: "VOL",
  CM: "MC",
  AM: "MEI",
  CAM: "MEI",
  RW: "PON",
  LW: "PON",
  ST: "ATA",
  CF: "ATA",
};

export function positionToBucket(v: unknown): ComparePos | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toUpperCase().replace(/\s+/g, " ");
  if (!s) return null;
  return POSITION_BUCKET[s] ?? null;
}

const basePosToBucket = positionToBucket;
const marketPosToBucket = positionToBucket;

/* ============================================================
   FILTROS
============================================================ */

function buildMarketWhere(filters?: WidgetFilters): Prisma.TransferenciaWhereInput {
  const p = filters?.period;
  return {
    ...(p?.from || p?.to
      ? {
          dataTransferencia: {
            ...(p?.from ? { gte: new Date(p.from) } : {}),
            ...(p?.to ? { lte: new Date(p.to) } : {}),
          },
        }
      : {}),
  };
}

function buildBaseWhere(filters?: WidgetFilters): Prisma.PlayerWhereInput {
  // aqui é seguro filtrar: Player.posicao é canônica no seu schema
  return {
    ...(filters?.position?.length ? { posicao: { in: filters.position } } : {}),
    ...(filters?.agency?.length ? { representacao: { in: filters.agency } } : {}),
    ...(filters?.situation?.length ? { situacao: { in: filters.situation } } : {}),
    ...(filters?.foot?.length ? { peDominante: { in: filters.foot } } : {}),
  };
}

/* ============================================================
   1) compare.position_share_base_vs_market
   - agora só existe PON e LAT (no lugar de PD/PE e LD/LE)
============================================================ */

export async function loadComparePositionShare(
  filters?: WidgetFilters,
): Promise<WidgetApiResponse> {
  const widgetId = "compare.position_share_base_vs_market";

  try {
    const [basePlayers, transfers] = await Promise.all([
      prisma.player.findMany({
        where: buildBaseWhere(filters),
        select: { id: true, posicao: true },
      }),
      prisma.transferencia.findMany({
        where: buildMarketWhere(filters),
        select: { id: true, atletaPosicao: true },
      }),
    ]);

    // init
    const baseCounts = new Map<ComparePos, number>();
    const baseIds = new Map<ComparePos, string[]>();
    const marketCounts = new Map<ComparePos, number>();

    for (const p of COMPARE_POSITIONS) {
      baseCounts.set(p, 0);
      baseIds.set(p, []);
      marketCounts.set(p, 0);
    }

    // Base -> buckets (LD/LE -> LAT, PD/PE -> PON)
    for (const pl of basePlayers) {
      const b = basePosToBucket(pl.posicao);
      if (!b) continue;
      baseCounts.set(b, (baseCounts.get(b) ?? 0) + 1);
      baseIds.get(b)!.push(pl.id);
    }

    // Mercado -> buckets (LATERAL -> LAT, PONTA -> PON)
    for (const t of transfers) {
      const b = marketPosToBucket(t.atletaPosicao);
      if (!b) continue;
      marketCounts.set(b, (marketCounts.get(b) ?? 0) + 1);
    }

    const totalS = Math.max(1, basePlayers.length);
    const totalM = Math.max(1, transfers.length);

    const data = COMPARE_POSITIONS.map((pos) => {
      const basePct = Number(((100 * (baseCounts.get(pos) ?? 0)) / totalS).toFixed(1));
      const marketPct = Number(((100 * (marketCounts.get(pos) ?? 0)) / totalM).toFixed(1));

      return {
        posicao: pos, // agora posicao é GOL/ZAG/LAT/.../PON/ATA
        basePct,
        marketPct,
        playerIds: baseIds.get(pos) ?? [],
      };
    }).sort((a, b) => Math.max(b.basePct, b.marketPct) - Math.max(a.basePct, a.marketPct));

    const anyNonZero = data.some((d) => d.basePct > 0 || d.marketPct > 0);
    if (!anyNonZero) {
      return empty(
        widgetId,
        "Dados insuficientes para comparar posições.",
        "Confira se Player.posicao (Base) e Transferencia.atletaPosicao (Mercado) estão preenchidos.",
      );
    }

    return ok(widgetId, { kind: "bar", data }, filters);
  } catch (err) {
    console.error("loadComparePositionShare error", err);
    return { ok: false, widgetId: widgetId as any, error: "Erro no comparativo de posições." };
  }
}

/* ============================================================
   2) compare.avg_age_by_position
   - idem: PON e LAT colapsados
============================================================ */

export async function loadCompareAvgAgeByPosition(
  filters?: WidgetFilters,
): Promise<WidgetApiResponse> {
  const widgetId = "compare.avg_age_by_position";

  try {
    const [base, transfers] = await Promise.all([
      prisma.player.findMany({
        where: buildBaseWhere(filters),
        select: { id: true, posicao: true, idade: true },
      }),
      prisma.transferencia.findMany({
        where: buildMarketWhere(filters),
        select: { atletaPosicao: true, atletaIdade: true },
      }),
    ]);

    const sMap = new Map<ComparePos, { sum: number; n: number; ids: string[] }>();
    const mMap = new Map<ComparePos, { sum: number; n: number }>();

    for (const p of COMPARE_POSITIONS) {
      sMap.set(p, { sum: 0, n: 0, ids: [] });
      mMap.set(p, { sum: 0, n: 0 });
    }

    // Base
    for (const pl of base) {
      const b = basePosToBucket(pl.posicao);
      const idade = toFiniteNumber(pl.idade);
      if (!b || idade === null) continue;

      const bucket = sMap.get(b)!;
      bucket.sum += idade;
      bucket.n += 1;
      bucket.ids.push(pl.id);
    }

    // Mercado
    for (const t of transfers) {
      const b = marketPosToBucket(t.atletaPosicao);
      const idade = toFiniteNumber(t.atletaIdade);
      if (!b || idade === null) continue;

      const bucket = mMap.get(b)!;
      bucket.sum += idade;
      bucket.n += 1;
    }

    let data = COMPARE_POSITIONS.map((pos) => {
      const s = sMap.get(pos)!;
      const m = mMap.get(pos)!;

      const baseAge = s.n > 0 ? Number((s.sum / s.n).toFixed(1)) : null;
      const marketAge = m.n > 0 ? Number((m.sum / m.n).toFixed(1)) : null;

      return {
        posicao: pos,
        baseAge,
        marketAge,
        playerIds: s.ids,
      };
    }).filter((d) => d.baseAge !== null || d.marketAge !== null);

    if (!data.length) {
      return empty(
        widgetId,
        "Dados insuficientes para comparar idade média por posição.",
        "Confira se Player.idade (Base) e Transferencia.atletaIdade (Mercado) estão preenchidos.",
      );
    }

    data = data.sort(
      (a, b) =>
        Math.max(b.baseAge ?? 0, b.marketAge ?? 0) -
        Math.max(a.baseAge ?? 0, a.marketAge ?? 0),
    );

    return ok(widgetId, { kind: "bar", data }, filters);
  } catch (err) {
    console.error("loadCompareAvgAgeByPosition error", err);
    return { ok: false, widgetId: widgetId as any, error: "Erro no comparativo de idade." };
  }
}

/* ============================================================
   DISPATCHER
============================================================ */

export async function loadCompareWidget(
  widgetId: string,
  filters?: WidgetFilters,
): Promise<WidgetApiResponse> {
  switch (widgetId) {
    case "compare.position_share_base_vs_market":
      return loadComparePositionShare(filters);

    case "compare.avg_age_by_position":
      return loadCompareAvgAgeByPosition(filters);

    default:
      return empty(widgetId, "Widget comparativo não implementado.");
  }
}
