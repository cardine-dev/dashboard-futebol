"use client";

import type { WidgetDataResponse, WidgetSize } from "@/type/dashboard";
import GeoMapWidget from "./GeoMapWidget";

import {
  BarChart,
  Bar,
  Cell,
  LabelList,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/contexts/I18nContext";

import { formatCurrency, formatMoneyAxis, formatNumber } from "@/lib/dashboard/format";
import { usePlayersDrilldown } from "@/components/PlayersDrilldownProvider";
import { SETORES, SETOR_COR, setorDe, INK_SERIE, GRID, AXIS_TEXT } from "@/lib/ui/sector";
import { eurCompact, intlLocale } from "@/lib/ui/format";

/** Série do clube = acento do clube; mercado = cinza neutro. */
const BASE_COLOR = "var(--accent)";
const MARKET_COLOR = "#a7b0ab";

/* ==============================
   Types
============================== */
type Props = {
  payload: WidgetDataResponse;
  size?: WidgetSize;
};

/* ==============================
   Public
============================== */
export function WidgetRenderer({ payload, size = "md" }: Props) {
  switch (payload.kind) {
    case "geo_map":
      return <GeoMapWidget data={payload.data} size={size} />;

    case "bar":
      return <BarWidget data={payload.data} size={size} />;

    case "line":
      return <LineWidget data={payload.data} size={size} />;

    case "scatter":
      return <ScatterWidget data={payload.data} size={size} />;

    case "kpi":
      return <KpiWidget data={payload.data} />;

    case "hist":
      return <BarWidget data={payload.data as any} size={size} />;

    case "bar_toggle":
      return (
        <BarToggleWidget
          options={payload.options}
          defaultId={payload.defaultId}
          size={size}
        />
      );

    case "empty":
    default:
      return null;
  }
}

/* ==============================
   Helpers (format/labels)
============================== */

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

function shouldTreatAsPercent(key: string) {
  const k = key.toLowerCase();
  return k.includes("pct") || k.includes("percent") || k.endsWith("pct");
}

function shouldTreatAsMoney(key: string) {
  const k = key.toLowerCase();
  // sinais fortes de dinheiro
  const moneySignals = ["valor", "value", "fee", "cost", "ticket", "revenue", "volume"];
  return moneySignals.some((s) => k.includes(s));
}

function formatByKey(value: any, key: string) {
  if (!isFiniteNumber(value)) return "—";
  if (shouldTreatAsPercent(key)) return `${value.toFixed(1)}%`;
  if (shouldTreatAsMoney(key)) return formatCurrency(value, "EUR");
  return formatNumber(value);
}

function axisTickByKey(value: any, key: string) {
  if (!isFiniteNumber(value)) return "—";
  if (shouldTreatAsPercent(key)) return `${value.toFixed(0)}%`;
  if (shouldTreatAsMoney(key)) return formatMoneyAxis(value, "EUR");
  return formatNumber(value);
}

function titleCasePt(s: string) {
  const lower = s.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function makePrettifyKey(t: any) {
  return function prettifyKey(raw: string) {
    if (!raw) return "—";
    const key = String(raw);
    const cl = t?.chartLabels;

    const direct: Record<string, string> = {
      jogadores: cl?.jogadores ?? "Jogadores",
      jogador: cl?.jogador ?? "Jogador",
      clube: cl?.clube ?? "Clube",
      agencia: cl?.agencia ?? "Agência",
      pais: cl?.pais ?? "País",
      liga: cl?.liga ?? "Liga",
      uf: cl?.uf ?? "UF",
      estado: cl?.estado ?? "Estado",
      faixa: cl?.faixa ?? "Faixa",
      bucket: cl?.faixa ?? "Faixa",
      valor: cl?.valor ?? "Valor",
      fee: cl?.valor ?? "Valor",
      totalFee: cl?.volumeEur ?? "Volume (€)",
      total_fee: cl?.volumeEur ?? "Volume (€)",
      avgFee: cl?.valorMedio ?? "Valor médio",
      avg_fee: cl?.valorMedio ?? "Valor médio",
      revenue: cl?.receita ?? "Receita",
      cost: cl?.custo ?? "Custo",
      volume: cl?.volume ?? "Volume",
      basePct: cl?.basePct ?? "Posse (%)",
      marketPct: cl?.mercadoPct ?? "Mercado (%)",
      baseAge: cl?.idadeMediaBase ?? "Idade média (elenco)",
      marketAge: cl?.idadeMediaMercado ?? "Idade média (Mercado)",
      base: cl?.base ?? "Base",
      market: cl?.mercado ?? "Mercado",
      deals: cl?.transacoes ?? "Transações",
      period: cl?.periodo ?? "Período",
      compradores: cl?.compradores ?? "Compradores",
      vendedores: cl?.vendedores ?? "Vendedores",
      idade: cl?.idade ?? "Idade",
      age: cl?.idade ?? "Idade",
    };

    if (direct[key]) return direct[key];

    const spaced = key
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .trim();

    const tokens: Record<string, string> = {
      avg: cl?.medio ?? "médio",
      total: cl?.total ?? "total",
      count: cl?.quantidade ?? "quantidade",
      pct: "%",
    };

    const words = spaced.split(/\s+/).map((w) => {
      const wl = w.toLowerCase();
      if (tokens[wl]) return tokens[wl];
      return w;
    });

    return titleCasePt(words.join(" "));
  };
}

function makePrettifyPosicao(t: any) {
  return function prettifyPosicao(code: any) {
    const c = String(code ?? "").trim().toUpperCase();
    const cp = t?.chartPositions;
    const map: Record<string, string> = {
      GOL: cp?.GOL ?? "Goleiros",
      ZAG: cp?.ZAG ?? "Zagueiros",
      LD: cp?.LD ?? "Lateral direito",
      LE: cp?.LE ?? "Lateral esquerdo",
      LAT: cp?.LAT ?? "Laterais",
      VOL: cp?.VOL ?? "Volantes",
      MC: cp?.MC ?? "Meio-campistas",
      MEI: cp?.MEI ?? "Meias",
      PD: cp?.PD ?? "Ponta direita",
      PE: cp?.PE ?? "Ponta esquerda",
      PON: cp?.PON ?? "Pontas",
      ATA: cp?.ATA ?? "Atacantes",
    };
    return map[c] ?? (c || "—");
  };
}

// Module-level defaults for non-component contexts
const prettifyKey = makePrettifyKey(null);

function makePrettifyXValue(t: any) {
  const lPrettifyPosicao = makePrettifyPosicao(t);
  const semAgencia = t?.chartLabels?.semAgencia ?? "Sem agência";

  return function prettifyXValue(labelKey: string, v: any) {
    if (v == null) return "—";

    const lk = String(labelKey).toLowerCase();

    if (lk === "posicao") return lPrettifyPosicao(v);

    // period "YYYY-MM" -> "YYYY"
    if (lk === "period" && typeof v === "string" && /^\d{4}-\d{2}$/.test(v)) {
      return v.slice(0, 4);
    }

    const s = String(v);
    if (s === "Sem agência") return semAgencia;
    return s;
  };
}

// Module-level fallback for non-component contexts
const prettifyXValue = makePrettifyXValue(null);

function buildTitleFromPoint(
  labelKey: string,
  point: any,
  fallbackLabel: string,
  customPrettifyKey?: (k: string) => string,
  customPrettifyXValue?: (k: string, v: any) => string,
) {
  const prettyKey = (customPrettifyKey ?? prettifyKey)(labelKey);
  const label = (customPrettifyXValue ?? prettifyXValue)(labelKey, point?.[labelKey]);
  if (!label || label === "—") return fallbackLabel;
  return `${prettyKey}: ${label}`;
}

/* ==============================
   Helpers (data inspection)
============================== */

const pickLabelKey = (sample: Record<string, any>) => {
  const preferred = [
    "period",
    "faixa",
    "jogador",
    "posicao",
    "clube",
    "agencia",
    "label",
    "tipo",
    "pais",
    "liga",
    "bucket",
    "uf",
    "estado",
  ];
  for (const k of preferred) {
    if (k in sample && typeof sample[k] !== "number") return k;
  }
  return (
    Object.keys(sample).find((k) => typeof sample[k] !== "number") ??
    Object.keys(sample)[0]
  );
};

const pickNumericKeys = (sample: Record<string, any>) =>
  Object.keys(sample).filter((k) => isFiniteNumber(sample[k]));

const buildYearTicksFromPeriod = (data: any[], labelKey: string) => {
  if (labelKey !== "period") return null;

  const periods = data
    .map((d) => String(d?.[labelKey] ?? ""))
    .filter((p) => /^\d{4}-\d{2}$/.test(p));

  if (!periods.length) return null;

  const ticks = Array.from(new Set(periods.filter((p) => p.endsWith("-01")))).sort();
  return ticks.length ? ticks : null;
};

const extractDrill = (payload: any) => {
  if (!payload || typeof payload !== "object") return null;

  const ids = Array.isArray(payload.playerIds) ? payload.playerIds.map(String) : null;
  const players = Array.isArray(payload.players) ? payload.players : null;

  const singleIdRaw = payload.id ?? payload.playerId;
  const singleId = singleIdRaw != null ? String(singleIdRaw) : null;

  if (ids && ids.length) return { kind: "ids" as const, ids };
  if (players && players.length) return { kind: "raw" as const, players };
  if (singleId) return { kind: "ids" as const, ids: [singleId] };

  return null;
};

/* ==============================
   Peças compartilhadas
============================== */

const ANIM = { isAnimationActive: true, animationDuration: 650, animationEasing: "ease-out" as const };

const axisProps = {
  tick: { fontSize: 11.5, fill: AXIS_TEXT },
  tickLine: false,
  axisLine: false,
};

/**
 * Só monta o gráfico depois que o container tem tamanho real. Evita o
 * warning "width(-1) and height(-1)" do recharts e o salto do primeiro frame.
 */
function ChartBox({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [dim, setDim] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setDim((d) => d ?? { width: Math.floor(r.width), height: Math.floor(r.height) });
      }
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="h-full w-full min-h-0 min-w-0">
      {dim ? (
        <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={dim}>
          {children as any}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}

/** Tooltip escuro, igual aos avisos do produto. */
function NightTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
}: any) {
  if (!active || !payload?.length) return null;
  const title = labelFormatter ? labelFormatter(label, payload) : label;
  return (
    <div className="min-w-[160px] rounded-[10px] bg-[var(--night-0)] px-3 py-2.5 text-xs text-white shadow-[var(--shadow-3)] ring-1 ring-white/10">
      {title ? <p className="mb-1.5 font-medium text-white">{title}</p> : null}
      <ul className="space-y-1">
        {payload.map((p: any, i: number) => {
          const [v, name] = valueFormatter ? valueFormatter(p.value, p.name ?? p.dataKey, p) : [p.value, p.name];
          const color = p.payload?.__color ?? p.color ?? p.fill;
          return (
            <li key={i} className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-2 text-white/70">
                <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                {name}
              </span>
              <span className="num text-white">{v}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function LegendRow({ items }: { items: Array<{ label: string; color: string }> }) {
  if (!items.length) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-gray-600">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

function getBarColorForKey(key: string, fallbackIndex: number) {
  const k = key.toLowerCase();
  if (k.includes("base")) return BASE_COLOR;
  if (k.includes("market")) return MARKET_COLOR;
  return fallbackIndex % 2 === 0 ? INK_SERIE : MARKET_COLOR;
}

const NAME_KEYS = new Set(["jogador", "clube", "agencia", "compradores", "vendedores", "pais", "liga", "label"]);

/* ==============================
   BAR TOGGLE
============================== */

function BarToggleWidget({
  options,
  defaultId,
  size,
}: {
  options: { id: string; label: string; data: any[] }[];
  defaultId?: string;
  size: WidgetSize;
}) {
  // "Idade" lê melhor que "Ano de nascimento" como visão inicial
  const preferred =
    options.find((o) => /idade|age|edad/i.test(o.label))?.id ??
    (defaultId && options.some((o) => o.id === defaultId) ? defaultId : options[0]?.id);

  const [active, setActive] = useState<string>(preferred);
  const current = options.find((o) => o.id === active) ?? options[0];
  if (!current) return null;

  return (
    <div className="flex h-full w-full min-h-0 min-w-0 flex-col gap-2">
      <div className="seg w-fit" role="group">
        {options.map((opt) => (
          <button key={opt.id} type="button" onClick={() => setActive(opt.id)} aria-pressed={opt.id === active}>
            {opt.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 min-w-0 flex-1">
        <BarWidget key={current.id} data={current.data} size={size} />
      </div>
    </div>
  );
}

/* ==============================
   BAR
============================== */

function BarWidget({ data, size }: { data: any[]; size: WidgetSize }) {
  const { t, locale } = useI18n();
  const L = intlLocale(locale);
  const lPrettifyKey = useMemo(() => makePrettifyKey(t), [t]);
  const lPrettifyXValue = useMemo(() => makePrettifyXValue(t), [t]);
  const drill = usePlayersDrilldown();

  const rows = data ?? [];
  const sample = rows[0] ?? {};
  const labelKey = rows.length ? pickLabelKey(sample) : "label";
  const numericKeys = rows.length ? pickNumericKeys(sample) : [];
  const yearTicks = buildYearTicksFromPeriod(rows, labelKey);

  const moneyKeys = numericKeys.filter(shouldTreatAsMoney);
  const countKeys = numericKeys.filter((k) => !shouldTreatAsMoney(k));
  // Dois eixos y enganam (dataviz): com dinheiro + contagem, mostra só o dinheiro.
  const series = moneyKeys.length === 1 && countKeys.length === 1 && numericKeys.length === 2 ? moneyKeys : numericKeys;

  const bySector = series.length === 1 && (labelKey === "posicao" || "posicao" in sample);
  const horizontal = NAME_KEYS.has(labelKey) && rows.length <= 15 && series.length === 1;

  const colored = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        __color: bySector ? SETOR_COR[setorDe(r.posicao ?? r[labelKey])] : getBarColorForKey(series[0] ?? "", 0),
      })),
    [rows, bySector, labelKey, series],
  );

  const legendItems = useMemo(() => {
    if (bySector) {
      const present = new Set(rows.map((r) => setorDe(r.posicao ?? r[labelKey])));
      const cp = (t as any).chartPositions ?? {};
      const names: Record<string, string> = {
        GOL: cp.GOL ?? "Goleiros",
        DEF: (t as any).ui?.sector?.DEF ?? "Defesa",
        MEI: (t as any).ui?.sector?.MEI ?? "Meio-campo",
        ATA: (t as any).ui?.sector?.ATA ?? "Ataque",
      };
      return SETORES.filter((s) => present.has(s)).map((s) => ({ label: names[s], color: SETOR_COR[s] }));
    }
    if (series.length <= 1) return [];
    return series.map((k, i) => ({ label: lPrettifyKey(k), color: getBarColorForKey(k, i) }));
  }, [bySector, rows, labelKey, series, lPrettifyKey, t]);

  const onBarClick = (barEvent: any) => {
    const point = barEvent?.payload ?? barEvent;
    const drillInfo = extractDrill(point);
    if (!drillInfo) return;
    const title = buildTitleFromPoint(labelKey, point, t.chartLabels.jogadores, lPrettifyKey, lPrettifyXValue);
    if (drillInfo.kind === "ids") void drill.openFromIds(title, drillInfo.ids);
    else void drill.openFromRaw(title, drillInfo.players);
  };

  if (!rows.length || !series.length) return null;

  const fmtVal = (v: any, key: string) =>
    shouldTreatAsMoney(key) && isFiniteNumber(v) ? eurCompact(v, L) : formatByKey(v, key);

  const tooltip = (
    <Tooltip
      cursor={{ fill: "var(--hover-tint)" }}
      content={
        <NightTooltip
          labelFormatter={(l: any) => lPrettifyXValue(labelKey, l)}
          valueFormatter={(v: any, name: any) => [fmtVal(v, String(name)), lPrettifyKey(String(name))]}
        />
      }
    />
  );

  const clickable = colored.some((r) => extractDrill(r));

  if (horizontal) {
    const key = series[0];
    return (
      <div className="flex h-full w-full min-h-0 min-w-0 flex-col">
        <div className="min-h-0 min-w-0 flex-1">
          <ChartBox>
            <BarChart data={colored} layout="vertical" margin={{ top: 4, right: 76, bottom: 4, left: 4 }} barCategoryGap="22%">
              <CartesianGrid horizontal={false} stroke={GRID} />
              <XAxis type="number" hide domain={[0, (max: number) => max * 1.04]} />
              <YAxis
                type="category"
                dataKey={labelKey}
                width={size === "sm" ? 110 : 150}
                {...axisProps}
                tick={{ fontSize: 12, fill: "#3d4843" }}
                tickFormatter={(v) => {
                  const s = lPrettifyXValue(labelKey, v);
                  return s.length > 22 ? s.slice(0, 21) + "…" : s;
                }}
              />
              {tooltip}
              <Bar
                dataKey={key}
                radius={[0, 4, 4, 0]}
                maxBarSize={20}
                onClick={onBarClick}
                cursor={clickable ? "pointer" : undefined}
                {...ANIM}
              >
                {colored.map((r, i) => (
                  <Cell key={i} fill={r.__color} />
                ))}
                <LabelList
                  dataKey={key}
                  position="right"
                  offset={8}
                  className="num"
                  style={{ fontSize: 11.5, fill: "#3d4843" }}
                  formatter={(v: any) => fmtVal(v, key)}
                />
              </Bar>
            </BarChart>
          </ChartBox>
        </div>
        <LegendRow items={legendItems} />
      </div>
    );
  }

  const manyCats = rows.length > 12;
  const rotate = labelKey !== "period" && rows.length > 6 && !manyCats;

  return (
    <div className="flex h-full w-full min-h-0 min-w-0 flex-col">
      <div className="min-h-0 min-w-0 flex-1">
        <ChartBox>
          <BarChart data={colored} margin={{ top: 8, right: 8, bottom: rotate ? 8 : 0, left: 0 }} barCategoryGap="24%">
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis
              dataKey={labelKey}
              {...axisProps}
              interval={yearTicks ? "preserveStartEnd" : manyCats ? "preserveStartEnd" : 0}
              ticks={yearTicks ?? undefined}
              minTickGap={manyCats ? 12 : 4}
              tickFormatter={(v) => lPrettifyXValue(labelKey, v)}
              {...(rotate ? { angle: -30, textAnchor: "end" as const, height: 56 } : {})}
            />
            <YAxis
              width={shouldTreatAsMoney(series[0]) ? 64 : 36}
              {...axisProps}
              tickFormatter={(v) => (shouldTreatAsMoney(series[0]) ? eurCompact(v, L, 0) : axisTickByKey(v, series[0]))}
            />
            {tooltip}
            {series.map((k, i) => (
              <Bar
                key={k}
                dataKey={k}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
                onClick={onBarClick}
                cursor={clickable ? "pointer" : undefined}
                fill={getBarColorForKey(k, i)}
                {...ANIM}
              >
                {bySector || series.length === 1
                  ? colored.map((r, j) => <Cell key={j} fill={bySector ? r.__color : getBarColorForKey(k, i)} />)
                  : null}
              </Bar>
            ))}
          </BarChart>
        </ChartBox>
      </div>
      <LegendRow items={legendItems} />
    </div>
  );
}

/* ==============================
   LINE
============================== */

function LineWidget({ data, size }: { data: any[]; size: WidgetSize }) {
  const { t, locale } = useI18n();
  const L = intlLocale(locale);
  const lPrettifyKey = useMemo(() => makePrettifyKey(t), [t]);
  const lPrettifyXValue = useMemo(() => makePrettifyXValue(t), [t]);

  const rows = data ?? [];
  const sample = rows[0] ?? {};
  const labelKey = rows.length ? pickLabelKey(sample) : "period";
  const numericKeys = rows.length ? pickNumericKeys(sample) : [];
  const moneyKeys = numericKeys.filter(shouldTreatAsMoney);
  const countKeys = numericKeys.filter((k) => !shouldTreatAsMoney(k));
  const series = moneyKeys.length && countKeys.length ? moneyKeys : numericKeys;
  const yearTicks = buildYearTicksFromPeriod(rows, labelKey);

  const legendItems = useMemo(() => {
    if (series.length <= 1) return [];
    return series.map((k, i) => ({ label: lPrettifyKey(k), color: getBarColorForKey(k, i) }));
  }, [series, lPrettifyKey]);

  if (!rows.length || !series.length) return null;
  void size;

  const money = shouldTreatAsMoney(series[0]);

  return (
    <div className="flex h-full w-full min-h-0 min-w-0 flex-col">
      <div className="min-h-0 min-w-0 flex-1">
        <ChartBox>
          <LineChart data={rows} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis
              dataKey={labelKey}
              {...axisProps}
              ticks={yearTicks ?? undefined}
              interval={yearTicks ? "preserveStartEnd" : "preserveStartEnd"}
              minTickGap={16}
              tickFormatter={(v) => lPrettifyXValue(labelKey, v)}
            />
            <YAxis
              width={money ? 64 : 36}
              {...axisProps}
              tickFormatter={(v) => (money ? eurCompact(v, L, 0) : axisTickByKey(v, series[0]))}
            />
            <Tooltip
              cursor={{ stroke: "#c9cfcb", strokeWidth: 1 }}
              content={
                <NightTooltip
                  labelFormatter={(l: any) => lPrettifyXValue(labelKey, l)}
                  valueFormatter={(v: any, name: any) => [
                    shouldTreatAsMoney(String(name)) && isFiniteNumber(v) ? eurCompact(v, L) : formatByKey(v, String(name)),
                    lPrettifyKey(String(name)),
                  ]}
                />
              }
            />
            {series.map((k, i) => (
              <Line
                key={k}
                type="monotone"
                dataKey={k}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4.5, strokeWidth: 2, stroke: "#fff" }}
                stroke={series.length === 1 ? "var(--accent)" : getBarColorForKey(k, i)}
                strokeLinecap="round"
                {...ANIM}
                animationDuration={900}
              />
            ))}
          </LineChart>
        </ChartBox>
      </div>
      <LegendRow items={legendItems} />
    </div>
  );
}

/* ==============================
   SCATTER
============================== */

const buildIntegerTicks = (min: number, max: number, size: WidgetSize) => {
  const lo = Math.floor(min);
  const hi = Math.ceil(max);
  const range = hi - lo;
  if (range <= 0) return [lo];
  if (size === "lg" && range <= 18) return Array.from({ length: range + 1 }, (_, i) => lo + i);
  const maxTicks = size === "sm" ? 6 : size === "md" ? 8 : 10;
  const step = Math.max(1, Math.ceil(range / maxTicks));
  const ticks: number[] = [];
  for (let v = lo; v <= hi; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] !== hi) ticks.push(hi);
  return ticks;
};

function ScatterWidget({ data, size }: { data: any[]; size: WidgetSize }) {
  const { t, locale } = useI18n();
  const L = intlLocale(locale);
  const drill = usePlayersDrilldown();

  const cleaned = useMemo(
    () =>
      (data ?? [])
        .map((d) => ({
          ...d,
          idade: typeof d.idade === "string" ? Number(d.idade) : d.idade,
          valor: typeof d.valor === "string" ? Number(d.valor) : d.valor,
        }))
        .filter((d) => isFiniteNumber(d.idade) && isFiniteNumber(d.valor))
        .map((d) => ({ ...d, __color: d.posicao ? SETOR_COR[setorDe(d.posicao)] : INK_SERIE })),
    [data],
  );

  const hasSector = cleaned.some((d) => d.posicao);
  const groups = useMemo(() => {
    if (!hasSector) return [{ key: "all", color: INK_SERIE, rows: cleaned }];
    return SETORES.map((s) => ({ key: s, color: SETOR_COR[s], rows: cleaned.filter((d) => setorDe(d.posicao) === s) })).filter(
      (g) => g.rows.length,
    );
  }, [cleaned, hasSector]);

  if (!cleaned.length) return null;

  const idades = cleaned.map((d) => d.idade as number);
  const idadeTicks = buildIntegerTicks(Math.min(...idades) - 1, Math.max(...idades) + 1, size);

  const onPointClick = (evt: any) => {
    const point = evt?.payload ?? evt;
    const drillInfo = extractDrill(point);
    if (!drillInfo) return;
    const nome = point?.nome ?? point?.jogador ?? point?.label;
    const title = nome ? `${t.chartLabels.jogador}: ${String(nome)}` : t.chartLabels.jogador;
    if (drillInfo.kind === "ids") void drill.openFromIds(title, drillInfo.ids);
    else void drill.openFromRaw(title, drillInfo.players);
  };

  const cp = (t as any).chartPositions ?? {};
  const sectorName: Record<string, string> = {
    GOL: cp.GOL ?? "Goleiros",
    DEF: (t as any).ui?.sector?.DEF ?? "Defesa",
    MEI: (t as any).ui?.sector?.MEI ?? "Meio-campo",
    ATA: (t as any).ui?.sector?.ATA ?? "Ataque",
  };

  return (
    <div className="flex h-full w-full min-h-0 min-w-0 flex-col">
      <div className="min-h-0 min-w-0 flex-1">
        <ChartBox>
          <ScatterChart margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={GRID} />
            <XAxis
              type="number"
              dataKey="idade"
              name={t.chartLabels.idade}
              {...axisProps}
              allowDecimals={false}
              ticks={idadeTicks}
              domain={["dataMin - 1", "dataMax + 1"]}
            />
            <YAxis
              type="number"
              dataKey="valor"
              name={t.chartLabels.valor}
              width={64}
              {...axisProps}
              tickFormatter={(v) => eurCompact(v, L, 0)}
              domain={[0, "dataMax"]}
            />
            <Tooltip
              cursor={{ strokeDasharray: "0", stroke: "#c9cfcb" }}
              content={({ active, payload }: any) => {
                if (!active || !payload?.length) return null;
                const p = payload[0]?.payload ?? {};
                const who = p.label ?? p.nome ?? p.jogador;
                return (
                  <div className="rounded-[10px] bg-[var(--night-0)] px-3 py-2.5 text-xs text-white shadow-[var(--shadow-3)] ring-1 ring-white/10">
                    {who ? <p className="mb-1 font-medium">{String(who)}</p> : null}
                    <p className="num text-white/75">
                      {p.idade} {t.ui.common.anos} · {eurCompact(p.valor, L)}
                    </p>
                  </div>
                );
              }}
            />
            {groups.map((g) => (
              <Scatter
                key={g.key}
                name={g.key}
                data={g.rows}
                fill={g.color}
                stroke="#fff"
                strokeWidth={1.5}
                onClick={onPointClick}
                cursor="pointer"
                {...ANIM}
              />
            ))}
          </ScatterChart>
        </ChartBox>
      </div>
      {hasSector ? <LegendRow items={groups.map((g) => ({ label: sectorName[g.key] ?? g.key, color: g.color }))} /> : null}
    </div>
  );
}

/* ==============================
   KPI
============================== */

function KpiWidget({
  data,
}: {
  data: { label: string; value: number | null; sub?: string; unit?: string };
}) {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-1">
      <span className="num text-3xl font-medium tracking-[-0.03em] text-gray-950">
        {data.value !== null ? formatNumber(data.value) : "—"}
      </span>
      <span className="text-xs text-gray-500">{data.label}</span>
      {data.sub && <span className="text-xs text-gray-400">{data.sub}</span>}
    </div>
  );
}
