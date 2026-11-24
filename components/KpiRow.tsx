"use client";

import type { KpisApiResponse, WidgetScope } from "@/type/dashboard";
import { Info } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { eurCompact, eurFull, intlLocale, num } from "@/lib/ui/format";

type Props = {
  data?: KpisApiResponse | null;
  loading?: boolean;
  scope: WidgetScope;
};

type Cell = {
  label: string;
  hint: string;
  value: number | null;
  kind: "int" | "eur" | "dec1" | "age";
  sub?: React.ReactNode;
  meter?: number | null; // 0..1
};

export function KpiRow({ data, loading, scope }: Props) {
  const { t, locale } = useI18n();
  const L = intlLocale(locale);
  const kpis = data?.ok ? data.kpis : null;
  const v = (k: string) => (loading ? null : ((kpis as any)?.[k]?.value ?? null)) as number | null;

  const showBase = scope === "base" || scope === "both";
  const showMarket = scope === "market" || scope === "both";

  const players = v("base.players_count");
  const total = v("base.total_market_value");
  const weighted = v("base.total_market_value_weighted");
  const share = total && weighted !== null && total > 0 ? weighted / total : null;

  const baseCells: Cell[] = [
    { label: t.kpi.jogadoresBase, hint: t.kpi.jogadoresBaseHint, value: players, kind: "int" },
    {
      label: t.kpi.valorMercadoTotal,
      hint: t.kpi.valorMercadoTotalHint,
      value: total,
      kind: "eur",
      sub:
        total !== null && players ? (
          <>
            {eurCompact(total / players, L)} <span className="opacity-70">{t.ui.kpi.porAtleta}</span>
          </>
        ) : null,
    },
    { label: t.kpi.idadeMedia, hint: t.kpi.idadeMediaHint, value: v("base.avg_age"), kind: "age" },
    {
      label: t.kpi.valorAtribuidoBase,
      hint: t.kpi.valorAtribuidoBaseHint,
      value: weighted,
      kind: "eur",
      meter: share,
      sub: share !== null ? <>{num(share * 100, L, 0)}% {t.ui.kpi.doValorTotal}</> : null,
    },
  ];

  const deals = v("market.deals_count");
  const marketCells: Cell[] = [
    { label: t.kpi.transacoesMercado, hint: t.kpi.transacoesMercadoHint, value: deals, kind: "int" },
    { label: t.kpi.volumeFinanceiro, hint: t.kpi.volumeFinanceiroHint, value: v("market.total_fee"), kind: "eur" },
    { label: t.kpi.ticketMedio, hint: t.kpi.ticketMedioHint, value: v("market.avg_fee"), kind: "eur" },
    { label: t.kpi.transacoesMes, hint: t.kpi.transacoesMesHint, value: v("market.deals_per_month"), kind: "dec1" },
  ];

  return (
    <div className="space-y-4">
      {showBase && <Scoreboard title={t.kpi.indicadoresBase} cells={baseCells} tone="night" locale={L} />}
      {showMarket && <Scoreboard title={t.kpi.indicadoresMercado} cells={marketCells} tone="light" locale={L} />}
    </div>
  );
}

function fmt(kind: Cell["kind"], n: number, L: string) {
  if (kind === "eur") return eurCompact(n, L);
  if (kind === "dec1") return num(n, L, 1);
  return num(n, L, 0);
}

