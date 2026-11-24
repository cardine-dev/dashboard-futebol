// app/api/dashboard/kpis/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { KpisApiResponse, WidgetScope, KpiDatum } from "@/type/dashboard";
import { requireUser } from "@/lib/authHelper";
import { taggedSql } from "@/lib/dashboard/sqlTag";

export const dynamic = "force-dynamic";

type Scope = WidgetScope;
const SCOPES: readonly Scope[] = ["both", "base", "market"];

const BASE_MARKET_VALUE_SCALE = 1_000_000; // valorMercado vem em milhões de EUR

function toNumber(v: any): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function kpi(label: string, value: number | null, unit?: string): KpiDatum {
  return { label, value, unit };
}

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const rawScope = req.nextUrl.searchParams.get("scope") ?? "both";
  if (!SCOPES.includes(rawScope as Scope)) {
    return NextResponse.json(
      { ok: false, error: "Parâmetro scope inválido (use both, base ou market)." } satisfies KpisApiResponse,
      { status: 400 },
    );
  }
  const scope = rawScope as Scope;

  try {

    const baseEnabled = scope !== "market";
    const marketEnabled = scope !== "base";

    // MARKET
    const marketCountPromise = marketEnabled
      ? prisma.transferencia.count({
          where: { dataTransferencia: { not: null } },
        })
      : Promise.resolve(null);

    const marketAggPromise = marketEnabled
      ? prisma.transferencia.aggregate({
          where: {
            dataTransferencia: { not: null },
            valor: { not: null },
          },
          _sum: { valor: true },
          _avg: { valor: true },
        })
      : Promise.resolve(null);

    // deals_per_month = deals / meses distintos com dados
    const marketDealsPerMonthPromise = marketEnabled
      ? prisma.$queryRaw<{ deals: number; months: number }[]>(
          taggedSql("kpi.market_deals_per_month", Prisma.sql`
            SELECT
              COUNT(*)::int AS deals,
              COUNT(DISTINCT DATE_TRUNC('month', "dataTransferencia"))::int AS months
            FROM "Transferencia"
            WHERE "dataTransferencia" IS NOT NULL
          `),
        )
      : Promise.resolve(null);

    // BASE
    const playersCountPromise = baseEnabled
      ? prisma.player.count()
      : Promise.resolve(null);

    const playersTotalValuePromise = baseEnabled
      ? prisma.player.aggregate({ _sum: { valorMercado: true } })
      : Promise.resolve(null);

    const playersAvgAgePromise = baseEnabled
      ? prisma.player.aggregate({ _avg: { idade: true } })
      : Promise.resolve(null);

    // Valor atribuído ao clube (ponderado por possePct)
    // SUM(valorMercado(milhões)->EUR * possePct/100)
    const baseWeightedValuePromise = baseEnabled
      ? prisma.$queryRaw<{ weighted: number | null }[]>(
          taggedSql("kpi.base_weighted_value", Prisma.sql`
            SELECT
              SUM(
                ("valorMercado"::float8 * ${BASE_MARKET_VALUE_SCALE}::float8) * ("possePct"::float8 / 100.0)
              )::float8 AS weighted
            FROM "Player"
            WHERE "valorMercado" IS NOT NULL
              AND "possePct" IS NOT NULL
          `),
        )
      : Promise.resolve(null);

    const [
      marketCount,
      marketAgg,
      marketDealsPerMonthRows,
      playersCount,
      playersTotalValue,
      playersAvgAge,
      baseWeightedRows,
    ] = await Promise.all([
      marketCountPromise,
      marketAggPromise,
      marketDealsPerMonthPromise,
      playersCountPromise,
      playersTotalValuePromise,
      playersAvgAgePromise,
      baseWeightedValuePromise,
    ]);

    // MARKET (valores em EUR absoluto)
    const marketTotalFee = toNumber((marketAgg as any)?._sum?.valor) ?? 0;
    const marketAvgFee = toNumber((marketAgg as any)?._avg?.valor) ?? 0;

    // deals/mês (1 casa decimal)
    const dealsPerMonthRow = Array.isArray(marketDealsPerMonthRows)
      ? marketDealsPerMonthRows[0]
      : null;

    const deals = toNumber((dealsPerMonthRow as any)?.deals) ?? 0;
    const months = toNumber((dealsPerMonthRow as any)?.months) ?? 0;
    const dealsPerMonth =
      months > 0 ? Math.round(((deals / months) * 10)) / 10 : 0;

    // BASE
    const basePlayersCount = toNumber(playersCount);

    const baseTotalMarketValueRaw = toNumber(
      (playersTotalValue as any)?._sum?.valorMercado,
    );

    const baseTotalMarketValueEur =
      baseTotalMarketValueRaw === null
        ? null
        : baseTotalMarketValueRaw * BASE_MARKET_VALUE_SCALE;

    const baseAvgAge = toNumber((playersAvgAge as any)?._avg?.idade);

    const baseWeightedRow = Array.isArray(baseWeightedRows)
      ? baseWeightedRows[0]
      : null;

    const baseWeightedValue = toNumber((baseWeightedRow as any)?.weighted);

    const kpis: Record<string, KpiDatum> = {
      // Base
      "base.players_count": kpi(
        "Jogadores do elenco",
        baseEnabled ? (basePlayersCount ?? 0) : null,
      ),

      "base.total_market_value": kpi(
        "Valor de mercado total",
        baseEnabled ? (baseTotalMarketValueEur ?? 0) : null,
        "EUR",
      ),

      "base.avg_age": kpi(
        "Idade média",
        baseEnabled ? (baseAvgAge ?? 0) : null,
      ),

      "base.total_market_value_weighted": kpi(
        "Valor atribuído ao clube",
        baseEnabled ? (baseWeightedValue ?? 0) : null,
        "EUR",
      ),

      // Market
      "market.deals_count": kpi(
        "Transações no mercado",
        marketEnabled ? (toNumber(marketCount) ?? 0) : null,
      ),

      "market.total_fee": kpi(
        "Volume financeiro do mercado",
        marketEnabled ? marketTotalFee : null,
        "EUR",
      ),

      "market.avg_fee": kpi(
        "Ticket médio",
        marketEnabled ? marketAvgFee : null,
        "EUR",
      ),

      "market.deals_per_month": kpi(
        "Transações/mês",
        marketEnabled ? dealsPerMonth : null,
        "deals/mês",
      ),
    };

    const res: KpisApiResponse = {
      ok: true,
      generatedAt: new Date().toISOString(),
      scope,
      kpis,
    };

    return NextResponse.json(res, { status: 200 });
  } catch (err) {
    console.error("KPIs route error", err);
    // corpo mantém o formato { ok:false, error } que o DashboardClient já entende
    return NextResponse.json(
      { ok: false, error: "Erro interno ao carregar KPIs." } satisfies KpisApiResponse,
      { status: 500 },
    );
  }
}
