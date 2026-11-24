"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Columns3, Download, Instagram, Loader2 } from "lucide-react";

import type { Jogador, SeasonStats } from "@/type/jogador";
import PageTitle from "@/components/Atoms/PageTitle";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/app/auth/AuthContext";
import PlayerAvatar from "@/components/ui/PlayerAvatar";
import StarButton from "@/components/ui/StarButton";
import Radar from "@/components/ui/Radar";
import MiniPitch from "@/components/ui/MiniPitch";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { ContractBadge } from "@/components/Card";
import { useDashboardPdfExport } from "@/hooks/useDashboardPdfExport";
import { getPlayers } from "@/lib/client/playersStore";
import { ATRIBUTOS, media, parecidos, perfilDe } from "@/lib/ui/atributos";
import { corDoSetor } from "@/lib/ui/sector";
import { dataCurta, eurCompact, eurMi, intlLocale, mesesAte, num } from "@/lib/ui/format";

const PASSPORT_EU = "/assets/passaporte.svg";

function sumStats(all?: Record<string, SeasonStats> | null) {
  const acc = { gols: 0, assistencias: 0, partidas: 0 };
  if (!all) return acc;
  for (const s of Object.values(all)) {
    acc.gols += s?.gols ?? 0;
    acc.assistencias += s?.assistencias ?? 0;
    acc.partidas += s?.partidas ?? 0;
  }
  return acc;
}

function toYoutubeEmbed(url: string | null | undefined) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      if (u.pathname.startsWith("/embed/")) return url;
    }
    return null;
  } catch {
    return null;
  }
}

function posseFracao(p?: number | null) {
  if (typeof p !== "number" || !Number.isFinite(p)) return null;
  const f = p > 1 ? p / 100 : p;
  return Math.max(0, Math.min(1, f));
}

