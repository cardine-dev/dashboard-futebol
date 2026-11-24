"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { useShortlist } from "@/contexts/ShortlistContext";
import { useI18n } from "@/contexts/I18nContext";

/** Estrela da lista de observação. Fecha um ciclo, então ganha o "pop". */
export default function StarButton({
  id,
  nome,
  size = 16,
  className = "",
}: {
  id: string;
  nome: string;
  size?: number;
  className?: string;
}) {
  const { has, toggle } = useShortlist();
  const { t } = useI18n();
  const on = has(id);
  const [bump, setBump] = useState(0);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!on) setBump((b) => b + 1);
        toggle(id, nome);
      }}
      aria-pressed={on}
      aria-label={on ? t.ui.shortlist.remover : t.ui.shortlist.adicionar}
      title={on ? t.ui.shortlist.remover : t.ui.shortlist.adicionar}
      className={`grid h-8 w-8 place-items-center rounded-full transition-colors duration-150 cursor-pointer ${
        on ? "text-[var(--color-gol)]" : "text-gray-400 hover:bg-[var(--surface-sunken)] hover:text-gray-700"
      } ${className}`}
    >
      <Star
        key={bump}
        size={size}
        className={on ? "fill-current" : ""}
        style={bump && on ? { animation: "pop 320ms cubic-bezier(0.34,1.56,0.64,1)" } : undefined}
        aria-hidden
      />
    </button>
  );
}
