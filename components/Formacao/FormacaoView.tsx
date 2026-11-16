"use client";

import { Fragment, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, CircleAlert, EyeOff } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import type {
  AtletaElenco,
  ChanceNivel,
  ClubeComparado,
  DestinoDivisao,
  FormacaoResponse,
  Intervalo,
  VariavelAtleta,
} from "@/type/formacao";

const BASE_BLUE = "#334155";
const LOCALES: Record<string, string> = { pt: "pt-BR", en: "en-US", es: "es-ES" };

function preencher(texto: string, vars: Record<string, string | number>) {
  return texto.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

function useFormato() {
  const { locale } = useI18n();
  const loc = LOCALES[locale] ?? "pt-BR";
  const num = (x: number, casas = 0) =>
    new Intl.NumberFormat(loc, { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(x);
  const pct = (x: number, casas = 1) => `${num(x * 100, casas)}%`;
  const faixa = (i: Intervalo) => `${pct(i.inferior)} – ${pct(i.superior)}`;
  return { num, pct, faixa };
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
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
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

function Kpi({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string | string[] }) {
  const linhas = detalhe == null ? [] : Array.isArray(detalhe) ? detalhe : [detalhe];
  return (
    <div
      className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
      style={{ borderLeft: `3px solid ${BASE_BLUE}` }}
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{rotulo}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{valor}</p>
      {linhas.map((l) => (
        <p key={l} className="mt-0.5 text-xs tabular-nums text-slate-500">
          {l}
        </p>
      ))}
    </div>
  );
}

/** Barra com intervalo de 90% e ponto na chance. */
function BarraIntervalo({
  chance,
  intervalo,
  escala,
  destaque,
}: {
  chance: number;
  intervalo: Intervalo;
  escala: number;
  destaque?: boolean;
}) {
  const pos = (x: number) => `${Math.min(100, (x / escala) * 100)}%`;
  const cor = destaque ? BASE_BLUE : "#94a3b8";
  return (
    <div className="relative h-4 w-full min-w-[120px]">
      <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gray-100" />
      <div
        className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full"
        style={{
          left: pos(intervalo.inferior),
          width: `calc(${pos(intervalo.superior)} - ${pos(intervalo.inferior)})`,
          background: cor,
          opacity: 0.45,
        }}
      />
      <div
        className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
        style={{ left: pos(chance), background: cor }}
      />
    </div>
  );
}

/* ----------------------------- tabela por nível ----------------------------- */
function TabelaNiveis({ niveis, seuNivel }: { niveis: ChanceNivel[]; seuNivel: number }) {
  const { t } = useI18n();
  const f = useFormato();
  const tf = t.formacao;
  const escala = Math.max(...niveis.map((n) => n.intervalo90.superior)) * 1.1;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
            <th className="py-2 pr-3">{tf.colNivel}</th>
            <th className="py-2 pr-3">{tf.colDescricao}</th>
            <th className="py-2 pr-3 text-right">{tf.colConta}</th>
            <th className="py-2 pr-3 text-right">{tf.colChance}</th>
            <th className="py-2 pr-3">{tf.colIntervalo}</th>
            <th className="py-2">{tf.colTeste}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {niveis.map((n) => {
            const seu = n.nivel === seuNivel;
            const explica = preencher(tf.testeExplica, {
              est: n.teste.turmasEstimacao,
              tst: n.teste.turmasTeste,
            });
            return (
              <tr key={n.nivel} className={seu ? "bg-slate-50" : undefined}>
                <td className="py-2.5 pr-3">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ background: seu ? BASE_BLUE : "#94a3b8" }}
                    >
                      {n.nivel}
                    </span>
                    {seu ? (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                        {tf.seuNivel}
                      </span>
                    ) : null}
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-slate-700">
                  {tf.nivelDesc[String(n.nivel) as "1"]}
                </td>
                <td className="whitespace-nowrap py-2.5 pr-3 text-right tabular-nums text-slate-500">
                  {f.num(n.profissionais)} ÷ {f.num(n.atletas)}
                </td>
                <td className="py-2.5 pr-3 text-right font-semibold tabular-nums text-slate-900">
                  {f.pct(n.chance)}
                </td>
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-3">
                    <BarraIntervalo
                      chance={n.chance}
                      intervalo={n.intervalo90}
                      escala={escala}
                      destaque={seu}
                    />
                    <span className="whitespace-nowrap text-xs tabular-nums text-slate-500">
                      {f.faixa(n.intervalo90)}
                    </span>
                  </div>
                </td>
                <td className="py-2.5">
                  <span
                    title={`${explica} ${f.pct(n.teste.chanceEstimada)} · ${f.faixa(n.teste.intervaloObservado)}`}
                    className={[
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                      n.teste.aprovado
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700",
                    ].join(" ")}
                  >
                    {n.teste.aprovado ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <CircleAlert className="h-3.5 w-3.5" />
                    )}
                    {n.teste.aprovado ? tf.testeAprovado : tf.testeReprovado}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-slate-500">
        {preencher(tf.testeExplica, {
          est: niveis[0]?.teste.turmasEstimacao ?? "",
          tst: niveis[0]?.teste.turmasTeste ?? "",
        })}
      </p>
    </div>
  );
}

/* ----------------------------- clubes e destinos ----------------------------- */
function TabelaClubes({ clubes }: { clubes: ClubeComparado[] }) {
  const { t } = useI18n();
  const f = useFormato();
  const tf = t.formacao;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
            <th className="py-2 pr-3">{tf.colClube}</th>
            <th className="py-2 pr-3 text-right">{tf.colConta}</th>
            <th className="py-2 pr-3 text-right">{tf.colChance}</th>
            <th className="py-2 pr-3 text-right">{tf.colIntervalo}</th>
            <th className="py-2 text-right">{tf.colIdadeEstreia}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {clubes.map((c) => (
            <tr key={c.rotulo} className={c.ehSeuClube ? "bg-slate-50" : undefined}>
              <td className={["whitespace-nowrap py-2.5 pr-3", c.ehSeuClube ? "font-semibold text-slate-900" : "text-slate-600"].join(" ")}>
                {c.rotulo}
              </td>
              <td className="whitespace-nowrap py-2.5 pr-3 text-right tabular-nums text-slate-500">
                {f.num(c.profissionais)} ÷ {f.num(c.atletas)}
              </td>
              <td className="py-2.5 pr-3 text-right font-semibold tabular-nums text-slate-900">
                {f.pct(c.chance)}
              </td>
              <td className="whitespace-nowrap py-2.5 pr-3 text-right text-xs tabular-nums text-slate-500">
                {f.faixa(c.intervalo90)}
              </td>
              <td className="py-2.5 text-right tabular-nums text-slate-700">
                {c.idadeMediaEstreia == null ? "—" : f.num(c.idadeMediaEstreia, 1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Destinos({ destinos }: { destinos: DestinoDivisao[] }) {
  const f = useFormato();
  const max = Math.max(...destinos.map((d) => d.fracao), 0.01);
  return (
    <ul className="space-y-2.5">
      {destinos.map((d) => (
        <li key={d.divisao} className="grid grid-cols-[84px_1fr_88px] items-center gap-3 text-sm">
          <span className="text-slate-700">{d.divisao}</span>
          <div className="h-2.5 rounded-full bg-gray-100">
            <div
              className="h-2.5 rounded-full"
              style={{ width: `${(d.fracao / max) * 100}%`, background: BASE_BLUE }}
            />
          </div>
          <span className="text-right text-xs tabular-nums text-slate-500">
            {f.pct(d.fracao, 0)} · {f.num(d.profissionais)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ----------------------------- elenco ----------------------------- */
function valorVariavel(v: VariavelAtleta, campo: "bruto" | "usado" | "mediaNivel", sim: string, nao: string, f: ReturnType<typeof useFormato>) {
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
      <p className="text-xs font-semibold text-slate-800">{tf.detalheTitulo}</p>
      <p className="text-xs text-slate-600">
        {preencher(tf.detalheTexto, {
          corte: atleta.idadeCorte,
          limiar: f.num(cp.limiarSemelhanca * 100),
          min: cp.minimoCasos,
        })}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-xs">
          <thead>
            <tr className="text-left font-bold uppercase tracking-wide text-gray-500">
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
                    {tf.variaveis[v.chave as "gols90"] ?? v.chave}
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
      <ul className="space-y-1 text-xs text-slate-500">
        <li>{tf.encolhimento}</li>
        <li>{tf.corteOutlier}</li>
      </ul>
    </div>
  );
}

function CelulaParecidos({ atleta }: { atleta: AtletaElenco }) {
  const { t } = useI18n();
  const f = useFormato();
  const cp = atleta.casosParecidos;
  if (!cp.suficiente || cp.chance == null) {
    return (
      <span className="text-xs text-slate-400">
        {t.formacao.poucosCasos} · {f.num(cp.casos)}
      </span>
    );
  }
  return (
    <span className="inline-flex flex-col items-end">
      <span className="font-semibold tabular-nums text-slate-900">{f.pct(cp.chance)}</span>
      <span className="text-[11px] tabular-nums text-slate-500">
        {preencher(t.formacao.casosFmt, { k: f.num(cp.profissionais), n: f.num(cp.casos) })}
      </span>
    </span>
  );
}

function TabelaElenco({ elenco }: { elenco: AtletaElenco[] }) {
  const { t } = useI18n();
  const f = useFormato();
  const tf = t.formacao;
  const [aberto, setAberto] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
            <th className="py-2 pr-3">{tf.colAtleta}</th>
            <th className="py-2 pr-3 text-right">{tf.colIdade}</th>
            <th className="py-2 pr-3">{tf.colCategoria}</th>
            <th className="py-2 pr-3">{tf.colPosicao}</th>
            <th className="py-2 pr-3 text-right">{tf.colJogos}</th>
            <th className="py-2 pr-3 text-right">{tf.colMinutos}</th>
            <th className="py-2 pr-3 text-right">{tf.colGols}</th>
            <th className="py-2 pr-3 text-right">{tf.colChanceNivel}</th>
            <th className="py-2 pr-3 text-right">{tf.colParecidos}</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {elenco.map((a) => {
            const isOpen = aberto === a.id;
            return (
              <Fragment key={a.id}>
                <tr className="align-middle">
                  <td className="py-2.5 pr-3 font-medium text-slate-800">{a.nome}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-slate-700">{a.idade}</td>
                  <td className="py-2.5 pr-3 text-slate-600">{a.categoria}</td>
                  <td className="py-2.5 pr-3 text-slate-600">{a.posicao}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-slate-700">{f.num(a.jogos)}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-slate-700">{f.num(a.minutos)}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-slate-700">{f.num(a.gols)}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-slate-900">{f.pct(a.chanceNivel)}</td>
                  <td className="py-2.5 pr-3 text-right">
                    <CelulaParecidos atleta={a} />
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => setAberto(isOpen ? null : a.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-gray-50"
                      aria-expanded={isOpen}
                    >
                      {isOpen ? tf.fecharDetalhe : tf.verDetalhe}
                      {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  </td>
                </tr>
                {isOpen ? (
                  <tr>
                    <td colSpan={10} className="pb-4">
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
  );
}

/* ----------------------------- tela ----------------------------- */
export default function FormacaoView({ dados }: { dados: FormacaoResponse }) {
  const { t } = useI18n();
  const f = useFormato();
  const tf = t.formacao;
  const nivelSeu = dados.niveis.find((n) => n.nivel === dados.seuClube.nivel);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          rotulo={tf.kpiSeuClube}
          valor={dados.seuClube.nome}
          detalhe={`${tf.kpiNivel} ${dados.seuClube.nivel} · ${tf.nivelDesc[String(dados.seuClube.nivel) as "1"]}`}
        />
        <Kpi
          rotulo={tf.kpiChanceNivel}
          valor={nivelSeu ? f.pct(nivelSeu.chance) : "—"}
          detalhe={
            nivelSeu
              ? [
                  preencher(tf.kpiChanceConta, {
                    k: f.num(nivelSeu.profissionais),
                    n: f.num(nivelSeu.atletas),
                  }),
                  preencher(tf.kpiChanceIntervalo, {
                    inf: f.pct(nivelSeu.intervalo90.inferior),
                    sup: f.pct(nivelSeu.intervalo90.superior),
                  }),
                ]
              : undefined
          }
        />
        <Kpi rotulo={tf.kpiElenco} valor={f.num(dados.elenco.length)} />
        <Kpi rotulo={tf.kpiHistorico} valor={f.num(dados.totalHistorico)} />
      </div>

      <div className="space-y-1 text-xs text-slate-500">
        <p>
          {preencher(tf.definicao, {
            jogos: dados.definicaoProfissional.jogosMinimos,
            idade: dados.definicaoProfissional.idadeLimite,
          })}
        </p>
        <p>{tf.condicional}</p>
      </div>

      <Cartao titulo={tf.niveisTitulo} descricao={tf.niveisDesc}>
        <TabelaNiveis niveis={dados.niveis} seuNivel={dados.seuClube.nivel} />
      </Cartao>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Cartao
            titulo={`${tf.clubesTitulo} · ${tf.kpiNivel} ${dados.seuClube.nivel}`}
            descricao={tf.clubesDesc}
          >
            <TabelaClubes clubes={dados.clubesMesmoNivel} />
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

      <div className="flex items-start gap-3 rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-4">
        <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <div>
          <p className="text-sm font-semibold text-slate-700">{tf.foraTitulo}</p>
          <p className="mt-0.5 text-xs text-slate-500">{tf.foraTexto}</p>
        </div>
      </div>
    </div>
  );
}