export default function PlayerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const L = intlLocale(locale);
  const f = t.ui.ficha;

  const [jogador, setJogador] = useState<Jogador | null>(null);
  const [todos, setTodos] = useState<Jogador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [season, setSeason] = useState<string>("todas");
  const { exportRef, exportPdf, exporting } = useDashboardPdfExport();

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/jogadores/${id}`, { cache: "no-store" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(res.status === 404 ? "404" : data.error || `HTTP ${res.status}`);
        }
        const data = await res.json().catch(() => ({}));
        if (!active) return;
        setJogador(((data as any)?.jogador ?? data) as Jogador);
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || "erro");
        setJogador(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    getPlayers()
      .then((all) => active && setTodos(all))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [id]);

  const perfil = useMemo(() => (jogador ? perfilDe(jogador) : null), [jogador]);
  const similares = useMemo(() => (jogador && todos.length ? parecidos(jogador, todos, 4) : []), [jogador, todos]);

  if (loading) return <FichaSkeleton />;

  if (error || !jogador) {
    return (
      <section className="mx-auto w-full max-w-[1200px]">
        <PageTitle base={t.nav.jogadores} title={f.naoEncontrado} crumbLabel={f.naoEncontrado} />
        <div className="surface mt-5 grid place-items-center px-6 py-16 text-center">
          <p className="max-w-md text-[15px] text-gray-600">
            {error === "404" || !error ? f.naoEncontradoTexto : `${t.detail.detalheTecnico}: ${error}`}
          </p>
          <Link href="/jogadores" className="btn btn-dark mt-5 no-underline">
            <ArrowLeft size={16} aria-hidden />
            {t.detail.voltar}
          </Link>
        </div>
      </section>
    );
  }

  const cor = corDoSetor(jogador.posicao);
  const pos = (t.positions as any)[jogador.posicao] ?? jogador.posicao;
  const valorEur = (Number(jogador.valorMercado) || 0) * 1e6;
  const posse = posseFracao(jogador.possePct);
  const valorClube = posse !== null ? valorEur * posse : null;
  const clube = jogador.clubeRef?.nome ?? jogador.clubeNome ?? null;
  const clubeLogo = jogador.clubeRef?.logoUrl ?? null;

  const stats = jogador.statsPorTemporada ?? null;
  const temStats = !!stats && Object.keys(stats).length > 0;
  const seasons = temStats ? Object.keys(stats!).sort((a, b) => Number(b) - Number(a)) : [];
  const s =
    temStats && season !== "todas"
      ? { gols: stats![season]?.gols ?? 0, assistencias: stats![season]?.assistencias ?? 0, partidas: stats![season]?.partidas ?? 0 }
      : sumStats(stats);
  const video = toYoutubeEmbed(jogador.videoUrl || jogador.youtubeUrl);

  const exportar = () =>
    void exportPdf({
      filename: `ficha-${jogador.nome.toLowerCase().replace(/\s+/g, "-")}.pdf`,
      format: "a4",
      orientation: "portrait",
      marginMm: 8,
      scale: 2,
      blockSelector: `[data-pdf-block="true"]`,
      header: { title: jogador.nome, subtitle: `${pos} · ${clube ?? ""}`, rightText: new Date().toISOString().slice(0, 10) },
      footer: { leftText: t.sidebar.appName, pageLabel: t.pdfExport.pagina, ofLabel: t.pdfExport.de },
    });

  const attrLabels = Object.fromEntries(ATRIBUTOS.map((a) => [a, (t.ui.compare.atributos as any)[a]])) as any;

  return (
    <section className="mx-auto w-full max-w-[1200px]">
      <PageTitle
        base={t.nav.jogadores}
        title={jogador.nome}
        crumbLabel={jogador.nome}
        actions={
          <>
            <Link href="/jogadores" className="btn btn-ghost no-underline" data-no-export="true">
              <ArrowLeft size={16} aria-hidden />
              {t.nav.jogadores}
            </Link>
            <Link href={`/comparar?ids=${jogador.id}`} className="btn btn-ghost no-underline" data-no-export="true">
              <Columns3 size={16} aria-hidden />
              {f.comparar}
            </Link>
            <button type="button" onClick={exportar} disabled={exporting} className="btn btn-dark cursor-pointer" data-no-export="true">
              {exporting ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Download size={16} aria-hidden />}
              {f.exportarFicha}
            </button>
          </>
        }
      />

      <div ref={exportRef} className="mt-5 space-y-4">
        {/* Cabeçalho do atleta */}
        <header data-pdf-block="true" className="relative overflow-hidden rounded-[18px] bg-[var(--night-1)] p-5 text-white sm:p-6">
          <svg aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-[320px] w-[320px] opacity-[0.07]" viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="70" stroke="white" strokeWidth="1.5" />
            <circle cx="100" cy="100" r="2.5" fill="white" />
            <line x1="0" y1="100" x2="200" y2="100" stroke="white" strokeWidth="1.5" />
          </svg>
          <div className="relative flex flex-col gap-5 md:flex-row md:items-center">
            <div className="relative">
              <PlayerAvatar nome={jogador.nome} posicao={jogador.posicao} imagemUrl={jogador.imagemUrl} size={104} rounded="xl" />
              {jogador.numeroCamisa ? (
                <span className="num absolute -bottom-2 -right-2 grid h-8 min-w-8 place-items-center rounded-full bg-white px-2 text-[13px] font-semibold text-[var(--ink)] shadow">
                  {jogador.numeroCamisa}
                </span>
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[13px] text-[var(--night-ink-2)]">
                <span className="sector-dot" style={{ background: cor, boxShadow: "0 0 0 2px var(--night-1)" }} aria-hidden />
                {pos}
                {jogador.nacionalidade ? <span>· {jogador.nacionalidade}</span> : null}
              </div>
              <h2 className="mt-1 truncate text-[30px] font-semibold leading-tight tracking-[-0.03em]">{jogador.nome}</h2>
              <div className="mt-3 flex flex-wrap gap-2 text-[12.5px]">
                {[
                  typeof jogador.idade === "number" ? `${jogador.idade} ${t.ui.common.anos}` : null,
                  jogador.anoNascimento ? `${jogador.anoNascimento}` : null,
                  jogador.peDominante ? (t.ui.pe as any)[jogador.peDominante] : null,
                  jogador.altura ? `${num(jogador.altura, L, 2)} m` : null,
                  jogador.situacao || null,
                ]
                  .filter(Boolean)
                  .map((x) => (
                    <span key={String(x)} className="rounded-full bg-white/[0.07] px-2.5 py-1 text-white/85 ring-1 ring-white/10">
                      {x}
                    </span>
                  ))}
              </div>
            </div>

            <div className="flex items-center gap-3 md:flex-col md:items-end">
              <div className="flex items-center gap-2.5 rounded-[12px] bg-white/[0.06] px-3 py-2 ring-1 ring-white/10">
                {clubeLogo ? (
                  <img src={clubeLogo} alt="" className="h-8 w-8 rounded-full bg-white object-contain" />
                ) : (
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-[13px] font-semibold">{(clube ?? "?")[0]}</span>
                )}
                <div className="leading-tight">
                  <p className="text-[11px] text-[var(--night-ink-2)]">{t.detail.clube}</p>
                  <p className="max-w-[200px] truncate text-[13px] font-medium">{clube ?? t.detail.clubeNaoInformado}</p>
                </div>
              </div>
              <div data-no-export="true" className="rounded-full bg-white/[0.06] ring-1 ring-white/10">
                <StarButton id={jogador.id} nome={jogador.nome} className="!text-white/70 hover:!bg-white/10 hover:!text-white" />
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Valor e direitos */}
          <article data-pdf-block="true" className="surface p-5 lg:col-span-2">
            <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-gray-950">{f.valorDireitos}</h3>
            <div className="mt-4 grid gap-5 sm:grid-cols-3">
              <Metric label={t.ui.compare.valor}>
                <AnimatedNumber value={valorEur || null} format={(n) => eurCompact(n, L)} />
              </Metric>
              <Metric label={t.ui.compare.posse}>
                {posse !== null ? <AnimatedNumber value={posse * 100} format={(n) => `${num(n, L, 0)}%`} /> : "—"}
              </Metric>
              <Metric label={f.valorClube} accent>
                {valorClube !== null ? <AnimatedNumber value={valorClube} format={(n) => eurCompact(n, L)} /> : "—"}
              </Metric>
            </div>

            {posse !== null ? (
              <div className="mt-5">
                <div className="flex h-2.5 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                  <div
                    className="h-full origin-left bg-[var(--accent)]"
                    style={{ width: `${posse * 100}%`, animation: "grow-x 800ms var(--ease-out-expo) both" }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-[12px] text-gray-500">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[var(--accent)]" aria-hidden />
                    {t.detail.clube} <span className="num font-medium text-gray-800">{num(posse * 100, L, 0)}%</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[var(--color-gray-300)]" aria-hidden />
                    {f.outros} <span className="num font-medium text-gray-800">{num((1 - posse) * 100, L, 0)}%</span>
                  </span>
                </div>
              </div>
            ) : null}

            <div className="mt-6 border-t border-[var(--hairline)] pt-5">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-[13px] font-medium text-gray-700">{f.contrato}</h4>
                <ContractBadge fim={jogador.contratoFim} />
              </div>
              <ContractTimeline inicio={jogador.contratoInicio} fim={jogador.contratoFim} />
            </div>
          </article>

          {/* Atributos + onde joga */}
          <article data-pdf-block="true" className="surface p-5">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-gray-950">{f.atributos}</h3>
              {perfil ? (
                <span className="text-[12px] text-gray-500">
                  {f.media} <span className="num text-[15px] font-semibold text-gray-950">{media(perfil)}</span>
                </span>
              ) : null}
            </div>
            {perfil ? (
              <div className="mt-2">
                <Radar series={[{ id: jogador.id, nome: jogador.nome, cor, perfil }]} labels={attrLabels} size={300} />
              </div>
            ) : null}
            <p className="mt-1 text-center text-[11.5px] text-gray-500">{t.ui.compare.notaAtributos}</p>
          </article>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <article data-pdf-block="true" className="surface p-5 lg:col-span-2">
            <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-gray-950">{f.dados}</h3>
            <dl className="mt-3 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              <Row label={t.detail.representacao} value={jogador.representacao} />
              <Row label={t.ui.compare.agencia} value={jogador.empresario && jogador.empresario !== jogador.representacao ? jogador.empresario : null} />
              <Row label={f.nacionalidade} value={jogador.nacionalidade} />
              <Row label={f.cidade} value={jogador.cidade} />
              <Row label={f.inicio + " · " + f.contrato.toLowerCase()} value={jogador.contratoInicio ? dataCurta(jogador.contratoInicio, L) : null} />
              <Row label={f.fim + " · " + f.contrato.toLowerCase()} value={jogador.contratoFim ? dataCurta(jogador.contratoFim, L) : null} />
              {user?.role === "ADMIN" && jogador.cpf ? (
                <Row
                  label={t.form.cpf}
                  value={String(jogador.cpf).replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, "$1.$2.$3-$4")}
                />
              ) : null}
              {jogador.passaporte?.europeu ? (
                <Row
                  label={t.detail.passaporteUE}
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <img src={PASSPORT_EU} alt="" className="h-4 w-4" />
                      {jogador.passaporte.pais}
                    </span>
                  }
                />
              ) : null}
              {jogador.selecao?.convocado ? (
                <Row
                  label={t.detail.selecao}
                  value={`${t.detail.convocado}${jogador.selecao.anos?.length ? ` (${jogador.selecao.anos.join(", ")})` : ""}${
                    jogador.selecao.categoria ? ` · ${jogador.selecao.categoria}` : ""
                  }`}
                />
              ) : null}
            </dl>
            {jogador.racionalProspecao || jogador.observacoes ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {jogador.racionalProspecao ? <Note title={f.racional} text={jogador.racionalProspecao} /> : null}
                {jogador.observacoes ? <Note title={f.observacoes} text={jogador.observacoes} /> : null}
              </div>
            ) : null}
          </article>

          <article data-pdf-block="true" className="surface p-5">
            <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-gray-950">{f.ondeJoga}</h3>
            <div className="mt-4">
              <MiniPitch posicao={jogador.posicao} label={pos} />
            </div>
            <p className="mt-3 text-center text-[13px] font-medium text-gray-700">{pos}</p>
          </article>
        </div>

        {temStats || video ? (
          <article data-pdf-block="true" className="surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-gray-950">{t.detail.resumo}</h3>
              {temStats ? (
                <label className="flex items-center gap-2 text-[13px] text-gray-600">
                  {t.form.temporada}
                  <select value={season} onChange={(e) => setSeason(e.target.value)} className="input !h-9 !w-auto cursor-pointer">
                    <option value="todas">{t.detail.todasTemporadas}</option>
                    {seasons.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
            <div className="mt-5 grid items-center gap-6 md:grid-cols-[1fr_1.3fr]">
              {temStats ? (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    [t.detail.gols, s.gols],
                    [t.detail.assistencias, s.assistencias],
                    [t.detail.partidas, s.partidas],
                  ].map(([label, v]) => (
                    <div key={String(label)} className="rounded-[12px] bg-[var(--surface-2)] p-4 text-center ring-1 ring-[var(--hairline)]">
                      <p className="num text-[28px] font-semibold tracking-[-0.03em] text-gray-950">{v as number}</p>
                      <p className="mt-0.5 text-[12px] text-gray-500">{label as string}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div />
              )}
              {video ? (
                <div className="aspect-video w-full overflow-hidden rounded-[12px] bg-black">
                  <iframe
                    className="block h-full w-full"
                    src={video}
                    title={jogador.nome}
                    frameBorder={0}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              ) : null}
            </div>
          </article>
        ) : null}

        {jogador.instagramHandle ? (
          <article data-pdf-block="true" className="surface p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[15px] font-semibold text-gray-950">Instagram</h3>
              <a
                href={`https://www.instagram.com/${jogador.instagramHandle.replace("@", "")}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost no-underline"
              >
                <Instagram size={16} aria-hidden />@{jogador.instagramHandle.replace("@", "")}
              </a>
            </div>
            {jogador.instagramPosts?.length ? (
              <div className="mt-4 grid grid-cols-3 gap-2.5">
                {jogador.instagramPosts.slice(0, 6).map((post, i) => (
                  <a key={i} href={post.href} target="_blank" rel="noopener noreferrer" className="group relative aspect-square overflow-hidden rounded-[12px] bg-[var(--surface-2)]">
                    {post.thumbUrl ? (
                      <img src={post.thumbUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
                    ) : null}
                  </a>
                ))}
              </div>
            ) : null}
          </article>
        ) : null}

        {similares.length ? (
          <section data-no-export="true" className="pt-2">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-gray-950">{f.parecidos}</h3>
                <p className="text-[13px] text-gray-500">{f.parecidosSub}</p>
              </div>
              <Link href={`/comparar?ids=${[jogador.id, ...similares.slice(0, 2).map((x) => x.id)].join(",")}`} className="btn btn-ghost no-underline">
                <Columns3 size={16} aria-hidden />
                {f.comparar}
              </Link>
            </div>
            <div className="stagger mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {similares.map((p) => (
                <Link key={p.id} href={`/jogadores/${p.id}`} className="surface surface-hover flex items-center gap-3 p-3 no-underline">
                  <PlayerAvatar nome={p.nome} posicao={p.posicao} imagemUrl={p.imagemUrl} size={40} />
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-gray-950">{p.nome}</p>
                    <p className="num truncate text-[12px] text-gray-500">
                      {p.idade} {t.ui.common.anos} · {eurMi(p.valorMercado, L)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}

function Metric({ label, children, accent = false }: { label: string; children: ReactNode; accent?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[12.5px] text-gray-500">{label}</p>
      <p
        className="num mt-1 truncate text-[28px] font-semibold leading-tight tracking-[-0.03em]"
        style={{ color: accent ? "var(--accent)" : "var(--ink)" }}
      >
        {children}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode | null | undefined }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--hairline)] py-2.5 text-[13px]">
      <dt className="text-gray-500">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium text-gray-900">{value}</dd>
    </div>
  );
}

