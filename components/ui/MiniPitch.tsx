"use client";

import { corDoSetor } from "@/lib/ui/sector";

/** Posição no campo (vertical, ataque para cima): x,y em % do campo. */
const ZONA: Record<string, [number, number]> = {
  GOL: [50, 91],
  ZAG: [50, 75],
  LD: [84, 68],
  LE: [16, 68],
  LAT: [84, 68],
  VOL: [50, 60],
  MC: [50, 50],
  MEI: [50, 38],
  PD: [82, 26],
  PE: [18, 26],
  ATA: [50, 15],
};

/** Mini campo com a posição do atleta marcada. */
export default function MiniPitch({ posicao, label }: { posicao: string; label?: string }) {
  const [x, y] = ZONA[String(posicao).toUpperCase()] ?? [50, 50];
  const cor = corDoSetor(posicao);
  return (
    <svg viewBox="0 0 100 140" className="mx-auto block h-auto w-full max-w-[150px]" role="img" aria-label={label ?? posicao}>
      <rect x="1" y="1" width="98" height="138" rx="6" fill="#1f6f43" />
      <g fill="#ffffff" fillOpacity="0.045">
        {Array.from({ length: 7 }).map((_, i) => (
          <rect key={i} x="1" y={1 + i * 19.7 * 2} width="98" height="19.7" />
        ))}
      </g>
      <g stroke="#ffffff" strokeOpacity="0.55" strokeWidth="0.9" fill="none">
        <rect x="6" y="6" width="88" height="128" rx="1" />
        <line x1="6" y1="70" x2="94" y2="70" />
        <circle cx="50" cy="70" r="11" />
        <rect x="28" y="6" width="44" height="18" />
        <rect x="39" y="6" width="22" height="7" />
        <path d="M41 24a10 10 0 0 0 18 0" />
        <rect x="28" y="116" width="44" height="18" />
        <rect x="39" y="127" width="22" height="7" />
        <path d="M41 116a10 10 0 0 1 18 0" />
      </g>
      <circle cx={x} cy={y * 1.4} r="9" fill={cor} fillOpacity="0.28" />
      <circle cx={x} cy={y * 1.4} r="4.6" fill={cor} stroke="#ffffff" strokeWidth="1.6" />
    </svg>
  );
}
