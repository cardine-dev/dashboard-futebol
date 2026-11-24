"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";

import PageTitle from "@/components/Atoms/PageTitle";
import Card from "@/components/Card";
import PlayerRow from "@/components/PlayerRow";
import JogadoresFilterDrawer from "@/components/JogadoresFilter";
import { NONE_AGENCY, type JogadoresFilters } from "@/components/Atoms/filter/utils";
import type { Jogador } from "@/type/jogador";
import { Download, LayoutGrid, List, Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { SETORES, SETOR_COR, setorDe, type Setor } from "@/lib/ui/sector";
import { mesesAte } from "@/lib/ui/format";

import { useDashboardPdfExport } from "@/hooks/useDashboardPdfExport";
import { useI18n } from "@/contexts/I18nContext";

/* =========================
   Error boundary
========================= */
function ErrorFallback({ err }: { err?: any }) {
  const { t } = useI18n();
  return (
    <section className="w-full">
      <div className="surface p-4">
        <h3 className="mb-2 font-bold">{t.jogadores.erroCarregar}</h3>
        <pre className="whitespace-pre-wrap wrap-break-word text-xs text-red-800">
          {String(err?.message ?? err ?? t.jogadores.erroDesconhecido)}
        </pre>
      </div>
    </section>
  );
}

class PageErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; err?: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, err: undefined };
  }

  static getDerivedStateFromError(err: any) {
    return { hasError: true, err };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback err={this.state.err} />;
    }
    return this.props.children;
  }
}

/* =========================
   Helpers
========================= */

type View = "grid" | "list";
type AgeMode = "idade" | "anoNascimento";

function normStr(v: any) {
  return String(v ?? "").trim();
}

function onlyDigits(v: any) {
  return String(v ?? "").replace(/\D/g, "");
}

function normalizeAgency(v: any) {
  const s = normStr(v).toLowerCase();
  if (!s) return "";
  if (s === "—" || s === "-" || s === "n/a" || s === "na" || s === "null") return "";
  return normStr(v);
}

function normalizeClub(j: any) {
  const s = normStr(j?.clubeNome ?? j?.clube);
  return s || "—";
}

function safeNumber(v: any): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function agencyMatches(j: any, selected: string[]) {
  if (!selected || selected.length === 0) return true;

  const agency = normalizeAgency(j?.representacao);
  const hasAgency = agency.length > 0;

  const wantsNone = selected.includes(NONE_AGENCY);
  const selectedAgencies = selected.filter((x) => x !== NONE_AGENCY);

  if (wantsNone && selectedAgencies.length === 0) return !hasAgency;

  if (wantsNone) {
    return !hasAgency || (hasAgency && selectedAgencies.includes(agency));
  }

  return hasAgency && selectedAgencies.includes(agency);
}

/**
 * FILTRO ÚNICO E FIEL AO DRAWER (inclui NOVOS filtros)
 */
