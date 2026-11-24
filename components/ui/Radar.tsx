"use client";

import { useEffect, useState } from "react";
import { ATRIBUTOS, type Atributo, type Perfil } from "@/lib/ui/atributos";

export type RadarSerie = { id: string; nome: string; cor: string; perfil: Perfil };

/**
 * Radar de atributos em SVG puro. O polígono cresce do centro uma vez, quando
 * o perfil chega (o momento autoral da ficha e do comparador). Rótulos em
 * tinta, cor só no polígono; com 2+ séries a legenda fica fora (no chamador).
 */
export default function Radar({
  series,
  labels,
  size = 280,
}: {
  series: RadarSerie[];
  labels: Record<Atributo, string>;
  size?: number;
}) {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const pad = 46;
  const c = size / 2;
  const R = c - pad;
  const n = ATRIBUTOS.length;
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (i: number, v: number) => {
    const r = (v / 100) * R;
    return [c + r * Math.cos(ang(i)), c + r * Math.sin(ang(i))] as const;
  };
  const ring = (v: number) =>
    ATRIBUTOS.map((_, i) => pt(i, v).join(",")).join(" ");

  const single = series.length === 1;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      style={{ maxWidth: size }}
      role="img"
      aria-label={series
        .map((s) => `${s.nome}: ${ATRIBUTOS.map((a) => `${labels[a]} ${s.perfil[a]}`).join(", ")}`)
        .join(". ")}
      className="mx-auto block overflow-visible"
    >
      {/* grade */}
      {[25, 50, 75, 100].map((v) => (
        <polygon key={v} points={ring(v)} fill={v === 100 ? "var(--surface-2)" : "none"} stroke="#dfe3de" strokeWidth={1} />
      ))}
      {ATRIBUTOS.map((_, i) => {
        const [x, y] = pt(i, 100);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="#e6e9e4" strokeWidth={1} />;
      })}

      {/* séries */}
      {series.map((s, si) => (
        <g
          key={s.id}
          style={{
            transformOrigin: `${c}px ${c}px`,
            transform: grown ? "scale(1)" : "scale(0.6)",
            opacity: grown ? 1 : 0,
            transition: `transform 700ms var(--ease-out-expo) ${si * 90}ms, opacity 400ms ease-out ${si * 90}ms`,
          }}
        >
          <polygon
            points={ATRIBUTOS.map((a, i) => pt(i, s.perfil[a]).join(",")).join(" ")}
            fill={s.cor}
            fillOpacity={single ? 0.16 : 0.1}
            stroke={s.cor}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {ATRIBUTOS.map((a, i) => {
            const [x, y] = pt(i, s.perfil[a]);
            return <circle key={a} cx={x} cy={y} r={3.5} fill={s.cor} stroke="var(--surface)" strokeWidth={2} />;
          })}
        </g>
      ))}

      {/* rótulos */}
      {ATRIBUTOS.map((a, i) => {
        const [x, y] = pt(i, 100);
        const dx = Math.cos(ang(i));
        const dy = Math.sin(ang(i));
        const tx = x + dx * 16;
        const ty = y + dy * 16;
        const anchor = Math.abs(dx) < 0.2 ? "middle" : dx > 0 ? "start" : "end";
        return (
          <g key={a}>
            <text
              x={tx}
              y={ty + (dy > 0.5 ? 8 : dy < -0.5 ? -2 : 3)}
              textAnchor={anchor}
              fontSize={11.5}
              fill="#4b5651"
              fontWeight={500}
            >
              {labels[a]}
            </text>
            {single ? (
              <text
                x={tx}
                y={ty + (dy > 0.5 ? 22 : dy < -0.5 ? 12 : 17)}
                textAnchor={anchor}
                fontSize={11.5}
                fill="#101a15"
                fontWeight={600}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {series[0].perfil[a]}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
