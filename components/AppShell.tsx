"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Search, Star, X } from "lucide-react";
import Sidebar from "@/components/Atoms/Sidebar";
import LanguageSwitcher from "@/components/Atoms/LanguageSwitcher";
import CommandPalette from "@/components/shell/CommandPalette";
import { ToastProvider } from "@/components/ui/Toast";
import { ShortlistProvider, useShortlist } from "@/contexts/ShortlistContext";
import { useAuth } from "../app/auth/AuthContext";
import { useI18n } from "@/contexts/I18nContext";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ShortlistProvider>
        <Shell>{children}</Shell>
      </ShortlistProvider>
    </ToastProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const { ids } = useShortlist();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const isLogin = pathname === "/login";

  useEffect(() => {
    if (loading) return;
    if (!user && !isLogin) {
      router.replace("/login");
      router.refresh();
    }
  }, [loading, user, isLogin, router]);

  // ⌘K / Ctrl+K abre a busca global; "/" também, fora de campos de texto.
  useEffect(() => {
    if (!user) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      } else if (e.key === "/" && !typing && !paletteOpen) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [user, paletteOpen]);

  useEffect(() => {
    setMobileNav(false);
  }, [pathname]);

  // Login fica fora da casca. Nas outras rotas a árvore é sempre a mesma
  // (com ou sem usuário carregado), senão a página remonta e refaz os fetches.
  if (isLogin) return <>{children}</>;

  return (
    <div className="min-h-dvh">
      <Sidebar mobileOpen={mobileNav} onNavigate={() => setMobileNav(false)} />

      {mobileNav ? (
        <button
          type="button"
          aria-label={t.ui.shell.fecharMenu}
          onClick={() => setMobileNav(false)}
          className="backdrop-in fixed inset-0 z-30 bg-[var(--scrim)] lg:hidden"
        />
      ) : null}

      <div className="min-w-0 lg:pl-(--sb-width)">
        <header className="sticky top-0 z-20 border-b border-[var(--hairline)] bg-[color-mix(in_oklab,var(--canvas)_86%,transparent)] backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-2 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setMobileNav((v) => !v)}
              aria-label={mobileNav ? t.ui.shell.fecharMenu : t.ui.shell.abrirMenu}
              className="grid h-9 w-9 place-items-center rounded-[10px] text-gray-700 hover:bg-[var(--surface-sunken)] lg:hidden cursor-pointer"
            >
              {mobileNav ? <X size={18} /> : <Menu size={18} />}
            </button>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="group flex h-9 w-full max-w-[420px] items-center gap-2.5 rounded-[10px] bg-[var(--surface)] px-3 text-left text-sm text-gray-500 shadow-[var(--shadow-1)] transition-shadow hover:shadow-[var(--shadow-hover)] cursor-pointer"
            >
              <Search size={15} className="shrink-0 text-gray-400" aria-hidden />
              <span className="flex-1 truncate">
                <span className="hidden sm:inline">{t.ui.shell.buscar}</span>
                <span className="sm:hidden">{t.ui.shell.buscarCurto}</span>
              </span>
              <kbd className="hidden rounded-md border border-[var(--hairline-strong)] bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[11px] text-gray-500 sm:inline">
                Ctrl K
              </kbd>
            </button>

            <div className="ml-auto flex items-center gap-2">
              <Link
                href="/observacao"
                className="relative inline-flex h-9 items-center gap-2 rounded-[10px] px-2.5 text-sm font-medium text-gray-700 no-underline transition-colors hover:bg-[var(--surface-sunken)]"
                title={t.ui.shell.observacaoTitulo}
              >
                <Star
                  size={16}
                  className={ids.length ? "fill-[var(--color-gol)] text-[var(--color-gol)]" : "text-gray-500"}
                  aria-hidden
                />
                <span className="hidden md:inline">{t.ui.shell.observacao}</span>
                {ids.length ? (
                  <span
                    key={ids.length}
                    className="num grid min-w-5 place-items-center rounded-full bg-[var(--ink)] px-1.5 text-[11px] font-semibold leading-5 text-white"
                    style={{ animation: "pop 320ms cubic-bezier(0.34,1.56,0.64,1)" }}
                  >
                    {ids.length}
                  </span>
                ) : null}
              </Link>
              <LanguageSwitcher />
            </div>
          </div>
        </header>

        <main key={pathname} className="route-enter mx-auto max-w-[1600px] px-4 pb-16 pt-5 sm:px-6">
          {children}
        </main>
      </div>

      {paletteOpen ? <CommandPalette open onClose={() => setPaletteOpen(false)} /> : null}
    </div>
  );
}
