"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ChevronsLeft, ChevronsRight, LogOut } from "lucide-react";

import { navGroups } from "@/config/nav";
import type { NavGroup } from "@/config/nav";
import { useAuth } from "../../app/auth/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { CLUBE } from "@/config/clube";
import { iniciais } from "@/lib/ui/format";

const W_OPEN = 248;
const W_RAIL = 72;

type Props = {
  /** Gaveta no celular/tablet: aberta ou não. */
  mobileOpen?: boolean;
  onNavigate?: () => void;
};

export default function Sidebar({ mobileOpen = false, onNavigate }: Props) {
  const { user, loading, logout } = useAuth();
  const { t } = useI18n();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const navRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ y: number; h: number } | null>(null);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem("sb_collapsed") === "1");
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--sb-width", `${collapsed ? W_RAIL : W_OPEN}px`);
    try {
      window.localStorage.setItem("sb_collapsed", collapsed ? "1" : "0");
    } catch {}
  }, [collapsed]);

  // Indicador do item ativo: um só elemento que desliza entre os itens.
  useLayoutEffect(() => {
    const root = navRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>('[data-active="true"]');
    if (!el) {
      setIndicator(null);
      return;
    }
    setIndicator({ y: el.offsetTop, h: el.offsetHeight });
  }, [pathname, collapsed, user?.role, t]);

  if (loading || !user) {
    return (
      <aside
        aria-hidden
        className="fixed left-0 top-0 z-40 hidden h-dvh flex-col bg-[var(--night-0)] lg:flex"
        style={{ width: "var(--sb-width)" }}
      />
    );
  }

  const isAdmin = user.role === "ADMIN";
  const displayName = user.name || user.email;

  return (
    <aside
      className={clsx(
        "fixed left-0 top-0 z-40 flex h-dvh flex-col bg-[var(--night-0)] text-[var(--night-ink)] select-none",
        "border-r border-[var(--night-line)]",
        "max-lg:w-[272px] max-lg:transition-transform max-lg:duration-300 max-lg:ease-[var(--ease-out-expo)]",
        mobileOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full",
      )}
      data-collapsed={collapsed ? "true" : "false"}
    >
      <div
        className="flex h-full flex-col lg:w-(--sb-width)"
        style={{ minWidth: 0 }}
      >
        {/* topo: escudo do clube + produto */}
        <div className={clsx("flex items-center gap-2.5 px-3 pt-4 pb-3", collapsed && "lg:justify-center lg:px-0")}>
          <img
            src={CLUBE.escudo}
            alt={CLUBE.nome}
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 object-contain"
          />
          <div className={clsx("min-w-0 leading-tight", collapsed && "lg:hidden")}>
            <p className="truncate text-[13px] font-semibold text-white">{CLUBE.nome}</p>
            <p className="truncate text-[11px] text-[var(--night-ink-2)]">{t.sidebar.appName}</p>
          </div>
        </div>

        {/* navegação */}
        <nav
          ref={navRef}
          aria-label="Principal"
          className="sidebar-scroll relative flex-1 overflow-y-auto px-2 pb-3"
        >
          {indicator ? (
            <span
              aria-hidden
              className="pointer-events-none absolute left-2 right-2 rounded-[9px] bg-[var(--night-2)] shadow-[inset_0_0_0_1px_var(--night-line)]"
              style={{
                top: 0,
                height: indicator.h,
                transform: `translateY(${indicator.y}px)`,
                transition: "transform 260ms var(--ease-out-expo)",
              }}
            />
          ) : null}

          {(navGroups as NavGroup[]).map((g) => {
            const visible = g.items?.filter((it) => it.roles?.includes(user.role)) ?? [];
            if (visible.length === 0) return null;

            return (
              <div key={g.label} className="mt-3 first:mt-1">
                <div
                  className={clsx(
                    "px-2.5 pb-1.5 text-[11px] font-medium text-[var(--night-ink-2)]",
                    collapsed && "lg:hidden",
                  )}
                >
                  {(t.sidebar as any)[g.labelKey] ?? g.label}
                </div>
                {collapsed ? <div className="mx-3 my-2 hidden h-px bg-[var(--night-line)] lg:block" /> : null}

                {visible.map((item) => {
                  const isActive =
                    pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to + "/"));
                  const label = (t.nav as any)[item.labelKey] ?? item.label;

                  return (
                    <Link
                      key={item.to}
                      href={item.to}
                      onClick={onNavigate}
                      data-active={isActive ? "true" : undefined}
                      aria-current={isActive ? "page" : undefined}
                      title={collapsed ? label : undefined}
                      className={clsx(
                        "group relative z-[1] my-px flex h-9 items-center gap-2.5 rounded-[9px] px-2.5 text-[13px] no-underline transition-colors duration-150",
                        collapsed && "lg:justify-center lg:px-0",
                        isActive
                          ? "text-white"
                          : "text-[var(--night-ink-2)] hover:bg-white/[0.04] hover:text-white",
                      )}
                    >
                      <item.icon
                        size={17}
                        strokeWidth={isActive ? 2.1 : 1.8}
                        className={clsx(
                          "shrink-0 transition-colors duration-150",
                          isActive ? "text-[var(--accent-glow)]" : "text-current",
                        )}
                        aria-hidden
                      />
                      <span className={clsx("truncate", collapsed && "lg:sr-only")}>{label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* rodapé: usuário + recolher + sair */}
        <div className="border-t border-[var(--night-line)] p-2">
          <div className={clsx("flex items-center gap-2", collapsed && "lg:flex-col")}>
            <Link
              href="/perfil"
              onClick={onNavigate}
              className={clsx(
                "flex min-w-0 flex-1 items-center gap-2.5 rounded-[9px] px-2 py-1.5 no-underline transition-colors hover:bg-white/[0.05]",
                collapsed && "lg:flex-none lg:justify-center lg:px-0",
              )}
              title={displayName}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--night-3)] text-[11px] font-semibold tracking-wide text-white ring-1 ring-white/10">
                {iniciais(displayName)}
              </span>
              <span className={clsx("min-w-0 leading-tight", collapsed && "lg:hidden")}>
                <span className="block truncate text-[13px] font-medium text-white">{displayName}</span>
                <span className="block truncate text-[11px] text-[var(--night-ink-2)]">
                  {isAdmin ? t.ui.shell.admin : t.ui.shell.cliente}
                </span>
              </span>
            </Link>

            <button
              type="button"
              onClick={() => logout()}
              title={t.sidebar.sair}
              aria-label={t.sidebar.sair}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-[var(--night-ink-2)] transition-colors hover:bg-white/[0.06] hover:text-white cursor-pointer"
            >
              <LogOut size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? t.sidebar.expandir : t.sidebar.recolher}
            title={collapsed ? t.sidebar.expandir : t.sidebar.recolher}
            className={clsx(
              "mt-1 hidden h-8 w-full items-center gap-2 rounded-[9px] px-2.5 text-[12px] text-[var(--night-ink-2)] transition-colors hover:bg-white/[0.05] hover:text-white cursor-pointer lg:flex",
              collapsed && "justify-center px-0",
            )}
          >
            {collapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
            <span className={clsx(collapsed && "sr-only")}>{t.sidebar.recolher}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