function Scoreboard({
  title,
  cells,
  tone,
  locale,
}: {
  title: string;
  cells: Cell[];
  tone: "night" | "light";
  locale: string;
}) {
  const { t } = useI18n();
  const unitAnos = t.ui.common.anos;
  const night = tone === "night";
  return (
    <section
      aria-label={title}
      className={[
        "relative overflow-hidden rounded-[16px]",
        night
          ? "bg-[var(--night-1)] text-white shadow-[var(--shadow-night)]"
          : "surface",
      ].join(" ")}
    >
      {night ? <PitchMarks /> : null}

      <h2
        className={[
          "relative px-5 pt-4 text-[12px] font-medium",
          night ? "text-[var(--night-ink-2)]" : "text-gray-500",
        ].join(" ")}
      >
        {title}
      </h2>

      <div className="relative grid grid-cols-2 lg:grid-cols-4">
        {cells.map((c, i) => (
          <div
            key={c.label}
            className={[
              "min-w-0 px-5 pb-5 pt-3",
              i > 0 ? (night ? "lg:border-l lg:border-white/[0.07]" : "lg:border-l lg:border-[var(--hairline)]") : "",
              i % 2 === 1 ? (night ? "max-lg:border-l max-lg:border-white/[0.07]" : "max-lg:border-l max-lg:border-[var(--hairline)]") : "",
              i >= 2 ? (night ? "max-lg:border-t max-lg:border-white/[0.07]" : "max-lg:border-t max-lg:border-[var(--hairline)]") : "",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-2">
              <p className={["text-[13px] leading-5", night ? "text-[var(--night-ink-2)]" : "text-gray-600"].join(" ")}>
                {c.label}
              </p>
              <Hint text={c.hint} night={night} />
            </div>

            <p
              className={[
                "num mt-1.5 truncate text-[22px] font-medium leading-none tracking-[-0.03em] sm:text-[28px] xl:text-[32px]",
                night ? "text-white" : "text-gray-950",
              ].join(" ")}
              title={c.value !== null && c.kind === "eur" ? eurFull(c.value, locale) : undefined}
            >
              {c.value === null ? (
                <span className={["skeleton inline-block h-7 w-24 align-middle", night ? "opacity-20" : ""].join(" ")} />
              ) : (
                <AnimatedNumber value={c.value} format={(n) => fmt(c.kind, n, locale)} />
              )}
              {c.kind === "age" && c.value !== null ? (
                <span className={["ml-1.5 text-sm font-normal tracking-normal", night ? "text-[var(--night-ink-2)]" : "text-gray-500"].join(" ")}>
                  {unitAnos}
                </span>
              ) : null}
            </p>

            {c.meter !== undefined && c.meter !== null ? (
              <div
                className={["mt-3 h-1.5 overflow-hidden rounded-full", night ? "bg-white/10" : "bg-[var(--surface-sunken)]"].join(" ")}
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(c.meter * 100)}
              >
                <div
                  className="h-full origin-left rounded-full bg-[var(--accent-glow)]"
                  style={{
                    transform: `scaleX(${Math.max(0, Math.min(1, c.meter))})`,
                    transition: "transform 900ms var(--ease-out-expo)",
                  }}
                />
              </div>
            ) : null}

            {c.sub ? (
              <p className={["num mt-2 truncate text-[12px]", night ? "text-[var(--night-ink-2)]" : "text-gray-500"].join(" ")}>
                {c.sub}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

/** Marcas de campo em hairline: linha do meio + círculo central + grande área. */
function PitchMarks() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 1200 180"
      fill="none"
    >
      <g stroke="white" strokeOpacity="0.055" strokeWidth="1.25">
        <line x1="600" y1="0" x2="600" y2="180" />
        <circle cx="600" cy="90" r="62" />
        <circle cx="600" cy="90" r="2.5" fill="white" fillOpacity="0.08" />
        <rect x="-1" y="30" width="130" height="120" />
        <rect x="-1" y="62" width="48" height="56" />
        <path d="M129 62a40 40 0 0 1 0 56" />
        <rect x="1071" y="30" width="130" height="120" />
        <rect x="1153" y="62" width="48" height="56" />
        <path d="M1071 62a40 40 0 0 0 0 56" />
      </g>
    </svg>
  );
}

function Hint({ text, night }: { text: string; night: boolean }) {
  return (
    <span className="group/hint relative shrink-0">
      <button
        type="button"
        aria-label={text}
        className={[
          "grid h-5 w-5 place-items-center rounded-md transition-colors cursor-help",
          night ? "text-white/35 hover:bg-white/10 hover:text-white/80" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600",
        ].join(" ")}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 top-7 z-50 w-64 translate-y-1 rounded-[10px] bg-[var(--night-0)] p-3 text-xs leading-5 text-white/85 opacity-0 shadow-[var(--shadow-3)] ring-1 ring-white/10 transition-[opacity,transform] duration-150 group-hover/hint:translate-y-0 group-hover/hint:opacity-100 group-focus-within/hint:translate-y-0 group-focus-within/hint:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
