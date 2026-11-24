"use client";

import { corDoSetor } from "@/lib/ui/sector";
import { iniciais } from "@/lib/ui/format";

/**
 * Foto do atleta ou, sem foto, as iniciais sobre um recorte de campo tingido
 * com a cor do setor. O recorte (meia-lua da grande área) é a assinatura que
 * se repete em card, lista e ficha.
 */
export default function PlayerAvatar({
  nome,
  posicao,
  imagemUrl,
  size = 56,
  className = "",
  rounded = "full",
}: {
  nome: string;
  posicao?: string | null;
  imagemUrl?: string | null;
  size?: number;
  className?: string;
  rounded?: "full" | "xl";
}) {
  const cor = corDoSetor(posicao);
  const radius = rounded === "full" ? "9999px" : "16px";

  if (imagemUrl) {
    return (
      <img
        src={imagemUrl}
        alt={nome}
        width={size}
        height={size}
        loading="lazy"
        className={`shrink-0 object-cover ring-1 ring-[var(--hairline)] ${className}`}
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`relative grid shrink-0 place-items-center overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `color-mix(in oklab, ${cor} 14%, white)`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${cor} 22%, transparent)`,
      }}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" fill="none">
        <g stroke={cor} strokeOpacity="0.28" strokeWidth="1.6">
          <rect x="22" y="-2" width="56" height="30" />
          <rect x="36" y="-2" width="28" height="12" />
          <path d="M38 28a14 14 0 0 0 24 0" />
          <circle cx="50" cy="100" r="22" />
        </g>
      </svg>
      <span
        className="relative font-semibold tracking-[-0.02em]"
        style={{ fontSize: Math.round(size * 0.34), color: `color-mix(in oklab, ${cor} 55%, #101a15)` }}
      >
        {iniciais(nome)}
      </span>
    </span>
  );
}
