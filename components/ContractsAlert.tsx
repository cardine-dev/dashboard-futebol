"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { getPlayers, onPlayersInvalidated } from "@/lib/client/playersStore";
import PlayerAvatar from "@/components/ui/PlayerAvatar";
import { ContractBadge } from "@/components/Card";
import { eurMi, intlLocale, mesesAte } from "@/lib/ui/format";
import type { Jogador } from "@/type/jogador";

/** Contratos que vencem em até 12 meses: o que pede decisão (renovar, vender, liberar). */
export default function ContractsAlert() {
  const { t, locale } = useI18n();
  const L = intlLocale(locale);
  const c = t.ui.contratos;
  const [players, setPlayers] = useState<Jogador[] | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => getPlayers().then((p) => alive && setPlayers(p)).catch(() => alive && setPlayers([]));
    load();
    const off = onPlayersInvalidated(load);
    return () => {
      alive = false;
      off();
    };
  }, []);

  const vencendo = useMemo(() => {
    const now = new Date();
    return (players ?? [])
      .map((p) => ({ p, m: mesesAte(p.contratoFim, now) }))
      .filter((x): x is { p: Jogador; m: number } => x.m !== null && x.m <= 12)
      .sort((a, b) => a.m - b.m);
  }, [players]);

  // Carregando: reserva a mesma altura (mesmo grid de 6 itens) pra o grid abaixo não pular (CLS).
  if (players === null) {
    return (
      <section className="surface p-4 sm:p-5" aria-busy="true" aria-label={c.titulo}>
        <div className="skeleton h-[18px] w-48 rounded-md" />
        <div className="skeleton mt-2 h-[14px] w-64 rounded-md" />
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="skeleton h-[54px] rounded-[12px]" />
          ))}
        </ul>
      </section>
    );
  }
  if (vencendo.length === 0) return null;

  const valor = vencendo.reduce((s, x) => s + (Number(x.p.valorMercado) || 0), 0);

  return (
    <section data-pdf-block="true" className="surface p-4 sm:p-5" aria-label={c.titulo}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-gray-950">{c.titulo}</h2>
          <p className="num mt-0.5 text-[13px] text-gray-500">
            {vencendo.length} {c.atletas} · {eurMi(valor, L)} {c.emRisco}
          </p>
        </div>
        <Link href="/jogadores?sort=contrato" className="btn btn-ghost no-underline" data-no-export="true">
          {c.verTodos}
          <ArrowRight size={15} aria-hidden />
        </Link>
      </div>
      <ul className="stagger mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {vencendo.slice(0, 6).map(({ p }) => (
          <li key={p.id}>
            <Link
              href={`/jogadores/${p.id}`}
              className="flex items-center gap-3 rounded-[12px] px-2.5 py-2 no-underline ring-1 ring-[var(--hairline)] transition-colors hover:bg-[var(--surface-2)]"
            >
              <PlayerAvatar nome={p.nome} posicao={p.posicao} imagemUrl={p.imagemUrl} size={36} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium text-gray-950">{p.nome}</span>
                <span className="num block truncate text-[12px] text-gray-500">
                  {(t.positions as any)[p.posicao] ?? p.posicao} · {eurMi(p.valorMercado, L)}
                </span>
              </span>
              <ContractBadge fim={p.contratoFim} compact />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
