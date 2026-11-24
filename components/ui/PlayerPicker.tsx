"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Plus, Search } from "lucide-react";
import type { Jogador } from "@/type/jogador";
import PlayerAvatar from "@/components/ui/PlayerAvatar";
import { useI18n } from "@/contexts/I18nContext";
import { eurMi, intlLocale } from "@/lib/ui/format";

const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Combobox de atleta: botão que abre uma busca com lista navegável por teclado. */
export default function PlayerPicker({
  players,
  exclude,
  onPick,
  label,
}: {
  players: Jogador[];
  exclude: string[];
  onPick: (p: Jogador) => void;
  label: string;
}) {
  const { t, locale } = useI18n();
  const L = intlLocale(locale);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const list = useMemo(() => {
    const nq = norm(q.trim());
    return players
      .filter((p) => !exclude.includes(p.id))
      .filter((p) => !nq || norm(`${p.nome} ${p.clubeNome ?? ""} ${p.posicao}`).includes(nq))
      .slice(0, 8);
  }, [players, exclude, q]);

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => inputRef.current?.focus(), 10);
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open]);

  return (
    <div ref={boxRef} className="relative h-full">
      <button
        type="button"
        onClick={() => {
          setQ("");
          setActive(0);
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        className="grid h-full min-h-[132px] w-full place-items-center rounded-[var(--radius-card)] border border-dashed border-[var(--hairline-strong)] bg-[var(--surface-2)] text-sm text-gray-500 transition-colors hover:border-[var(--accent)] hover:text-gray-900 cursor-pointer"
      >
        <span className="inline-flex flex-col items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--surface)] shadow-[var(--shadow-1)]">
            <Plus size={16} aria-hidden />
          </span>
          {label}
        </span>
      </button>

      {open ? (
        <div className="overlay-in absolute left-0 right-0 top-0 z-30 overflow-hidden rounded-[12px] bg-[var(--surface)] shadow-[var(--shadow-3)]" style={{ transformOrigin: "50% 0%" }}>
          <div className="flex items-center gap-2 border-b border-[var(--hairline)] px-3">
            <Search size={15} className="text-gray-400" aria-hidden />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(a + 1, list.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(a - 1, 0));
                } else if (e.key === "Enter" && list[active]) {
                  e.preventDefault();
                  onPick(list[active]);
                  setOpen(false);
                } else if (e.key === "Escape") {
                  e.stopPropagation();
                  setOpen(false);
                }
              }}
              placeholder={t.ui.compare.buscar}
              className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={list[active] ? `${listId}-${list[active].id}` : undefined}
            />
          </div>
          <ul id={listId} role="listbox" className="max-h-72 overflow-y-auto p-1.5">
            {list.length === 0 ? (
              <li className="px-3 py-6 text-center text-[13px] text-gray-500">
                {t.ui.palette.vazio} “{q}”
              </li>
            ) : (
              list.map((p, i) => (
                <li
                  key={p.id}
                  id={`${listId}-${p.id}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseMove={() => setActive(i)}
                  onClick={() => {
                    onPick(p);
                    setOpen(false);
                  }}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-[9px] px-2.5 py-2 ${i === active ? "bg-[var(--surface-sunken)]" : ""}`}
                >
                  <PlayerAvatar nome={p.nome} posicao={p.posicao} imagemUrl={p.imagemUrl} size={30} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-gray-900">{p.nome}</span>
                    <span className="num block truncate text-[11.5px] text-gray-500">
                      {(t.positions as any)[p.posicao] ?? p.posicao} · {p.idade} {t.ui.common.anos} · {eurMi(p.valorMercado, L)}
                    </span>
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
