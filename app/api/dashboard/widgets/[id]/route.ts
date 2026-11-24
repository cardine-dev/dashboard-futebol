import { NextRequest, NextResponse } from "next/server";

import { loadBaseWidget } from "@/lib/dashboard/loaders/base";
import { loadMarketWidget } from "@/lib/dashboard/loaders/market";
import { loadOverviewWidget } from "@/lib/dashboard/loaders/overview";
import { loadCompareWidget } from "@/lib/dashboard/loaders/compare";
import { requireUser } from "@/lib/authHelper";

import type {
  WidgetApiResponse,
  WidgetFilters,
  WidgetId,
  WidgetScope,
  PeriodFilter,
} from "@/type/dashboard";

export const dynamic = "force-dynamic";

const SCOPES: readonly WidgetScope[] = ["both", "base", "market"];

/* -----------------------------
 * Query parsing
 * ----------------------------- */
function parseList(sp: URLSearchParams, key: string): string[] | undefined {
  const raw = sp.get(key);
  if (!raw) return undefined;

  const arr = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return arr.length ? arr : undefined;
}

function readPeriod(sp: URLSearchParams): PeriodFilter | undefined {
  const from =
    sp.get("from") ??
    sp.get("periodFrom") ??
    sp.get("period.from") ??
    undefined;

  const to =
    sp.get("to") ?? sp.get("periodTo") ?? sp.get("period.to") ?? undefined;

  const out: PeriodFilter = {};
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) out.from = from;
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) out.to = to;

  return out.from || out.to ? out : undefined;
}

function readFilters(req: NextRequest): WidgetFilters | undefined {
  const sp = req.nextUrl.searchParams;

  const period = readPeriod(sp);

  // shared / base
  const position = parseList(sp, "position");
  const agency = parseList(sp, "agency");
  const situation = parseList(sp, "situation");
  const foot = parseList(sp, "foot");

  // market
  const club = parseList(sp, "club");
  const country = parseList(sp, "country");
  const league = parseList(sp, "league");

  const hasAny =
    !!period ||
    !!position?.length ||
    !!agency?.length ||
    !!situation?.length ||
    !!foot?.length ||
    !!club?.length ||
    !!country?.length ||
    !!league?.length;

  if (!hasAny) return undefined;

  return {
    ...(period ? { period } : {}),
    ...(position ? { position } : {}),
    ...(agency ? { agency } : {}),
    ...(situation ? { situation } : {}),
    ...(foot ? { foot } : {}),
    ...(club ? { club } : {}),
    ...(country ? { country } : {}),
    ...(league ? { league } : {}),
  };
}

/* -----------------------------
 * Helpers
 * ----------------------------- */
function empty(
  widgetId: string,
  reason: string,
  hint?: string,
): WidgetApiResponse {
  return {
    ok: true,
    widgetId: widgetId as WidgetId,
    generatedAt: new Date().toISOString(),
    payload: { kind: "empty", reason, ...(hint ? { hint } : {}) },
  };
}

function getOrigin(req: NextRequest) {
  return req.nextUrl.origin;
}

function fail(widgetId: string, error: string, status: number) {
  const body: WidgetApiResponse = { ok: false, widgetId: widgetId as WidgetId, error };
  return NextResponse.json(body, { status });
}

/** Loader devolveu { ok:false } → mesmo corpo, mas com status 500 (antes era 200). */
function respond(res: WidgetApiResponse) {
  return NextResponse.json(res, { status: res.ok ? 200 : 500 });
}

/* -----------------------------
 * Route
 * ----------------------------- */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id?: string }> },
) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  let widgetIdStr = "unknown";

  try {
    // Next pode entregar params como Promise
    const unwrapped = await params;
    const id = unwrapped?.id;

    if (!id || typeof id !== "string") {
      return fail("unknown", "Parâmetro de widget ausente ou inválido.", 400);
    }

    widgetIdStr = id;
    const widgetId = id as WidgetId;

    const rawScope = req.nextUrl.searchParams.get("scope") ?? "both";
    if (!SCOPES.includes(rawScope as WidgetScope)) {
      return fail(widgetId, "Parâmetro scope inválido (use both, base ou market).", 400);
    }
    const scope = rawScope as WidgetScope;
    const filters = readFilters(req);
    const origin = getOrigin(req);

    // -------------------------
    // OVERVIEW
    // -------------------------
    if (widgetId.startsWith("overview.")) {
      return respond(await loadOverviewWidget(widgetId, filters, scope, origin));
    }

    // -------------------------
    // BASE (inclui kpi.base.*)
    // -------------------------
    if (
      widgetId.startsWith("base.") ||
      widgetId.startsWith("kpi.base.")
    ) {
      return respond(await loadBaseWidget(widgetId, filters));
    }

    // -------------------------
    // MARKET (inclui kpi.market.*)
    // -------------------------
    if (widgetId.startsWith("market.") || widgetId.startsWith("kpi.market.")) {
      if (scope === "base") {
        return NextResponse.json(
          empty(widgetId, "Widget não aplicável ao escopo do elenco."),
          { status: 200 },
        );
      }

      return respond(await loadMarketWidget(widgetId, filters));
    }

    // -------------------------
    // COMPARE
    // -------------------------
    if (widgetId.startsWith("compare.")) {
      return respond(await loadCompareWidget(widgetId, filters));
    }

    // -------------------------
    // FALLBACK
    // -------------------------
    return fail(widgetId, "Widget não reconhecido.", 404);
  } catch (err) {
    console.error("Dashboard widget route error", err);
    return fail(widgetIdStr, "Erro interno ao carregar widget.", 500);
  }
}
