export type WidgetScope = "base" | "market" | "both";
export type DashboardView = "base" | "market" | "both" | "compare";

export type WidgetGroup =
  | "base"
  | "market"
  | "overview"  
  | "compare";


export type WidgetId =
  // Map
  | "overview.geo_map"
  // OVERVIEW KPIs (se você quiser tratar KPI como widget também)
  | "kpi.base.players_count"
  | "kpi.base.total_market_value"
  | "kpi.base.avg_age"
  | "kpi.market.deals_count"
  | "kpi.market.total_fee"
  | "kpi.market.avg_fee"
  // BASE
  | "base.age_distribution"
  | "base.position_distribution"
  | "base.market_value_top_players"
  | "base.age_vs_value_scatter"
  | "base.representation_ranking"
  | "base.rights_distribution"
  | "base.age_by_position"
  // MARKET
  | "market.deals_by_month"
  | "market.fee_by_month"
  | "market.fee_distribution"
  | "market.top_buyers_sellers"
  | "market.top_leagues_countries"
  | "market.age_vs_fee_scatter"
  | "market.position_avg_fee"
  // COMPARE
  | "compare.position_share_base_vs_market"
  | "compare.avg_age_by_position";

export type WidgetSize = "sm" | "md" | "lg";

export type WidgetFiltersSupported =
  | "period"
  | "position"
  | "club"
  | "agency"
  | "country"
  | "league"
  | "situation"
  | "foot";

export type PeriodFilter = {
  from?: string; // ISO date yyyy-mm-dd
  to?: string; // ISO date yyyy-mm-dd
};

export type WidgetFilters = {
  period?: PeriodFilter;

  // Base
  position?: string[]; // multi-select
  agency?: string[]; // representacao
  situation?: string[]; // situacao
  foot?: Array<"D" | "E" | "A" | string>; // peDominante (flexível)

  // Market
  club?: string[]; // from/to club (depende do widget)
  country?: string[];
  league?: string[];
};

export type WidgetDefinition = {
  id: WidgetId;
  title: string;
  description?: string;
  group: WidgetGroup;
  scope: WidgetScope;

  defaultEnabled: boolean;
  defaultSize: WidgetSize;

  // ajuda o picker (chips/filtros)
  filtersSupported?: WidgetFiltersSupported[];

  // opcional: tags extras pro search
  keywords?: string[];
};

export type DashboardLayout = {
  version: number;
  view: DashboardView;

  enabled: WidgetId[];
  order: WidgetId[];

  sizes?: Partial<Record<WidgetId, WidgetSize>>;
};

// ---------- Data payloads (API -> UI) ----------

export type KpiDatum = {
  label: string;
  value: number | null;
  unit?: string; // "R$" etc
  sub?: string; // ex: "+3.2% vs mês anterior"
};

export type BarDatum = Record<string, string | number | null>;
export type LineDatum = Record<string, string | number | null>;
export type ScatterDatum = Record<string, string | number | null>;
export type HistogramDatum = { bucket: string; count: number };

// Geo Map
export type PlayerMini = {
  id: string;
  nome: string;
  posicao: string | null;
  imagemUrl: string | null;
  clube: { id: string; nome: string; logoUrl: string | null } | null;
};

export type BarToggleOption = {
  id: string;
  label: string;
  data: BarDatum[];
};

export type GeoMapData = {
  counts: {
    byCountry: Record<string, number>;
    byStateBR: Record<string, number>;
    missing: number;
  };
  players: {
    byCountry: Record<string, PlayerMini[]>;
    byStateBR: Record<string, PlayerMini[]>;
  };
};

export type WidgetDataResponse =
  | { kind: "kpi"; data: KpiDatum }
  | { kind: "bar"; data: BarDatum[] }
  | { kind: "line"; data: LineDatum[] }
  | { kind: "scatter"; data: ScatterDatum[] }
  | { kind: "hist"; data: HistogramDatum[] }
  | { kind: "geo_map"; data: GeoMapData }
  | { kind: "bar_toggle"; options: BarToggleOption[]; defaultId?: string }
  | { kind: "empty"; reason: string; hint?: string };

export type WidgetApiSuccess = {
  ok: true;
  widgetId: WidgetId;
  generatedAt: string; // ISO
  filters?: WidgetFilters;
  payload: WidgetDataResponse;
};

export type WidgetApiError = {
  ok: false;
  widgetId?: WidgetId;
  error: string;
};

export type WidgetApiResponse = WidgetApiSuccess | WidgetApiError;

// KPIs batch
export type KpisApiSuccess = {
  ok: true;
  generatedAt: string; // ISO
  scope: WidgetScope;
  filters?: WidgetFilters;
  kpis: Record<string, KpiDatum>; // chave livre (ex: "base.players_count")
};

export type KpisApiResponse = KpisApiSuccess | { ok: false; error: string };

