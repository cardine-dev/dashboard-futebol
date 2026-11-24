"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUp, Star, X } from "lucide-react";

import PageTitle from "@/components/Atoms/PageTitle";
import PlayerAvatar from "@/components/ui/PlayerAvatar";
import PlayerPicker from "@/components/ui/PlayerPicker";
import Radar from "@/components/ui/Radar";
import { useI18n } from "@/contexts/I18nContext";
import { useShortlist } from "@/contexts/ShortlistContext";
import { getPlayers } from "@/lib/client/playersStore";
import { ATRIBUTOS, media, perfilDe } from "@/lib/ui/atributos";
import { dataCurta, eurCompact, eurMi, intlLocale, mesesAte, num } from "@/lib/ui/format";
import { corDoSetor } from "@/lib/ui/sector";
import type { Jogador } from "@/type/jogador";

/** Cores de identidade dos atletas comparados (3 primeiras da paleta validada, todos os pares). */
const SERIE = ["var(--serie-1)", "var(--serie-2)", "var(--serie-3)"];
const MAX = 3;

export default function CompararPage() {
  return (
    <Suspense fallback={null}>
      <Comparar />
    </Suspense>
  );
}

function Comparar() {
  const { t, locale } = useI18n();
  const L = intlLocale(locale);
  const c = t.ui.compare;
  const router = useRouter();
  const params = useSearchParams();
  const { ids: shortlist } = useShortlist();
  const [players, setPlayers] = useState<Jogador[]>([]);

  const ids = useMemo(
    () =>
      (params.get("ids") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, MAX),
    [params],
  );

  useEffect(() => {
    getPlayers().then(setPlayers).catch(() => setPlayers([]));
  }, []);

  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  // Sem repetidos e só ids que existem: lixo na URL não ocupa vaga.
  const sel = useMemo(
    () => (Array.from(new Set(ids)).map((id) => byId.get(id)).filter(Boolean) as Jogador[]).slice(0, MAX),
    [ids, byId],
  );
  const selIds = sel.map((p) => p.id);

  const setIds = (next: string[]) => {
    const q = next.length ? `?ids=${next.join(",")}` : "";
    router.replace(`/comparar${q}`, { scroll: false });
  };

  const add = (p: Jogador) => setIds([...selIds, p.id].slice(0, MAX));
  const remove = (id: string) => setIds(selIds.filter((x) => x !== id));

  const perfis = sel.map((p) => perfilDe(p));
  const attrLabels = Object.fromEntries(ATRIBUTOS.map((a) => [a, (c.atributos as any)[a]])) as any;

  type RowDef = { label: string; get: (p: Jogador, i: number) => number | null; fmt: (v: number | null, p: Jogador) => string; best?: "max" | "min" };
  const posse = (p: Jogador) => (typeof p.possePct === "number" ? (p.possePct > 1 ? p.possePct : p.possePct * 100) : null);
  const rows: RowDef[] = [
    { label: c.valor, get: (p) => Number(p.valorMercado) || null, fmt: (_v, p) => eurMi(p.valorMercado, L), best: "max" },
    { label: c.posse, get: (p) => posse(p), fmt: (v) => (v === null ? "—" : `${num(v, L, 0)}%`), best: "max" },
    {
      label: t.ui.ficha.valorClube,
      get: (p) => (posse(p) !== null ? (Number(p.valorMercado) || 0) * 1e6 * (posse(p)! / 100) : null),
      fmt: (v) => (v === null ? "—" : eurCompact(v, L)),
      best: "max",
    },
    { label: c.idade, get: (p) => p.idade ?? null, fmt: (v) => (v === null ? "—" : `${v} ${t.ui.common.anos}`), best: "min" },
    {
      label: c.contrato,
      get: (p) => mesesAte(p.contratoFim),
      fmt: (v, p) => (v === null ? "—" : `${dataCurta(p.contratoFim, L)} · ${v} ${t.ui.common.meses}`),
      best: "max",
    },
    { label: c.altura, get: (p) => p.altura ?? null, fmt: (v) => (v === null ? "—" : `${num(v, L, 2)} m`) },
  ];
  const textRows: Array<{ label: string; get: (p: Jogador) => string }> = [
    { label: c.posicao, get: (p) => (t.positions as any)[p.posicao] ?? p.posicao },
    { label: c.pe, get: (p) => (p.peDominante ? (t.ui.pe as any)[p.peDominante] : "—") },
    { label: c.clube, get: (p) => p.clubeRef?.nome ?? p.clubeNome ?? "—" },
    { label: c.agencia, get: (p) => p.representacao ?? "—" },
  ];

  const bestIdx = (r: RowDef) => {
    if (!r.best || sel.length < 2) return -1;
    const vals = sel.map((p, i) => r.get(p, i));
    let bi = -1;
    vals.forEach((v, i) => {
      if (v === null) return;
      if (bi === -1) bi = i;
      else if (r.best === "max" ? v > (vals[bi] as number) : v < (vals[bi] as number)) bi = i;
    });
    const unique = vals.filter((v) => v === vals[bi]).length === 1;
    return unique ? bi : -1;
  };

  const shortlistSuggestions = shortlist.filter((id) => !selIds.includes(id)).map((id) => byId.get(id)).filter(Boolean).slice(0, 6) as Jogador[];

  return (
    <section className="w-full">
      <PageTitle base={t.sidebar.analise} title={c.titulo} subtitle={c.subtitulo} />

      {/* slots */}
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {Array.from({ length: MAX }).map((_, i) => {
          const p = sel[i];
          if (!p) {
            return (
              <PlayerPicker key={`slot-${i}`} players={players} exclude={selIds} onPick={add} label={i === 0 ? c.escolher : c.adicionarAtleta} />
            );
          }
          return (
            <article key={p.id} className="surface relative overflow-hidden p-4" style={{ animation: "enter 280ms var(--ease-out-expo) both" }}>
              <button
                type="button"
                onClick={() => remove(p.id)}
                aria-label={`${c.remover} ${p.nome}`}
                className="absolute right-2 top-2.5 grid h-7 w-7 place-items-center rounded-full text-gray-400 hover:bg-[var(--surface-sunken)] hover:text-gray-800 cursor-pointer"
              >
                <X size={14} />
              </button>
              <div className="flex items-center gap-3 pr-6">
                <span className="relative">
                  <PlayerAvatar nome={p.nome} posicao={p.posicao} imagemUrl={p.imagemUrl} size={52} />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-[var(--surface)]" style={{ background: SERIE[i] }} aria-hidden />
                </span>
                <div className="min-w-0">
                  <Link href={`/jogadores/${p.id}`} className="block truncate text-[15px] font-semibold text-gray-950 no-underline hover:underline">
                    {p.nome}
                  </Link>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-gray-500">
                    <span className="sector-dot" style={{ background: corDoSetor(p.posicao) }} aria-hidden />
                    {(t.positions as any)[p.posicao] ?? p.posicao} · {p.idade} {t.ui.common.anos}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-[11.5px] text-gray-500">{c.valor}</p>
                  <p className="num text-[22px] font-semibold tracking-[-0.025em] text-gray-950">{eurMi(p.valorMercado, L)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11.5px] text-gray-500">{t.ui.ficha.media}</p>
                  <p className="num text-[22px] font-semibold tracking-[-0.025em]" style={{ color: SERIE[i] }}>
                    {media(perfis[i])}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {shortlistSuggestions.length && sel.length < MAX ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-gray-500">
          <Star size={14} className="fill-[var(--color-gol)] text-[var(--color-gol)]" aria-hidden />
          {t.ui.shell.observacaoTitulo}:
          {shortlistSuggestions.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => add(p)}
              className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[var(--surface)] px-2.5 text-[12.5px] text-gray-700 shadow-[var(--shadow-1)] hover:text-gray-950 cursor-pointer"
            >
              + {p.nome}
            </button>
          ))}
        </div>
      ) : null}

      {sel.length < 2 ? (
        <div className="surface mt-5 grid place-items-center px-6 py-14 text-center text-[14px] text-gray-500">{c.vazio}</div>
      ) : (
        <div className="mt-5 grid items-start gap-4 lg:grid-cols-5">
          <article className="surface p-5 lg:col-span-2">
            <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-gray-950">{c.perfil}</h3>
            <div className="mt-2">
              <Radar
                key={sel.map((p) => p.id).join("|")}
                series={sel.map((p, i) => ({ id: p.id, nome: p.nome, cor: SERIE[i], perfil: perfis[i] }))}
                labels={attrLabels}
                size={320}
              />
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-gray-600">
              {sel.map((p, i) => (
                <span key={p.id} className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: SERIE[i] }} aria-hidden />
                  {p.nome}
                </span>
              ))}
            </div>
            <div className="mt-5 space-y-3">
              {ATRIBUTOS.map((a) => (
                <div key={a}>
                  <p className="text-[12px] text-gray-500">{(c.atributos as any)[a]}</p>
                  <div className="mt-1 space-y-1">
                    {sel.map((p, i) => (
                      <div key={p.id} className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                          <div
                            className="h-full origin-left rounded-full"
                            style={{ width: `${perfis[i][a]}%`, background: SERIE[i], animation: `grow-x 700ms var(--ease-out-expo) ${i * 60}ms both` }}
                          />
                        </div>
                        <span className="num w-6 text-right text-[11.5px] text-gray-700">{perfis[i][a]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-center text-[11.5px] text-gray-500">{c.notaAtributos}</p>
          </article>

          <article className="surface overflow-hidden lg:col-span-3">
            <h3 className="px-5 pt-5 text-[15px] font-semibold tracking-[-0.01em] text-gray-950">{c.dados}</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th className="w-[30%] px-5 py-2 text-left font-medium text-gray-500" />
                    {sel.map((p, i) => (
                      <th key={p.id} className="px-4 py-2 text-left font-medium text-gray-700">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ background: SERIE[i] }} aria-hidden />
                          <span className="truncate">{p.nome.split(" ")[0]}</span>
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const bi = bestIdx(r);
                    return (
                      <tr key={r.label} className="border-t border-[var(--hairline)]">
                        <th scope="row" className="px-5 py-3 text-left font-normal text-gray-500">
                          {r.label}
                        </th>
                        {sel.map((p, i) => (
                          <td key={p.id} className={`num px-4 py-3 ${i === bi ? "font-semibold text-gray-950" : "text-gray-700"}`}>
                            <span className="inline-flex items-center gap-1.5">
                              {r.fmt(r.get(p, i), p)}
                              {i === bi ? (
                                <span className="grid h-4 w-4 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]" title={c.melhor}>
                                  <ArrowUp size={11} strokeWidth={2.4} aria-label={c.melhor} />
                                </span>
                              ) : null}
                            </span>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  {textRows.map((r) => (
                    <tr key={r.label} className="border-t border-[var(--hairline)]">
                      <th scope="row" className="px-5 py-3 text-left font-normal text-gray-500">
                        {r.label}
                      </th>
                      {sel.map((p) => (
                        <td key={p.id} className="px-4 py-3 text-gray-700">
                          <span className="block max-w-[180px] truncate">{r.get(p)}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
