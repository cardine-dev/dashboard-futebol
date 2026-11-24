"use client";

import { Download, LayoutGrid, Loader2 } from "lucide-react";
import PageTitle from "@/components/Atoms/PageTitle";
import type { DashboardView } from "@/type/dashboard";
import { useI18n } from "@/contexts/I18nContext";
import { CLUBE } from "@/config/clube";

type Props = {
  view: DashboardView;
  onViewChange: (v: DashboardView) => void;
  onOpenPicker: () => void;

  onExport: () => void;
  exporting?: boolean;
  exportDisabled?: boolean;
  exportError?: string | null;
};

const TAB_KEYS: Array<{ id: DashboardView; key: "base" | "mercado" | "ambos" | "comparativo" }> = [
  { id: "base", key: "base" },
  { id: "market", key: "mercado" },
  { id: "both", key: "ambos" },
  { id: "compare", key: "comparativo" },
];

export function DashboardHeader({
  view,
  onViewChange,
  onOpenPicker,
  onExport,
  exporting,
  exportDisabled,
  exportError,
}: Props) {
  const { t } = useI18n();
  const disabled = !!exporting || !!exportDisabled;

  const actions = (
    <>
      <div className="seg" role="group" aria-label={t.dashboard.title}>
        {TAB_KEYS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onViewChange(tab.id)}
            aria-pressed={tab.id === view}
            className="!px-3 !py-1.5"
          >
            {(t.dashboard as any)[tab.key]}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onOpenPicker}
        className="btn btn-ghost cursor-pointer"
        title={t.dashboard_escolherWidgets}
        data-no-export="true"
      >
        <LayoutGrid size={16} aria-hidden />
        {t.dashboard.widgets}
      </button>

      <button
        type="button"
        onClick={onExport}
        disabled={disabled}
        data-no-export="true"
        className="btn btn-dark cursor-pointer"
        title={t.exportPdf.exportar}
      >
        {exporting ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Download size={16} aria-hidden />}
        {exporting ? t.exportPdf.gerando : t.exportPdf.exportar}
      </button>

      {exportError ? (
        <p role="alert" className="w-full rounded-[10px] bg-red-50 px-3 py-2 text-xs font-medium text-[var(--bad)] ring-1 ring-red-200">
          {t.dashboard.falhaExportar}: {exportError}
        </p>
      ) : null}
    </>
  );

  return (
    <PageTitle
      base={t.common.principal}
      title={t.dashboard.title}
      subtitle={`${CLUBE.nome} · ${CLUBE.cidade}`}
      actions={actions}
    />
  );
}
