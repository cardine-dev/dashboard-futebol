"use client";

import { Fragment, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  EyeOff,
  Minus,
} from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import type { Translations } from "@/locales";
import type {
  AtletaElenco,
  ChanceNivel,
  ClubeComparado,
  DestinoDivisao,
  FormacaoResponse,
  Intervalo,
  VariavelAtleta,
} from "@/type/formacao";

/** Cor de destaque do app (slate-700) e cinza de contexto (slate-400). */
const DESTAQUE = "var(--accent)";
const CONTEXTO = "var(--color-gray-400)";
const LOCALES: Record<string, string> = { pt: "pt-BR", en: "en-US", es: "es-ES" };

type TF = Translations["formacao"];
type Destino = keyof TF["destinoNome"];
type NivelChave = keyof TF["nivelDesc"];

function preencher(texto: string, vars: Record<string, string | number>) {
  return texto.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

/** Preenche um texto do dicionário trocando chaves por nós (destaques) e "\n" por quebra de linha. */
function Rico({
  texto,
  vars = {},
  nos = {},
}: {
  texto: string;
  vars?: Record<string, string | number>;
  nos?: Record<string, React.ReactNode>;
}) {
  return (
    <>
      {texto.split("\n").map((linha, i) => (
        <Fragment key={i}>
          {i > 0 ? <br /> : null}
          {linha.split(/(\{\w+\})/g).map((parte, j) => {
            const m = parte.match(/^\{(\w+)\}$/);
            if (!m) return <Fragment key={j}>{parte}</Fragment>;
            if (m[1] in nos) return <Fragment key={j}>{nos[m[1]]}</Fragment>;
            return <Fragment key={j}>{String(vars[m[1]] ?? parte)}</Fragment>;
          })}
        </Fragment>
      ))}
    </>
  );
}

function useFormato() {
  const { locale } = useI18n();
  const loc = LOCALES[locale] ?? "pt-BR";
  const num = (x: number, casas = 0) =>
    new Intl.NumberFormat(loc, { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(x);
  const pct = (x: number, casas = 1) => `${num(x * 100, casas)}%`;
  const faixa = (i: Intervalo) => `${pct(i.inferior)} – ${pct(i.superior)}`;
  /** Chance como "x de cada 100": inteiro a partir de 10, uma casa abaixo disso. */
  const cada100 = (p: number) => {
    const v = p * 100;
    return new Intl.NumberFormat(loc, {
      minimumFractionDigits: 0,
      maximumFractionDigits: v >= 10 ? 0 : 1,
    }).format(v);
  };
  return { num, pct, faixa, cada100 };
}

/* ----------------------------- comparação ----------------------------- */
type Comparacao = "acima" | "abaixo" | "igual";

/** Compara na mesma precisão em que o número aparece (décimo de ponto percentual). */
function comparar(x: number, ref: number): Comparacao {
  const a = Math.round(x * 1000);
  const b = Math.round(ref * 1000);
  if (a === b) return "igual";
  return a > b ? "acima" : "abaixo";
}

const ESTILO_COMPARACAO: Record<Comparacao, { selo: string; caixa: string; Icone: typeof Minus }> = {
  acima: { selo: "bg-emerald-50 text-emerald-700", caixa: "bg-emerald-50 text-emerald-800", Icone: ArrowUpRight },
  abaixo: { selo: "bg-orange-50 text-orange-700", caixa: "bg-orange-50 text-orange-800", Icone: ArrowDownRight },
  igual: { selo: "bg-slate-100 text-slate-600", caixa: "bg-slate-50 text-slate-700", Icone: Minus },
};

function SeloComparacao({ c, rotulo }: { c: Comparacao; rotulo: string }) {
  const { selo, Icone } = ESTILO_COMPARACAO[c];
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${selo}`}
    >
      <Icone className="h-3.5 w-3.5" />
      {rotulo}
    </span>
  );
}

/* ----------------------------- blocos ----------------------------- */
function Cartao({
  titulo,
  descricao,
  children,
  direita,
}: {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
  direita?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden surface">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-100 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">{titulo}</h2>
          {descricao ? <p className="mt-0.5 text-xs text-slate-500">{descricao}</p> : null}
        </div>
        {direita}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

/** Valor "x de cada 100" com a porcentagem menor ao lado. */
function Cada100({ p, forte }: { p: number; forte?: boolean }) {
  const { t } = useI18n();
  const f = useFormato();
  return (
    <span className="whitespace-nowrap text-sm">
      <span className={forte ? "font-semibold text-slate-900" : "font-medium text-slate-700"}>
        {preencher(t.formacao.cada100, { x: f.cada100(p) })}
      </span>{" "}
      <span className="text-xs text-slate-500">{f.pct(p)}</span>
    </span>
  );
}

/* ----------------------------- destaque principal ----------------------------- */
function Destaque({ dados }: { dados: FormacaoResponse }) {
  const { t } = useI18n();
  const f = useFormato();
  const tf = t.formacao;
  const nivel = dados.seuClube.nivel;
  const seu = dados.niveis.find((n) => n.nivel === nivel);
  if (!seu) return null;

  const comparados = Array.from(new Set([1, nivel, 5]))
    .map((n) => dados.niveis.find((x) => x.nivel === n))
    .filter((n): n is ChanceNivel => Boolean(n));
  const max = Math.max(...comparados.map((n) => n.chance), 0.01);

  return (
    <section className="surface">
      <div className="grid grid-cols-1 gap-8 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-gray-500">
            {dados.seuClube.nome} · {preencher(tf.nivelN, { n: nivel })} ·{" "}
            {tf.nivelDesc[String(nivel) as NivelChave]}
          </p>
          <p className="mt-3 text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl">
            <Rico
              texto={tf.heroFrase}
              nos={{
                x: (
                  <span className="num text-5xl font-semibold leading-none tracking-[-0.04em]" style={{ color: DESTAQUE }}>
                    {f.cada100(seu.chance)}
                  </span>
                ),
              }}
            />
          </p>
          <div className="mt-4 space-y-0.5 text-sm">
            <p className="text-slate-700">
              {preencher(tf.heroConta, {
                k: f.num(seu.profissionais),
                n: f.num(seu.atletas),
                pct: f.pct(seu.chance),
              })}
            </p>
            <p className="text-slate-500">
              {preencher(tf.heroIntervalo, {
                inf: f.pct(seu.intervalo90.inferior),
                sup: f.pct(seu.intervalo90.superior),
              })}
            </p>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            {preencher(tf.elencoQtd, { n: f.num(dados.elenco.length) })} ·{" "}
            {preencher(tf.historicoQtd, { n: f.num(dados.totalHistorico) })}
          </p>
        </div>

        <div className="lg:border-l lg:border-[var(--hairline)] lg:pl-8">
          <p className="text-[12px] font-medium text-gray-500">{tf.heroComparaTitulo}</p>
          <ul className="mt-4 space-y-4">
            {comparados.map((n) => {
              const ehSeu = n.nivel === nivel;
              return (
                <li
                  key={n.nivel}
                  title={`${preencher(tf.contaIntervalo, {
                    k: f.num(n.profissionais),
                    n: f.num(n.atletas),
                    inf: f.pct(n.intervalo90.inferior),
                    sup: f.pct(n.intervalo90.superior),
                  })}`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span
                      className={`whitespace-nowrap text-sm ${ehSeu ? "font-semibold text-slate-900" : "text-slate-600"}`}
                      title={tf.nivelDesc[String(n.nivel) as NivelChave]}
                    >
                      {ehSeu ? `${tf.seuNivel} (${n.nivel})` : preencher(tf.nivelN, { n: n.nivel })}
                    </span>
                    <Cada100 p={n.chance} forte={ehSeu} />
                  </div>
                  <div className="mt-1.5 h-2.5">
                    <div
                      className="h-2.5 rounded-r"
                      style={{
                        width: `${Math.max(1.5, (n.chance / max) * 100)}%`,
                        background: ehSeu ? DESTAQUE : CONTEXTO,
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- chance por nível ----------------------------- */
function NiveisBarras({ niveis, seuNivel }: { niveis: ChanceNivel[]; seuNivel: number }) {
  const { t } = useI18n();
  const f = useFormato();
  const tf = t.formacao;
  const max = Math.max(...niveis.map((n) => n.chance), 0.01);

  return (
    <ul className="-mx-5 divide-y divide-gray-100">
      {niveis.map((n) => {
        const seu = n.nivel === seuNivel;
        const teste = preencher(tf.testeTooltip, {
          est: n.teste.turmasEstimacao,
          tst: n.teste.turmasTeste,
          estimada: f.pct(n.teste.chanceEstimada),
          obs: f.faixa(n.teste.intervaloObservado),
        });
        return (
          <li
            key={n.nivel}
            className={[
              "grid grid-cols-1 gap-2 px-5 py-3 lg:grid-cols-[320px_minmax(0,1fr)_320px] lg:items-center lg:gap-5",
              seu ? "bg-slate-50" : "",
            ].join(" ")}
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={
                  seu
                    ? { background: DESTAQUE, color: "var(--accent-ink)" }
                    : { background: "var(--surface-sunken)", color: "var(--ink-2)", boxShadow: "inset 0 0 0 1px var(--hairline)" }
                }
              >
                {n.nivel}
              </span>
              <span className={`text-sm ${seu ? "font-semibold text-slate-900" : "text-slate-700"}`}>
                {tf.nivelDesc[String(n.nivel) as NivelChave]}
              </span>
              {seu ? (
                <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                  {tf.seuNivel}
                </span>
              ) : null}
            </div>

            <div
              className="flex items-center gap-3"
              title={preencher(tf.contaIntervalo, {
                k: f.num(n.profissionais),
                n: f.num(n.atletas),
                inf: f.pct(n.intervalo90.inferior),
                sup: f.pct(n.intervalo90.superior),
              })}
            >
              <div className="h-3 min-w-[80px] flex-1">
                <div
                  className="h-3 rounded-r"
                  style={{
                    width: `${Math.max(1.5, (n.chance / max) * 100)}%`,
                    background: seu ? DESTAQUE : CONTEXTO,
                  }}
                />
              </div>
              <span className="w-[150px] shrink-0">
                <Cada100 p={n.chance} forte={seu} />
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 lg:justify-end">
              <span className="whitespace-nowrap tabular-nums">
                {preencher(tf.contaIntervalo, {
                  k: f.num(n.profissionais),
                  n: f.num(n.atletas),
                  inf: f.pct(n.intervalo90.inferior),
                  sup: f.pct(n.intervalo90.superior),
                })}
              </span>
              {n.teste.aprovado ? (
                <span title={teste} className="inline-flex items-center gap-1 whitespace-nowrap text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {tf.testeAprovado}
                </span>
              ) : (
                <span
                  title={teste}
                  className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700"
                >
                  <CircleAlert className="h-3.5 w-3.5" />
                  {tf.testeReprovado}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ----------------------------- clubes do mesmo nível ----------------------------- */
function Clubes({ clubes, mediaNivel }: { clubes: ClubeComparado[]; mediaNivel: number }) {
  const { t } = useI18n();
  const f = useFormato();
  const tf = t.formacao;
  const seu = clubes.find((c) => c.ehSeuClube);
  const max = Math.max(...clubes.map((c) => c.chance), mediaNivel, 0.01) * 1.1;
  const pos = (x: number) => `${Math.min(100, (x / max) * 100)}%`;
  const comp = seu ? comparar(seu.chance, mediaNivel) : null;
  const resumo =
    comp === "acima" ? tf.clubesResumoAcima : comp === "abaixo" ? tf.clubesResumoAbaixo : tf.clubesResumoIgual;

  return (
    <div className="space-y-4">
      {seu && comp ? (
        <div className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${ESTILO_COMPARACAO[comp].caixa}`}>
          {(() => {
            const Icone = ESTILO_COMPARACAO[comp].Icone;
            return <Icone className="mt-0.5 h-4 w-4 shrink-0" />;
          })()}
          <p>
            {preencher(resumo, {
              k: f.num(seu.profissionais),
              n: f.num(seu.atletas),
              x: f.cada100(seu.chance),
              m: f.cada100(mediaNivel),
            })}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm" style={{ background: DESTAQUE }} />
          {tf.legSeuClube}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm" style={{ background: CONTEXTO }} />
          {tf.legOutrosClubes}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3.5 w-0.5 bg-slate-900" />
          {tf.legMediaNivel}: {preencher(tf.cada100, { x: f.cada100(mediaNivel) })}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="text-left text-[11px] font-bold text-gray-500">
              <th className="py-2 pr-4">{tf.colClube}</th>
              <th className="py-2 pr-4" colSpan={2}>
                {tf.colChance}
              </th>
              <th className="min-w-[104px] py-2 text-right">{tf.colIdadeEstreia}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clubes.map((c) => (
              <tr
                key={c.rotulo}
                className={c.ehSeuClube ? "bg-slate-50" : undefined}
                title={preencher(tf.intervaloTooltip, {
                  inf: f.pct(c.intervalo90.inferior),
                  sup: f.pct(c.intervalo90.superior),
                })}
              >
                <td
                  className={[
                    "whitespace-nowrap py-2.5 pr-4",
                    c.ehSeuClube ? "font-semibold text-slate-900" : "text-slate-600",
                  ].join(" ")}
                >
                  {c.rotulo}
                </td>
                <td className="w-full min-w-[120px] py-2.5 pr-4">
                  <div className="relative h-3">
                    <div
                      className="absolute inset-y-0 left-0 rounded-r"
                      style={{ width: pos(c.chance), background: c.ehSeuClube ? DESTAQUE : CONTEXTO }}
                    />
                    <div
                      className="absolute w-0.5 bg-slate-900"
                      style={{ left: pos(mediaNivel), top: -5, bottom: -5 }}
                    />
                  </div>
                </td>
                <td className="whitespace-nowrap py-2.5 pr-4 text-right">
                  <div
                    className={
                      c.ehSeuClube ? "text-sm font-semibold text-slate-900" : "text-sm font-medium text-slate-700"
                    }
                  >
                    {preencher(tf.cada100, { x: f.cada100(c.chance) })}
                  </div>
                  <div className="text-xs tabular-nums text-slate-500">
                    {preencher(tf.contaPct, {
                      k: f.num(c.profissionais),
                      n: f.num(c.atletas),
                      pct: f.pct(c.chance),
                    })}
                  </div>
                </td>
                <td className="py-2.5 text-right tabular-nums text-slate-700">
                  {c.idadeMediaEstreia == null ? "—" : f.num(c.idadeMediaEstreia, 1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ----------------------------- destinos ----------------------------- */
function Destinos({ destinos }: { destinos: DestinoDivisao[] }) {
  const { t } = useI18n();
  const f = useFormato();
  const tf = t.formacao;
  const max = Math.max(...destinos.map((d) => d.fracao), 0.01);

  // Menor conjunto de destinos que soma pelo menos dois terços dos profissionais.
  const ordenados = [...destinos].sort((a, b) => b.fracao - a.fracao);
  const maioria = new Set<string>();
  let acumulado = 0;
  for (const d of ordenados) {
    if (acumulado >= 2 / 3 || d.fracao <= 0) break;
    maioria.add(d.divisao);
    acumulado += d.fracao;
  }
  const nomes = destinos
    .filter((d) => maioria.has(d.divisao))
    .map((d) => tf.destinoEm[d.divisao as Destino] ?? d.divisao);
  const lista =
    nomes.length <= 1
      ? nomes.join("")
      : `${nomes.slice(0, -1).join(", ")} ${tf.ou} ${nomes[nomes.length - 1]}`;

  return (
    <div className="space-y-4">
      {nomes.length ? (
        <p className="text-sm text-slate-700">
          {preencher(tf.destinosResumo, { lista, pct: f.pct(acumulado, 0) })}
        </p>
      ) : null}
      <ul className="space-y-2.5">
        {destinos.map((d) => {
          const forte = maioria.has(d.divisao);
          return (
            <li key={d.divisao} className="grid grid-cols-[96px_1fr_72px] items-center gap-3 text-sm">
              <span className={forte ? "font-medium text-slate-900" : "text-slate-600"}>
                {tf.destinoNome[d.divisao as Destino] ?? d.divisao}
              </span>
              <div className="h-2.5">
                <div
                  className="h-2.5 rounded-r"
                  style={{
                    width: `${Math.max(1.5, (d.fracao / max) * 100)}%`,
                    background: forte ? DESTAQUE : CONTEXTO,
                  }}
                />
              </div>
              <span className="text-right text-xs tabular-nums text-slate-500">
                {f.pct(d.fracao, 0)} · {f.num(d.profissionais)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ----------------------------- elenco ----------------------------- */
function valorVariavel(
  v: VariavelAtleta,
  campo: "bruto" | "usado" | "mediaNivel",
  sim: string,
  nao: string,
  f: ReturnType<typeof useFormato>,
) {
  const x = v[campo];
  switch (v.chave) {
    case "fracMinutos":
    case "fracTitular":
    case "fracAcimaIdade":
      return f.pct(x, 0);
    case "gols90":
    case "cartoes90":
      return f.num(x, 2);
    case "continuidade":
      return campo === "mediaNivel" ? f.num(x, 1) : f.num(x, 0);
    case "subiuCategoria":
      return campo === "mediaNivel" ? f.pct(x, 0) : x >= 0.5 ? sim : nao;
    default:
      return f.num(x, 2);
  }
}

function DetalheAtleta({ atleta }: { atleta: AtletaElenco }) {
  const { t } = useI18n();
  const f = useFormato();
  const tf = t.formacao;
  const cp = atleta.casosParecidos;
  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm font-medium text-slate-800">
        {preencher(tf.detalheJogos, {
          jogos: f.num(atleta.jogos),
          minutos: f.num(atleta.minutos),
          gols: f.num(atleta.gols),
        })}
      </p>
      <p className="text-xs text-slate-600">
        {preencher(tf.detalheCorte, {
          corte: atleta.idadeCorte,
          limiar: f.num(cp.limiarSemelhanca * 100),
        })}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-xs">
          <thead>
            <tr className="text-left font-bold text-gray-500">
              <th className="py-1.5 pr-3">{tf.colVariavel}</th>
              <th className="py-1.5 pr-3 text-right">{tf.colValorBruto}</th>
              <th className="py-1.5 pr-3 text-right">{tf.colValorUsado}</th>
              <th className="py-1.5 pr-3 text-right">{tf.colMediaNivel}</th>
              <th className="py-1.5 text-right">{tf.colDesvios}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {atleta.variaveis.map((v) => {
              const ajustado = Math.abs(v.bruto - v.usado) > 0.05 * Math.max(1e-6, Math.abs(v.bruto));
              return (
                <tr key={v.chave}>
                  <td className="py-1.5 pr-3 text-slate-700">
                    {tf.variaveis[v.chave as keyof TF["variaveis"]] ?? v.chave}
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-slate-600">
                    {valorVariavel(v, "bruto", tf.sim, tf.nao, f)}
                  </td>
                  <td
                    className={[
                      "py-1.5 pr-3 text-right tabular-nums",
                      ajustado ? "font-semibold text-amber-700" : "text-slate-600",
                    ].join(" ")}
                  >
                    {valorVariavel(v, "usado", tf.sim, tf.nao, f)}
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-slate-500">
                    {valorVariavel(v, "mediaNivel", tf.sim, tf.nao, f)}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-slate-600">
                    {v.z > 0 ? "+" : ""}
                    {f.num(v.z, 1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LegendaElenco({ chanceNivel }: { chanceNivel: number }) {
  const { t } = useI18n();
  const f = useFormato();
  const tf = t.formacao;
  return (
    <div className="mb-4 space-y-2 rounded-xl bg-gray-50 px-4 py-3">
      <p className="text-sm text-slate-700">
        {preencher(tf.elencoChanceNivel, { x: f.cada100(chanceNivel) })}
      </p>
      <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-xs text-slate-600 md:grid-cols-2">
        <li className="flex items-start gap-2">
          <SeloComparacao c="acima" rotulo={tf.seloAcima} />
          <span className="pt-0.5">{tf.legAcima}</span>
        </li>
        <li className="flex items-start gap-2">
          <SeloComparacao c="abaixo" rotulo={tf.seloAbaixo} />
          <span className="pt-0.5">{tf.legAbaixo}</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="whitespace-nowrap rounded-full bg-white px-2 py-0.5 font-semibold text-slate-400 ring-1 ring-gray-200">
            {tf.legPoucosRotulo}
          </span>
          <span className="pt-0.5">{tf.legPoucos}</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
            {tf.referencia}
          </span>
          <span className="pt-0.5">{tf.legReferencia}</span>
        </li>
      </ul>
    </div>
  );
}

function CelulaParecidos({ atleta }: { atleta: AtletaElenco }) {
  const { t } = useI18n();
  const f = useFormato();
  const tf = t.formacao;
  const cp = atleta.casosParecidos;
  if (!cp.suficiente || cp.chance == null) {
    return (
      <div className="whitespace-nowrap text-sm text-slate-400">
        <p>{tf.poucosCasos}</p>
        <p className="text-xs">{preencher(tf.poucosCasosN, { n: f.num(cp.casos) })}</p>
      </div>
    );
  }
  return (
    <div className="whitespace-nowrap">
      <p className="text-sm text-slate-700">
        <Rico
          texto={tf.parecidosFrase}
          nos={{ x: <span className="text-base font-semibold text-slate-900">{f.cada100(cp.chance)}</span> }}
        />
      </p>
      <p className="text-xs tabular-nums text-slate-500">
        {preencher(tf.parecidosConta, {
          k: f.num(cp.profissionais),
          n: f.num(cp.casos),
          pct: f.pct(cp.chance),
        })}
      </p>
    </div>
  );
}

function TabelaElenco({ elenco }: { elenco: AtletaElenco[] }) {
  const { t } = useI18n();
  const tf = t.formacao;
  const [aberto, setAberto] = useState<string | null>(null);
  const chanceNivel = elenco[0]?.chanceNivel ?? 0;

  const ordenado = useMemo(() => {
    const ok = (a: AtletaElenco) => a.casosParecidos.suficiente && a.casosParecidos.chance != null;
    return [...elenco].sort((a, b) => {
      if (ok(a) !== ok(b)) return ok(a) ? -1 : 1;
      if (ok(a)) {
        const d = (b.casosParecidos.chance ?? 0) - (a.casosParecidos.chance ?? 0);
        if (d !== 0) return d;
      }
      return b.casosParecidos.casos - a.casosParecidos.casos;
    });
  }, [elenco]);

  return (
    <div>
      <LegendaElenco chanceNivel={chanceNivel} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-[11px] font-bold text-gray-500">
              <th className="py-2 pr-4">{tf.colAtleta}</th>
              <th className="py-2 pr-4">{tf.colParecidos}</th>
              <th className="whitespace-nowrap py-2 pr-4">{tf.colComparacao}</th>
              <th className="w-full py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ordenado.map((a) => {
              const isOpen = aberto === a.id;
              const cp = a.casosParecidos;
              const comp = cp.suficiente && cp.chance != null ? comparar(cp.chance, a.chanceNivel) : null;
              const rotulo =
                comp === "acima" ? tf.seloAcima : comp === "abaixo" ? tf.seloAbaixo : tf.seloIgual;
              return (
                <Fragment key={a.id}>
                  <tr className="align-middle">
                    <td className="py-3 pr-4">
                      <p className="whitespace-nowrap font-medium text-slate-800">{a.nome}</p>
                      <p className="whitespace-nowrap text-xs text-slate-500">
                        {preencher(tf.atletaSub, { idade: a.idade, categoria: a.categoria, posicao: a.posicao })}
                      </p>
                    </td>
                    <td className="py-3 pr-8">
                      <CelulaParecidos atleta={a} />
                    </td>
                    <td className="py-3 pr-4">
                      {comp ? <SeloComparacao c={comp} rotulo={rotulo} /> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setAberto(isOpen ? null : a.id)}
                        className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-gray-50"
                        aria-expanded={isOpen}
                      >
                        {isOpen ? tf.fecharDetalhe : tf.verDetalhe}
                        {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </td>
                  </tr>
                  {isOpen ? (
                    <tr>
                      <td colSpan={4} className="pb-4">
                        <DetalheAtleta atleta={a} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ----------------------------- como ler ----------------------------- */
function ComoLer({ dados }: { dados: FormacaoResponse }) {
  const { t } = useI18n();
  const f = useFormato();
  const tf = t.formacao;
  const teste = dados.niveis[0]?.teste;
  const cp = dados.elenco[0]?.casosParecidos;
  const itens = [
    tf.lerCada100,
    preencher(tf.lerDefinicao, {
      jogos: dados.definicaoProfissional.jogosMinimos,
      idade: dados.definicaoProfissional.idadeLimite,
    }),
    tf.lerCondicional,
    tf.lerIntervalo,
    preencher(tf.lerTeste, { est: teste?.turmasEstimacao ?? "", tst: teste?.turmasTeste ?? "" }),
    preencher(tf.lerCasos, {
      limiar: f.num((cp?.limiarSemelhanca ?? 0.9) * 100),
      min: cp?.minimoCasos ?? 20,
    }),
    tf.lerEncolhimento,
    tf.lerCorte,
  ];
  return (
    <details className="group overflow-hidden surface">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
          <BookOpen className="h-4 w-4 text-slate-500" />
          {tf.comoLerTitulo}
        </span>
        <ChevronDown className="h-4 w-4 text-slate-500 transition group-open:rotate-180" />
      </summary>
      <ul className="list-disc space-y-2 border-t border-gray-100 py-4 pl-10 pr-5 text-sm text-slate-600 marker:text-slate-300">
        {itens.map((texto) => (
          <li key={texto}>{texto}</li>
        ))}
      </ul>
    </details>
  );
}

/* ----------------------------- tela ----------------------------- */
export default function FormacaoView({ dados }: { dados: FormacaoResponse }) {
  const { t } = useI18n();
  const tf = t.formacao;
  const nivelSeu = dados.niveis.find((n) => n.nivel === dados.seuClube.nivel);

  return (
    <div className="space-y-6">
      <Destaque dados={dados} />

      <Cartao titulo={tf.niveisTitulo} descricao={tf.niveisDesc}>
        <NiveisBarras niveis={dados.niveis} seuNivel={dados.seuClube.nivel} />
      </Cartao>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Cartao
            titulo={`${tf.clubesTitulo} · ${preencher(tf.nivelN, { n: dados.seuClube.nivel })}`}
            descricao={tf.clubesDesc}
          >
            <Clubes clubes={dados.clubesMesmoNivel} mediaNivel={nivelSeu?.chance ?? 0} />
          </Cartao>
        </div>
        <div className="lg:col-span-2">
          <Cartao titulo={tf.destinosTitulo}>
            <Destinos destinos={dados.destinosNivel} />
          </Cartao>
        </div>
      </div>

      <Cartao
        titulo={tf.elencoTitulo}
        descricao={tf.elencoDesc}
        direita={
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            {tf.referencia}
          </span>
        }
      >
        <TabelaElenco elenco={dados.elenco} />
      </Cartao>

      <ComoLer dados={dados} />

      <p className="flex items-start gap-1.5 text-xs text-slate-400">
        <EyeOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          <span className="font-semibold text-slate-500">{tf.foraTitulo}.</span> {tf.foraTexto}
        </span>
      </p>
    </div>
  );
}
