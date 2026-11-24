"use client";

import Link from "next/link";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import PlayerAvatar from "@/components/ui/PlayerAvatar";

interface Action {
  icon: LucideIcon;
  onClick?: () => void;
  href?: string;
  /** compat: blue = ver, yellow = editar, red = excluir */
  color?: "blue" | "yellow" | "red";
  label?: string;
}

interface AdminRowProps {
  foto?: string | null;
  title: string;
  subtitle?: string;
  createdAt?: string;
  actions?: Action[];
  /** Posição do atleta, quando a linha é de jogador (tinge o avatar pelo setor). */
  posicao?: string | null;
  /** 4ª coluna opcional (ex.: data de criação quando a 3ª é o local). */
  extra?: React.ReactNode;
}

const ROLE_LABEL: Record<NonNullable<Action["color"]>, string> = {
  blue: "Ver",
  yellow: "Editar",
  red: "Excluir",
};

// Cabeçalho e linha usam a mesma grade. No celular ficam avatar, nome e ações:
// as colunas de apoio (data, local) somem para o nome não ser cortado.
const GRID =
  "grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-2 px-3 sm:grid-cols-[48px_minmax(0,1.6fr)_1fr_1fr_auto]";

/** Cabeçalho da listagem do admin, alinhado às colunas de `AdminRow`. */
export function AdminRowHeader({ title, col3, col4, actions }: { title: string; col3?: string; col4?: string; actions: string }) {
  return (
    <div className={clsx(GRID, "border-b border-[var(--hairline)] bg-[var(--surface-2)] py-3 text-xs font-semibold text-gray-600")}>
      <span />
      <span>{title}</span>
      <span className="hidden sm:block">{col3}</span>
      <span className="hidden sm:block">{col4}</span>
      <span className="pr-1 text-right">{actions}</span>
    </div>
  );
}

/**
 * Linha de listagem do admin. Ações em botões de ícone neutros: a cor só
 * aparece no hover, e vermelho fica reservado para excluir.
 */
export default function AdminRow({ foto, title, subtitle, createdAt, actions = [], posicao, extra }: AdminRowProps) {
  return (
    <div className={clsx(GRID, "group border-b border-[var(--hairline)] py-2.5 transition-colors last:border-b-0 hover:bg-[var(--surface-2)]")}>
      <div className="flex items-center justify-center">
        <PlayerAvatar nome={title} posicao={posicao ?? null} imagemUrl={foto} size={36} />
      </div>

      <div className="flex min-w-0 flex-col">
        <span className="truncate text-[13.5px] font-medium text-gray-950">{title}</span>
        {subtitle && <span className="truncate text-xs text-gray-500">{subtitle}</span>}
      </div>

      <div className="num hidden text-[13px] text-gray-600 sm:block">{createdAt ?? "—"}</div>

      <div className="num hidden text-[13px] text-gray-600 sm:block">{extra}</div>

      <div className="flex items-center justify-end gap-1 pr-1">
        {actions.map((a, i) => {
          const danger = a.color === "red";
          const label = a.label ?? (a.color ? ROLE_LABEL[a.color] : undefined);
          const className = clsx(
            "grid h-8 w-8 place-items-center rounded-[9px] text-gray-500 transition-colors duration-150 cursor-pointer",
            danger ? "hover:bg-red-50 hover:text-[var(--bad)]" : "hover:bg-[var(--surface-sunken)] hover:text-gray-950",
          );

          if (a.href) {
            return (
              <Link key={i} href={a.href} prefetch={false} className={className} aria-label={label} title={label}>
                <a.icon size={16} />
              </Link>
            );
          }

          return (
            <button key={i} type="button" onClick={a.onClick} className={className} aria-label={label} title={label}>
              <a.icon size={16} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
