"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, LogOut, Search, Star, UserPlus, Columns3 } from "lucide-react";
import clsx from "clsx";

import { navGroups } from "@/config/nav";
import { useAuth } from "@/app/auth/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { getPlayers } from "@/lib/client/playersStore";
import { corDoSetor } from "@/lib/ui/sector";
import { useShortlist } from "@/contexts/ShortlistContext";
import type { Jogador } from "@/type/jogador";

type Item = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  run: () => void;
  keywords: string;
};

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Pontua: começo de palavra vale mais que meio; todas as palavras precisam bater. */
function score(hay: string, q: string) {
  if (!q) return 1;
  const words = q.split(/\s+/).filter(Boolean);
  let total = 0;
  for (const w of words) {
    const i = hay.indexOf(w);
    if (i < 0) return 0;
    total += i === 0 ? 3 : hay[i - 1] === " " ? 2 : 1;
  }
  return total;
}

export default function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const { has } = useShortlist();
  const [q, setQ] = useState("");
  const [players, setPlayers] = useState<Jogador[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // O AppShell só monta a paleta aberta: estado sempre começa limpo.
  useEffect(() => {
    if (!open) return;
    getPlayers()
      .then(setPlayers)
      .catch(() => setPlayers([]));
    const id = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(id);
  }, [open]);

  const go = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router],
  );

  const allItems = useMemo<Item[]>(() => {
    if (!user) return [];
    const items: Item[] = [];

    for (const g of navGroups) {
      for (const it of g.items) {
        if (!it.roles.includes(user.role)) continue;
        const label = (t.nav as any)[it.labelKey] ?? it.label;
        const Icon = it.icon;
        items.push({
          id: `nav:${it.to}`,
          group: t.ui.palette.telas,
          label,
          hint: it.to,
          icon: <Icon size={16} aria-hidden />,
          run: () => go(it.to),
          keywords: norm(`${label} ${it.label} ${it.to}`),
        });
      }
    }

    items.push({
      id: "act:compare",
      group: t.ui.palette.acoes,
      label: t.ui.palette.abrirComparador,
      icon: <Columns3 size={16} aria-hidden />,
      run: () => go("/comparar"),
      keywords: norm(`${t.ui.palette.abrirComparador} comparar compare`),
    });
    if (user.role === "ADMIN") {
      items.push({
        id: "act:new",
        group: t.ui.palette.acoes,
        label: t.ui.palette.novoAtleta,
        icon: <UserPlus size={16} aria-hidden />,
        run: () => go("/admin/jogadores/novo"),
        keywords: norm(`${t.ui.palette.novoAtleta} novo cadastrar atleta jogador`),
      });
    }
    items.push({
      id: "act:logout",
      group: t.ui.palette.acoes,
      label: t.ui.palette.sair,
      icon: <LogOut size={16} aria-hidden />,
      run: () => {
        onClose();
        logout();
      },
      keywords: norm(`${t.ui.palette.sair} logout sair`),
    });

    for (const p of players) {
      const clube = p.clubeRef?.nome ?? p.clubeNome ?? "";
      items.push({
        id: `plr:${p.id}`,
        group: t.ui.palette.atletas,
        label: p.nome,
        hint: [p.posicao, p.idade ? `${p.idade}` : null, clube].filter(Boolean).join(" · "),
        icon: (
          <span className="relative grid h-6 w-6 place-items-center rounded-full bg-gray-100 text-[10px] font-semibold text-gray-700">
            {p.nome
              .split(" ")
              .slice(0, 2)
              .map((x) => x[0])
              .join("")}
            <span
              className="sector-dot absolute -bottom-0.5 -right-0.5"
              style={{ background: corDoSetor(p.posicao), width: 7, height: 7 }}
            />
          </span>
        ),
        run: () => go(`/jogadores/${p.id}`),
        keywords: norm(`${p.nome} ${p.posicao} ${clube} ${p.representacao ?? ""}`),
      });
    }
    return items;
  }, [user, players, t, go, logout, onClose]);

  const results = useMemo(() => {
    const nq = norm(q);
    const scored = allItems
      .map((it) => ({ it, s: score(it.keywords, nq) }))
      .filter((x) => x.s > 0);
    if (nq) scored.sort((a, b) => b.s - a.s);
    // Sem busca: telas + ações + 6 atletas; com busca: até 30
    const limited = nq
      ? scored.slice(0, 30)
      : scored.filter((x) => !x.it.id.startsWith("plr:")).concat(
          scored.filter((x) => x.it.id.startsWith("plr:")).slice(0, 6),
        );
    const order = [t.ui.palette.atletas, t.ui.palette.telas, t.ui.palette.acoes];
    const byGroup = new Map<string, Item[]>();
    for (const { it } of limited) {
      if (!byGroup.has(it.group)) byGroup.set(it.group, []);
      byGroup.get(it.group)!.push(it);
    }
    const groups = (nq ? order : [t.ui.palette.telas, t.ui.palette.atletas, t.ui.palette.acoes])
      .filter((g) => byGroup.has(g))
      .map((g) => ({ group: g, items: byGroup.get(g)! }));
    return { groups, flat: groups.flatMap((g) => g.items) };
  }, [allItems, q, t]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      results.flat[active]?.run();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!open) return null;

  let idx = -1;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label={t.ui.shell.buscar}>
      <button
        type="button"
        aria-label={t.ui.toast.fechar}
        onClick={onClose}
        className="backdrop-in absolute inset-0 bg-[var(--scrim)] backdrop-blur-[2px] cursor-default"
      />
      <div
        className="overlay-in relative w-full max-w-[620px] overflow-hidden rounded-[16px] bg-[var(--surface)] shadow-[var(--shadow-3)]"
        style={{ transformOrigin: "50% 0%" }}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-[var(--hairline)] px-4">
          <Search size={18} className="shrink-0 text-gray-400" aria-hidden />
          <input
            ref={inputRef}
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            placeholder={t.ui.palette.placeholder}
            className="h-14 w-full bg-transparent text-[15px] text-gray-900 outline-none placeholder:text-gray-400"
            aria-autocomplete="list"
            aria-controls="palette-list"
            aria-activedescendant={results.flat[active] ? `pal-${results.flat[active].id}` : undefined}
          />
          <kbd className="hidden rounded-md border border-[var(--hairline-strong)] px-1.5 py-0.5 font-mono text-[11px] text-gray-500 sm:inline">
            Esc
          </kbd>
        </div>

        <div id="palette-list" ref={listRef} role="listbox" className="max-h-[min(60vh,440px)] overflow-y-auto p-2">
          {results.flat.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-gray-500">
              {t.ui.palette.vazio} “{q}”
            </p>
          ) : (
            results.groups.map((g) => (
              <div key={g.group} className="mb-1">
                <p className="px-3 pb-1 pt-2 text-[11px] font-medium text-gray-500">{g.group}</p>
                {g.items.map((it) => {
                  idx += 1;
                  const i = idx;
                  const isActive = i === active;
                  const starred = it.id.startsWith("plr:") && has(it.id.slice(4));
                  return (
                    <div
                      key={it.id}
                      id={`pal-${it.id}`}
                      role="option"
                      aria-selected={isActive}
                      data-idx={i}
                      onMouseMove={() => setActive(i)}
                      onClick={() => it.run()}
                      className={clsx(
                        "flex h-11 cursor-pointer items-center gap-3 rounded-[10px] px-3 text-sm",
                        isActive ? "bg-[var(--surface-sunken)] text-gray-900" : "text-gray-700",
                      )}
                    >
                      <span className="grid h-6 w-6 shrink-0 place-items-center text-gray-500">{it.icon}</span>
                      <span className="min-w-0 flex-1 truncate font-medium">{it.label}</span>
                      {starred ? <Star size={13} className="fill-[var(--color-gol)] text-[var(--color-gol)]" aria-hidden /> : null}
                      {it.hint ? <span className="hidden max-w-[45%] truncate text-xs text-gray-500 sm:block">{it.hint}</span> : null}
                      {isActive ? <CornerDownLeft size={14} className="shrink-0 text-gray-400" aria-hidden /> : null}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--hairline)] bg-[var(--surface-2)] px-4 py-2 text-[11px] text-gray-500">
          <span>{t.ui.palette.dica}</span>
          <span className="font-mono">⌘K · Ctrl K</span>
        </div>
      </div>
    </div>
  );
}
