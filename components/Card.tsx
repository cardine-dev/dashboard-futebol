"use client";

import type { Jogador } from "../type/jogador";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/contexts/I18nContext";
import PlayerAvatar from "@/components/ui/PlayerAvatar";
import StarButton from "@/components/ui/StarButton";
import { corDoSetor } from "@/lib/ui/sector";
import { eurMi, intlLocale, mesesAte, num } from "@/lib/ui/format";

type Props = { player: Jogador; onClick?: (id: string) => void };

/** Selo de contrato: só aparece quando pede atenção (vence em até 12 meses). */
export function ContractBadge({ fim, compact = false }: { fim?: string | null; compact?: boolean }) {
  const { t } = useI18n();
  const m = mesesAte(fim);
  if (m === null || m > 12) return null;
  const vencido = m < 0;
  const urgente = m <= 6;
  const tone = vencido || urgente ? "var(--bad)" : "var(--warn)";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap"
      style={{
        color: tone,
        background: `color-mix(in oklab, ${tone} 9%, white)`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${tone} 22%, transparent)`,
      }}
      title={fim ? new Date(fim).toLocaleDateString() : undefined}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone }} aria-hidden />
      {vencido ? t.ui.common.vencido : compact ? `${m} ${t.ui.common.meses}` : `${t.ui.common.vence} ${m} ${t.ui.common.meses}`}
    </span>
  );
}

export default function Card({ player, onClick }: Props) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const L = intlLocale(locale);
  const cor = corDoSetor(player.posicao);

  const hasPosse = typeof player.possePct === "number" && Number.isFinite(player.possePct);
  const posse = hasPosse ? Math.max(0, Math.min(100, player.possePct as number)) : null;
  const temValor = Number(player.valorMercado) > 0;
  const clube = player.clubeRef?.nome ?? player.clubeNome ?? null;
  const agencia = player.representacao ?? null;
  const pos = (t.positions as any)[player.posicao] ?? player.posicao;

  const meta = [
    typeof player.idade === "number" ? `${player.idade} ${t.ui.common.anos}` : null,
    player.peDominante ? ((t.ui.pe as any)[player.peDominante] ?? null) : null,
    player.altura ? `${num(player.altura, L, 2)} m` : null,
  ].filter(Boolean);

  return (
    <article
      data-pdf-block="true"
      className="surface surface-hover group relative flex min-h-[248px] cursor-pointer flex-col p-4"
      onClick={(e) => {
        // o card inteiro abre a ficha; o nome continua sendo o link (teclado e leitor de tela)
        if ((e.target as HTMLElement).closest("a,button")) return;
        onClick?.(player.id);
        router.push(`/jogadores/${player.id}`);
      }}
    >
      <div className="absolute right-2 top-2 z-10">
        <StarButton id={player.id} nome={player.nome} />
      </div>

      <div className="flex items-start gap-3 pr-8">
        <PlayerAvatar nome={player.nome} posicao={player.posicao} imagemUrl={player.imagemUrl} size={56} />
        <div className="min-w-0 pt-0.5">
          <h3 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-gray-950" title={player.nome}>
            <Link
              href={`/jogadores/${player.id}`}
              prefetch={false}
              onClick={() => onClick?.(player.id)}
              className="no-underline text-inherit hover:underline underline-offset-2"
              aria-label={`${t.cardAriaVerDetalhes} ${player.nome}`}
            >
              {player.nome}
            </Link>
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-gray-600">
            <span className="sector-dot" style={{ background: cor }} aria-hidden />
            <span className="truncate">{pos}</span>
            {player.numeroCamisa ? <span className="num text-gray-500">· #{player.numeroCamisa}</span> : null}
          </p>
        </div>
      </div>

      <p className="mt-3 truncate text-[12.5px] text-gray-500">{meta.join(" · ")}</p>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11.5px] text-gray-500">{t.ui.compare.valor}</p>
          <p className="num text-[22px] font-semibold leading-tight tracking-[-0.025em] text-gray-950">
            {temValor ? eurMi(player.valorMercado, L) : "—"}
          </p>
        </div>
        <ContractBadge fim={player.contratoFim} compact />
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[11.5px] text-gray-500">
          <span>{t.ui.compare.posse}</span>
          <span className="num font-medium text-gray-800">{posse !== null ? `${num(posse, L, 0)}%` : "—"}</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-sunken)]" aria-hidden>
          {posse !== null ? (
            <div
              className="h-full origin-left rounded-full bg-[var(--accent)] transition-transform duration-700 ease-[var(--ease-out-expo)]"
              style={{ transform: `scaleX(${posse / 100})` }}
            />
          ) : null}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-[var(--hairline)] pt-3 text-[12px]">
        <span className="min-w-0 truncate font-medium text-gray-700" title={clube ?? ""}>
          {clube ?? t.ui.common.semDado}
        </span>
        {agencia ? (
          <span className="min-w-0 max-w-[50%] truncate text-gray-500" title={agencia}>
            {agencia}
          </span>
        ) : null}
      </div>
    </article>
  );
}
