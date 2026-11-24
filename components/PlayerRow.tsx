"use client";

import type { Jogador } from "@/type/jogador";
import { useRouter } from "next/navigation";
import { useI18n } from "@/contexts/I18nContext";
import PlayerAvatar from "@/components/ui/PlayerAvatar";
import StarButton from "@/components/ui/StarButton";
import { ContractBadge } from "@/components/Card";
import { corDoSetor } from "@/lib/ui/sector";
import { dataCurta, eurMi, intlLocale, num } from "@/lib/ui/format";

type Props = { player: Jogador };

const td = "px-4 py-3 align-middle text-[13px] text-gray-700 border-b border-[var(--hairline)]";

export default function PlayerRow({ player }: Props) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const L = intlLocale(locale);
  const go = () => router.push(`/jogadores/${player.id}`);

  const posse = typeof player.possePct === "number" ? player.possePct : null;
  const temValor = Number(player.valorMercado) > 0;

  return (
    <tr
      data-pdf-block="true"
      className="group cursor-pointer transition-colors duration-150 hover:bg-[var(--surface-2)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--accent)]"
      role="link"
      tabIndex={0}
      onClick={go}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go();
        }
      }}
    >
      <td className={td}>
        <div className="flex min-w-0 items-center gap-3">
          <PlayerAvatar nome={player.nome} posicao={player.posicao} imagemUrl={player.imagemUrl} size={36} />
          <div className="min-w-0">
            <div className="truncate font-medium text-gray-950" title={player.nome}>
              {player.nome}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="sector-dot" style={{ background: corDoSetor(player.posicao), width: 7, height: 7 }} aria-hidden />
              {(t.positions as any)[player.posicao] ?? player.posicao}
            </div>
          </div>
        </div>
      </td>

      <td className={td}>
        <span className="inline-block max-w-44 truncate" title={player.clubeNome ?? ""}>
          {player.clubeRef?.nome ?? player.clubeNome ?? "—"}
        </span>
      </td>

      <td className={`${td} num`}>{player.idade ?? "—"}</td>

      <td className={td}>{player.peDominante ? (t.ui.pe as any)[player.peDominante] ?? player.peDominante : "—"}</td>

      <td className={`${td} num`}>{player.altura ? `${num(player.altura, L, 2)} m` : "—"}</td>

      <td className={td}>
        <div className="flex items-center gap-2">
          <span className="num whitespace-nowrap">{dataCurta(player.contratoFim, L)}</span>
          <ContractBadge fim={player.contratoFim} compact />
        </div>
      </td>

      <td className={`${td} num whitespace-nowrap text-right font-medium text-gray-950`}>
        {temValor ? eurMi(player.valorMercado, L) : "—"}
      </td>

      <td className={td}>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--surface-sunken)]" aria-hidden>
            {posse !== null ? (
              <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.max(0, Math.min(100, posse))}%` }} />
            ) : null}
          </div>
          <span className="num w-10 text-right">{posse !== null ? `${num(posse, L, 0)}%` : "—"}</span>
        </div>
      </td>

      <td className={`${td} w-12 pr-2`} onClick={(e) => e.stopPropagation()}>
        <StarButton id={player.id} nome={player.nome} />
      </td>
    </tr>
  );
}