function Note({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[12px] bg-[var(--surface-2)] p-3.5 ring-1 ring-[var(--hairline)]">
      <p className="text-[12px] font-medium text-gray-500">{title}</p>
      <p className="mt-1 text-[13px] leading-5 text-gray-800">{text}</p>
    </div>
  );
}

function ContractTimeline({ inicio, fim }: { inicio?: string | null; fim?: string | null }) {
  const { t, locale } = useI18n();
  const L = intlLocale(locale);
  const f = t.ui.ficha;
  const [now] = useState(() => Date.now());
  if (!inicio || !fim) return <p className="mt-3 text-[13px] text-gray-500">{f.semContrato}</p>;
  const a = new Date(inicio).getTime();
  const b = new Date(fim).getTime();
  const pct = b > a ? Math.max(0, Math.min(1, (now - a) / (b - a))) : 1;
  const m = mesesAte(fim) ?? 0;
  const tone = m < 0 || m <= 6 ? "var(--bad)" : m <= 12 ? "var(--warn)" : "var(--accent)";
  return (
    <div className="mt-4">
      <div className="relative h-2 rounded-full bg-[var(--surface-sunken)]">
        <div
          className="absolute inset-y-0 left-0 origin-left rounded-full"
          style={{ width: `${pct * 100}%`, background: tone, animation: "grow-x 800ms var(--ease-out-expo) both" }}
        />
        <span
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left: `${pct * 100}%`, background: tone }}
          aria-hidden
        />
      </div>
      <div className="num mt-2.5 flex items-center justify-between text-[12px] text-gray-500">
        <span>{dataCurta(inicio, L)}</span>
        <span className="text-gray-700">
          {m >= 0 ? `${f.restam} ${m} ${t.ui.common.meses}` : t.ui.common.vencido}
        </span>
        <span>{dataCurta(fim, L)}</span>
      </div>
    </div>
  );
}

function FichaSkeleton() {
  return (
    <section className="mx-auto w-full max-w-[1200px]" aria-busy="true">
      <div className="skeleton h-4 w-40" />
      <div className="skeleton mt-3 h-8 w-72" />
      <div className="mt-8 h-[168px] rounded-[18px] bg-[var(--night-1)] opacity-90" />
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="surface h-[300px] p-5 lg:col-span-2">
          <div className="skeleton h-4 w-32" />
          <div className="mt-6 grid grid-cols-3 gap-5">
            <div className="skeleton h-10" />
            <div className="skeleton h-10" />
            <div className="skeleton h-10" />
          </div>
        </div>
        <div className="surface h-[300px] p-5">
          <div className="skeleton mx-auto mt-6 h-48 w-48 !rounded-full" />
        </div>
      </div>
    </section>
  );
}