function applyJogadoresFilters(players: Jogador[], f: JogadoresFilters) {
  const ageMode: AgeMode = ((f as any).ageMode as AgeMode) ?? "idade";

  const { idadeMin, idadeMax } = f as any;
  const anoMin = (f as any).anoNascimentoMin;
  const anoMax = (f as any).anoNascimentoMax;

  const { valorMin, valorMax } = f as any;
  const valorSemDefinicao = Boolean((f as any).valorSemDefinicao);

  const {posseMin, posseMax} = f as any;
  const posseSemDefinicao = Boolean((f as any).posseSemDefinicao);

  const {alturaMin, alturaMax} = f as any;
  const alturaSemDefinicao = Boolean((f as any).alturaSemDefinicao);

  const cpfCadastrado = (f as any).cpfCadastrado as "tem" | "nao_tem" | undefined;
  const passaporteEuropeu = (f as any).passaporteEuropeu as "sim" | "nao" | undefined;
  const convocadoSelecao = (f as any).convocadoSelecao as "sim" | "nao" | undefined;

  return players.filter((j: any) => {
    const clubeNome = normalizeClub(j);
    if (f.clubes?.length && !f.clubes.includes(clubeNome)) return false;

    if (!agencyMatches(j, f.agencias ?? [])) return false;

    const pos = normStr(j?.posicao);
    if (f.posicoes?.length && !f.posicoes.includes(pos)) return false;

    const pe = normStr(j?.peDominante);
    if (f.peDominante?.length && !f.peDominante.includes(pe)) return false;

    // ===== CPF cadastrado (tem/nao_tem) =====
    if (cpfCadastrado) {
      const cpfDigits = onlyDigits(j?.cpf);
      const hasCpf = cpfDigits.length === 11;
      if (cpfCadastrado === "tem" && !hasCpf) return false;
      if (cpfCadastrado === "nao_tem" && hasCpf) return false;
    }

    // ===== Passaporte europeu (sim/nao). "nao" inclui null/undefined =====
    if (passaporteEuropeu) {
      const isEu = j?.passaporte?.europeu === true;
      if (passaporteEuropeu === "sim" && !isEu) return false;
      if (passaporteEuropeu === "nao" && isEu) return false;
    }

    // ===== Convocado seleção (sim/nao). "nao" inclui null/undefined =====
    if (convocadoSelecao) {
      const isConv = j?.selecao?.convocado === true;
      if (convocadoSelecao === "sim" && !isConv) return false;
      if (convocadoSelecao === "nao" && isConv) return false;
    }

    // ===== Idade / Ano Nascimento =====
    if (ageMode === "idade") {
      const idade = safeNumber(j?.idade);
      const v = idade ?? 0;
      if (typeof idadeMin === "number" && v < idadeMin) return false;
      if (typeof idadeMax === "number" && v > idadeMax) return false;
    } else {
      const ano = safeNumber(j?.anoNascimento);
      if (ano == null) return false;
      if (typeof anoMin === "number" && ano < anoMin) return false;
      if (typeof anoMax === "number" && ano > anoMax) return false;
    }

    // ===== Valor Mercado =====
    const valor = safeNumber(j?.valorMercado);
    if (valorSemDefinicao) {
      if (valor != null && valor > 0) return false;
    } else {
      const v = valor ?? 0;
      if (typeof valorMin === "number" && v < valorMin) return false;
      if (typeof valorMax === "number" && v > valorMax) return false;
    }

    // ===== Posse % =====
    const posse = safeNumber(j?.possePct);
    if (posseSemDefinicao) {
      if (posse != null) return false;
    } else {
      const hasRange = typeof posseMin === "number" || typeof posseMax === "number";
      if (hasRange) {
        if (posse == null) return false;
        if (typeof posseMin === "number" && posse < posseMin) return false;
        if (typeof posseMax === "number" && posse > posseMax) return false;
      }
    }

    // ===== Altura =====
    const altura = safeNumber(j?.altura);
    if (alturaSemDefinicao) {
      if (altura != null && altura > 0) return false;
    } else {
      const hasRange = typeof alturaMin === "number" || typeof alturaMax === "number";
      if (hasRange) {
        if (altura == null || altura <= 0) return false;
        if (typeof alturaMin === "number" && altura < alturaMin) return false;
        if (typeof alturaMax === "number" && altura > alturaMax) return false;
      }
    }

    return true;
  });
}

/* =========================
   Defaults
========================= */

const EMPTY_FILTERS: JogadoresFilters = {
  clubes: [],
  agencias: [],
  posicoes: [],
  peDominante: [],

  idadeMin: undefined,
  idadeMax: undefined,
  valorMin: undefined,
  valorMax: undefined,
  ageMode: "idade",
  anoNascimentoMin: undefined,
  anoNascimentoMax: undefined,
  valorSemDefinicao: false,

  // novos
  posseMin: undefined,
  posseMax: undefined,
  posseSemDefinicao: false,

  alturaMin: undefined,
  alturaMax: undefined,
  alturaSemDefinicao: false,

  cpfCadastrado: undefined,
  passaporteEuropeu: undefined,
  convocadoSelecao: undefined,
};

