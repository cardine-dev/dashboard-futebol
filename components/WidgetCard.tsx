"use client";

import type {
  WidgetDefinition,
  WidgetApiResponse,
  WidgetSize,
} from "@/type/dashboard";
import dynamic from "next/dynamic";
import { EmptyState } from "./EmptyState";
import { useI18n } from "@/contexts/I18nContext";

// recharts (~156 KB gz) fica num chunk à parte: fora da entrada do /dashboard e do prefetch
// que a sidebar faz em toda rota. O download começa assim que este módulo roda no navegador,
// em paralelo com o fetch dos dados dos widgets.
const loadRenderer = () => import("./WidgetRenderer").then((m) => m.WidgetRenderer);
if (typeof window !== "undefined") void loadRenderer();
const WidgetRenderer = dynamic(loadRenderer, { ssr: false, loading: () => <Skeleton /> });

type Props = {
  widget: WidgetDefinition;
  loading: boolean;
  data?: WidgetApiResponse;
  size: WidgetSize;
  onSizeChange: (size: WidgetSize) => void;
};

function isGeoMapWidget(widget: WidgetDefinition) {
  const id = String((widget as any)?.id ?? "").toLowerCase();
  const title = String((widget as any)?.title ?? "").toLowerCase();

  if (id.includes("geo") || id.includes("map")) return true;
  if (title.includes("mapa")) return true;

  return false;
}

export function WidgetCard({
  widget,
  loading,
  data,
  size,
  onSizeChange,
}: Props) {
  const { t } = useI18n();
  const isMap = isGeoMapWidget(widget);

  const effectiveSize: WidgetSize = isMap ? "lg" : size;
  const bodyHeightClass = getBodyHeightClass(effectiveSize, isMap);

  return (
    <section className="surface min-w-0 p-4 sm:p-5">
      {!isMap && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-gray-950">
              {widget.title}
            </h3>
            {widget.description && (
              <p className="mt-0.5 text-[13px] leading-5 text-gray-500">
                {widget.description}
              </p>
            )}
          </div>

          <div className="shrink-0">
            <SizeToggle value={effectiveSize} onChange={onSizeChange} />
          </div>
        </div>
      )}

      <div
        className={[
          "relative min-w-0 min-h-0",
          isMap ? "overflow-visible" : "overflow-hidden",
          bodyHeightClass,
        ].join(" ")}
      >
        {loading && <Skeleton />}

        {!loading && data && data.ok === false && (
          <EmptyState
            title={t.widgetCard.erro}
            description={data.error ?? t.widgetCard.erroDesconhecido}
          />
        )}

        {!loading && data?.ok && data.payload.kind === "empty" && (
          <EmptyState
            title={t.widgetCard.semDados}
            description={data.payload.reason}
            hint={data.payload.hint}
          />
        )}

        {!loading && data?.ok && data.payload.kind !== "empty" && (
          <div className="h-full w-full min-w-0 min-h-0">
            <WidgetRenderer payload={data.payload} size={effectiveSize} />
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Toggle de tamanho corrigido (não quebra layout)                    */
/* ------------------------------------------------------------------ */

function SizeToggle({
  value,
  onChange,
}: {
  value: "sm" | "md" | "lg";
  onChange: (v: "sm" | "md" | "lg") => void;
}) {
  const items: Array<{ id: "sm" | "md" | "lg"; label: string }> = [
    { id: "sm", label: "SM" },
    { id: "md", label: "MD" },
    { id: "lg", label: "LG" },
  ];

  return (
    <div className="seg" role="group" aria-label="Widget size" data-no-export="true">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => onChange(it.id)}
          aria-pressed={it.id === value}
          className="num !px-2 !text-[10.5px]"
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Alturas                                                             */
/* ------------------------------------------------------------------ */

function getBodyHeightClass(size: WidgetSize, isMap: boolean) {
  if (isMap) {
    switch (size) {
      case "sm":
        return "h-[340px]";
      case "md":
        return "h-[520px]";
      case "lg":
        return "h-[540px]";
      default:
        return "h-[500px]";
    }
  }

  switch (size) {
    case "sm":
      return "h-[240px]";
    case "md":
      return "h-[360px]";
    case "lg":
      return "h-[460px]";
    default:
      return "h-[360px]";
  }
}

/* ------------------------------------------------------------------ */
/* Skeleton                                                            */
/* ------------------------------------------------------------------ */

function Skeleton() {
  return (
    <div className="flex h-full w-full items-end gap-3 px-2 pb-6" aria-hidden>
      {[46, 72, 58, 88, 64, 40, 76, 52].map((h, i) => (
        <div key={i} className="skeleton flex-1" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}