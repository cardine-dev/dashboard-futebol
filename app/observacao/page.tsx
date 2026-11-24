"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Columns3, Star, Trash2, Users } from "lucide-react";

import PageTitle from "@/components/Atoms/PageTitle";
import Card from "@/components/Card";
import { useI18n } from "@/contexts/I18nContext";
import { useShortlist } from "@/contexts/ShortlistContext";
import { getPlayers } from "@/lib/client/playersStore";
import { eurCompact, intlLocale, num } from "@/lib/ui/format";
import type { Jogador } from "@/type/jogador";

export default function ObservacaoPage() {
  const { t, locale } = useI18n();
  const L = intlLocale(locale);
  const s = t.ui.shortlist;
  const { ids, clear } = useShortlist();
  const [players, setPlayers] = useState<Jogador[] | null>(null);

  useEffect(() => {
    getPlayers().then(setPlayers).catch(() => setPlayers([]));
  }, []);

  const lista = useMemo(() => {
    if (!players) return [];
    const byId = new Map(players.map((p) => [p.id, p]));
    return ids.map((id) => byId.get(id)).filter(Boolean) as Jogador[];
  }, [players, ids]);

  const total = lista.reduce((acc, p) => acc + (Number(p.valorMercado) || 0) * 1e6, 0);
  const idadeMedia = lista.length ? lista.reduce((a, p) => a + (p.idade ?? 0), 0) / lista.length : null;

  return (
    <section className="w-full">
      <PageTitle
        base={t.common.principal}
        title={t.ui.shell.observacaoTitulo}
        subtitle={lista.length ? `${lista.length} ${s.atletas} · ${eurCompact(total, L)} · ${num(idadeMedia, L, 1)} ${t.ui.common.anos}` : undefined}
        actions={
          lista.length ? (
            <>
              <button type="button" onClick={clear} className="btn btn-ghost cursor-pointer">
                <Trash2 size={16} aria-hidden />
                {s.limpar}
              </button>
              {lista.length >= 2 ? (
                <Link href={`/comparar?ids=${lista.slice(0, 3).map((p) => p.id).join(",")}`} className="btn btn-dark no-underline">
                  <Columns3 size={16} aria-hidden />
                  {s.compararSelecionados}
                </Link>
              ) : null}
            </>
          ) : null
        }
      />

      {players === null ? (
        <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="surface h-[248px] p-4">
              <div className="skeleton h-14 w-14 !rounded-full" />
              <div className="skeleton mt-6 h-6 w-1/2" />
            </div>
          ))}
        </div>
      ) : lista.length === 0 ? (
        <div className="surface mt-5 grid place-items-center px-6 py-16 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[color-mix(in_oklab,var(--color-gol)_14%,white)]">
            <Star size={20} className="text-[var(--color-gol)]" aria-hidden />
          </span>
          <p className="mt-4 text-[15px] font-medium text-gray-950">{s.vazioTitulo}</p>
          <p className="mt-1 max-w-sm text-[13.5px] leading-6 text-gray-500">{s.vazioTexto}</p>
          <Link href="/jogadores" className="btn btn-dark mt-5 no-underline">
            <Users size={16} aria-hidden />
            {s.verJogadores}
          </Link>
        </div>
      ) : (
        <div className="stagger mt-5 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          {lista.map((p) => (
            <Card key={p.id} player={p} />
          ))}
        </div>
      )}
    </section>
  );
}
