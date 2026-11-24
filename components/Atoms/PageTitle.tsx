"use client";

import React from "react";
import { ChevronRight } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

type Props = {
  title: string;
  base?: string;
  subtitle?: string;
  /** Ação de destaque (ex.: Exportar PDF). Fica à direita, antes das demais ações. */
  centerActions?: React.ReactNode;
  rightActions?: React.ReactNode;
  /** compat: alias de rightActions */
  actions?: React.ReactNode;
  crumbLabel?: string;
  className?: string;
};

export default function PageTitle({
  title,
  base,
  subtitle,
  centerActions,
  rightActions,
  actions,
  crumbLabel,
  className,
}: Props) {
  const { t } = useI18n();
  const resolvedBase = base ?? t.common.principal;
  const pageLabel = crumbLabel ?? title;
  const resolvedRight = rightActions ?? actions;

  return (
    <header className={["w-full", className].filter(Boolean).join(" ")}>
      <nav className="flex items-center gap-1 text-xs text-gray-500" aria-label="Breadcrumb">
        <span>{resolvedBase}</span>
        <ChevronRight size={12} className="text-gray-400" aria-hidden />
        <span className="text-gray-700">{pageLabel}</span>
      </nav>

      <div className="mt-1.5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.025em] text-gray-950 text-balance">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 max-w-[68ch] text-sm leading-6 text-gray-500">{subtitle}</p>
          ) : null}
        </div>

        {centerActions || resolvedRight ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {centerActions}
            {resolvedRight}
          </div>
        ) : null}
      </div>

      <div className="mt-5 h-px w-full bg-[var(--hairline)]" />
    </header>
  );
}