export default function JogadoresPage() {
  const { t } = useI18n();
  const [view, setView] = useState<View>("grid");
  const [data, setData] = useState<Jogador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<JogadoresFilters>(EMPTY_FILTERS);

  // EXPORT
  const { exportRef, exportPdf, exporting, error: exportError } = useDashboardPdfExport();

  const jogadores = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const filtered = useMemo(() => applyJogadoresFilters(jogadores, filters), [jogadores, filters]);

  // Busca rápida, setor e ordenação: camada leve por cima dos filtros do painel lateral.
  const [q, setQ] = useState("");
  const [setor, setSetor] = useState<Setor | "ALL">("ALL");
  const [sort, setSort] = useState<"valor" | "idade" | "nome" | "contrato">("valor");
  useEffect(() => {
    // /jogadores?sort=contrato (atalho do alerta de contratos no dashboard)
    const v = new URLSearchParams(window.location.search).get("sort");
    if (v === "contrato" || v === "idade" || v === "nome" || v === "valor") setSort(v);
  }, []);
  const visible = useMemo(() => {
    const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const nq = norm(q.trim());
    const out = filtered.filter((p) => {
      if (setor !== "ALL" && setorDe(p.posicao) !== setor) return false;
      if (!nq) return true;
      return norm(`${p.nome} ${p.clubeNome ?? ""} ${p.representacao ?? ""}`).includes(nq);
    });
    const cmp: Record<string, (a: Jogador, b: Jogador) => number> = {
      valor: (a, b) => (Number(b.valorMercado) || 0) - (Number(a.valorMercado) || 0),
      idade: (a, b) => (a.idade ?? 99) - (b.idade ?? 99),
      nome: (a, b) => a.nome.localeCompare(b.nome),
      contrato: (a, b) => (mesesAte(a.contratoFim) ?? 999) - (mesesAte(b.contratoFim) ?? 999),
    };
    return [...out].sort(cmp[sort]);
  }, [filtered, q, setor, sort]);
  const sectorCount = useMemo(() => {
    const c: Record<string, number> = { ALL: filtered.length };
    for (const p of filtered) c[setorDe(p.posicao)] = (c[setorDe(p.posicao)] ?? 0) + 1;
    return c;
  }, [filtered]);

  const activeFiltersCount = useMemo(() => {
    let n = 0;

    if (filters.clubes?.length) n++;
    if (filters.agencias?.length) n++;
    if (filters.posicoes?.length) n++;
    if (filters.peDominante?.length) n++;

    const ageMode: AgeMode = ((filters as any).ageMode as AgeMode) ?? "idade";
    if (ageMode === "idade") {
          if (typeof (filters as any).idadeMin === "number" || typeof (filters as any).idadeMax === "number") n++;
        }
    else if (typeof (filters as any).anoNascimentoMin === "number" || typeof (filters as any).anoNascimentoMax === "number") n++;

    const semValor = Boolean((filters as any).valorSemDefinicao);
    if (semValor) n++;
    else if (typeof (filters as any).valorMin === "number" || typeof (filters as any).valorMax === "number") n++;

    const semPosse = Boolean((filters as any).posseSemDefinicao);
    if (semPosse) n++;
    else if (typeof (filters as any).posseMin === "number" || typeof (filters as any).posseMax === "number") n++;

    const semAltura = Boolean((filters as any).alturaSemDefinicao);
    if (semAltura) n++;
    else if (typeof (filters as any).alturaMin === "number" || typeof (filters as any).alturaMax === "number") n++;

    if ((filters as any).cpfCadastrado) n++;
    if ((filters as any).passaporteEuropeu) n++;
    if ((filters as any).convocadoSelecao) n++;

    return n;
  }, [filters]);

  const handleExport = useCallback(() => {
    void exportPdf({
      filename: `jogadores-${view}-${new Date().toISOString().slice(0, 10)}.pdf`,
      format: "a4",
      orientation: "portrait",
      marginMm: 8,
      scale: 2,
      blockSelector: `[data-pdf-block="true"]`,
      header: {
        title: t.jogadores.title,
        subtitle: `${t.jogadores.modo}: ${view} • ${t.jogadores.filtrosLabel}: ${activeFiltersCount} • ${t.jogadores.mostrando}: ${visible.length}`,
        rightText: new Date().toISOString().slice(0, 10),
      },
      footer: {
        leftText: t.sidebar.appName,
        pageLabel: t.pdfExport.pagina,
        ofLabel: t.pdfExport.de,
      },
    });
  }, [exportPdf, view, activeFiltersCount, visible.length]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/jogadores", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status} ao buscar jogadores`);

        const raw = await res.json();

        const listaApi: any[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.jogadores)
          ? raw.jogadores
          : [];

        const normalizado: Jogador[] = listaApi.map((p: any) => {
          const idadeN = safeNumber(p?.idade);
          const anoN = safeNumber(p?.anoNascimento);
          const valorN = safeNumber(p?.valorMercado);

          return {
            ...p,
            id: String(p.id),
            nome: String(p.nome ?? ""),

            // garante CPF sempre string (evita quebrar filtro/UI)
            cpf: String(p?.cpf ?? ""),

            idade: idadeN == null ? 0 : Math.trunc(idadeN),
            anoNascimento: anoN == null ? null : Math.trunc(anoN),

            posicao: p.posicao ?? "ATA",
            valorMercado: valorN == null ? 0 : valorN,

            peDominante: (p.peDominante ?? "D") as Jogador["peDominante"],

            representacao: p.representacao ?? "",
            numeroCamisa: p.numeroCamisa ?? null,
            imagemUrl: p.imagemUrl ?? undefined,

            // normaliza clube
            clubeNome: p.clubeNome ?? p.clubeRef?.nome ?? p.clube ?? "—",
            clubeId: p.clubeId ?? p.clubeRef?.id ?? null,
            clubeRef: p.clubeRef ?? null,
          } as Jogador;
        });

        if (active) setData(normalizado);
      } catch (err: any) {
        console.error(err);
        if (active) setError(err?.message ?? t.jogadores.erroCarregar);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const headerActions = (
    <>
      <button
        type="button"
        onClick={() => setFiltersOpen(true)}
        data-no-export="true"
        className="btn btn-ghost cursor-pointer"
      >
        <SlidersHorizontal size={16} aria-hidden />
        {t.jogadores.filtros}
        {activeFiltersCount > 0 && (
          <span className="num grid h-5 min-w-5 place-items-center rounded-full bg-[var(--accent)] px-1.5 text-[11px] font-semibold text-[var(--accent-ink)]">
            {activeFiltersCount}
          </span>
        )}
      </button>

      <div className="seg" role="group" aria-label={t.jogadores.alternarVisualizacao} data-no-export="true">
        <button type="button" onClick={() => setView("grid")} aria-pressed={view === "grid"} title={t.jogadores.exibirCards} className="inline-flex items-center gap-1.5 !py-1.5">
          <LayoutGrid size={14} aria-hidden />
          {t.jogadores.cards}
        </button>
        <button type="button" onClick={() => setView("list")} aria-pressed={view === "list"} title={t.jogadores.exibirLista} className="inline-flex items-center gap-1.5 !py-1.5">
          <List size={14} aria-hidden />
          {t.jogadores.lista}
        </button>
      </div>

      <button
        type="button"
        onClick={handleExport}
        disabled={loading || exporting || !!error}
        data-no-export="true"
        className="btn btn-dark cursor-pointer"
      >
        {exporting ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Download size={16} aria-hidden />}
        {exporting ? t.exportPdf.gerando : t.exportPdf.exportar}
      </button>
    </>
  );

  return (
    <PageErrorBoundary>
      <section className="w-full">
        <PageTitle
          base={t.common.principal}
          title={t.jogadores.title}
          subtitle={t.jogadores.subtitle}
          actions={headerActions}
        />

        {exportError ? (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            {t.jogadores.falhaExportar}: {exportError}
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between" data-no-export="true">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t.ui.sectorFilter}>
            {(["ALL", ...SETORES] as const).map((s) => {
              const active = setor === s;
              const label = s === "ALL" ? t.ui.todos : (t.ui.sector as any)[s];
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSetor(s)}
                  aria-pressed={active}
                  className={[
                    "inline-flex h-8 items-center gap-2 rounded-full px-3 text-[13px] transition-[background-color,box-shadow,color] duration-150 cursor-pointer",
                    active
                      ? "bg-[var(--ink)] text-white shadow-[var(--shadow-btn)]"
                      : "bg-[var(--surface)] text-gray-700 shadow-[var(--shadow-1)] hover:text-gray-950",
                  ].join(" ")}
                >
                  {s !== "ALL" ? <span className="sector-dot" style={{ background: SETOR_COR[s], boxShadow: "none" }} aria-hidden /> : null}
                  {label}
                  <span className={["num text-[11px]", active ? "text-white/70" : "text-gray-500"].join(" ")}>{sectorCount[s] ?? 0}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <label className="relative block w-full lg:w-72">
              <span className="sr-only">{t.ui.compare.buscar}</span>
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t.ui.compare.buscar}
                className="input !h-9 !pl-9 !pr-8"
              />
              {q ? (
                <button type="button" onClick={() => setQ("")} aria-label={t.ui.toast.fechar} className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-gray-400 hover:bg-[var(--surface-sunken)] hover:text-gray-700 cursor-pointer">
                  <X size={13} />
                </button>
              ) : null}
            </label>
            <label className="sr-only" htmlFor="sort-jog">{t.ui.ordenar}</label>
            <select
              id="sort-jog"
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="input !h-9 !w-auto cursor-pointer"
            >
              <option value="valor">{t.ui.ordem.valor}</option>
              <option value="idade">{t.ui.ordem.idade}</option>
              <option value="contrato">{t.ui.ordem.contrato}</option>
              <option value="nome">{t.ui.ordem.nome}</option>
            </select>
            <span className="num hidden whitespace-nowrap text-[13px] text-gray-500 sm:inline">
              {loading ? "…" : `${visible.length} / ${jogadores.length}`}
            </span>
          </div>
        </div>

        {loading && (
          <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4" aria-busy="true" aria-label={t.jogadores.carregando}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="surface flex h-[248px] flex-col gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div className="skeleton h-14 w-14 !rounded-full" />
                  <div className="flex-1 space-y-2"><div className="skeleton h-4 w-3/4" /><div className="skeleton h-3 w-1/2" /></div>
                </div>
                <div className="skeleton mt-4 h-6 w-1/2" />
                <div className="skeleton h-1.5 w-full" />
                <div className="skeleton mt-auto h-4 w-2/3" />
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div role="alert" className="surface mt-4 p-6 text-sm text-[var(--bad)]">{t.common.erro}: {error}</div>
        )}

        {!loading && !error && visible.length === 0 && (
          <div className="surface mt-4 grid place-items-center px-6 py-16 text-center">
            <p className="text-[15px] font-medium text-gray-900">{t.jogadores.nenhumJogador}</p>
            <button
              type="button"
              className="btn btn-ghost mt-4 cursor-pointer"
              onClick={() => {
                setQ("");
                setSetor("ALL");
              }}
            >
              {t.ui.limparFiltros}
            </button>
          </div>
        )}

        {/* ESCOPO EXPORTÁVEL */}
        <div ref={exportRef} className="mt-4" data-export-scope="jogadores">
          {!loading && !error && visible.length > 0 && (
            <>
              <h2 className="sr-only">{t.jogadores.title}</h2>
              {view === "grid" ? (
                <div className="stagger grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
                  {visible.map((p) => (
                    <div key={p.id} data-pdf-block="true">
                      <Card player={p} />
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="surface overflow-x-auto"
                  data-export-scroll="true"
                >
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="border-b border-[var(--hairline)] bg-[var(--surface-2)] px-4 py-2.5 text-left text-[12px] font-medium text-gray-500">
                          {t.jogadores.jogador}
                        </th>
                        <th className="border-b border-[var(--hairline)] bg-[var(--surface-2)] px-4 py-2.5 text-left text-[12px] font-medium text-gray-500">
                          {t.jogadores.clube}
                        </th>
                        <th className="border-b border-[var(--hairline)] bg-[var(--surface-2)] px-4 py-2.5 text-left text-[12px] font-medium text-gray-500">
                          {t.jogadores.idade}
                        </th>
                        <th className="border-b border-[var(--hairline)] bg-[var(--surface-2)] px-4 py-2.5 text-left text-[12px] font-medium text-gray-500">
                          {t.jogadores.pe}
                        </th>
                        <th className="border-b border-[var(--hairline)] bg-[var(--surface-2)] px-4 py-2.5 text-left text-[12px] font-medium text-gray-500">
                          {t.jogadores.altura}
                        </th>
                        <th className="border-b border-[var(--hairline)] bg-[var(--surface-2)] px-4 py-2.5 text-left text-[12px] font-medium text-gray-500">
                          {t.ui.compare.contrato}
                        </th>
                        <th className="border-b border-[var(--hairline)] bg-[var(--surface-2)] px-4 py-2.5 text-right text-[12px] font-medium text-gray-500">
                          {t.jogadores.valor}
                        </th>
                        <th className="border-b border-[var(--hairline)] bg-[var(--surface-2)] px-4 py-2.5 text-left text-[12px] font-medium text-gray-500">
                          {t.jogadores.posse}
                        </th>
                        <th className="border-b border-[var(--hairline)] bg-[var(--surface-2)] px-2 py-2.5 text-left text-[12px] font-medium text-gray-500" aria-label="★" />
                      </tr>

                    </thead>

                    <tbody>{visible.map((p) => <PlayerRow key={p.id} player={p} />)}</tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        <JogadoresFilterDrawer
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          jogadores={jogadores}
          value={filters}
          onChange={setFilters}
        />
      </section>
    </PageErrorBoundary>
  );
}