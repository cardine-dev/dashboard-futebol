// components/GeoMapWidget/MapCanvas.tsx
"use client";

import React from "react";
import { ComposableMap, Geographies, Geography } from "@vnedyalk0v/react19-simple-maps";
import { useI18n } from "@/contexts/I18nContext";
import type { GeoProjection } from "d3-geo";

import type { ContinentCode, Mode } from "./geoAdapters";
import {
  MAP_DATA,
  getContinentCodeFromGeo,
  getISO2FromCountryGeo,
  getCountryLabel,
  getStateLabel,
  getUFfromBRGeo,
  safeStr,
} from "./geoAdapters";

type Props = {
  mode: Mode;
  box: { w: number; h: number };
  projection: GeoProjection;

  byCountry: Record<string, number>;
  byUF: Record<string, number>;
  countriesWithPlayers: Set<string>;
  continentsWithPlayers: Set<ContinentCode>;
  ufsWithPlayers: Set<string>;

  nameToISO2: Map<string, string>;

  onHover: (
    e: React.MouseEvent,
    meta: { title: string; subtitle: string; hint: string },
  ) => void;
  onMove: (e: React.MouseEvent) => void;
  onLeave: () => void;

  onSelectContinent: (c: ContinentCode) => void;
  onSelectCountry: (iso2: string, label: string) => void;
  onSelectUF: (uf: string, label: string) => void;
};

function geoKey(geo: any, idx: number) {
  const id = safeStr(geo?.id);
  const p = geo?.properties ?? {};
  const name = safeStr(
    p.name ?? p.NAME ?? p.geounit ?? p.ADMIN ?? p.admin ?? p.continent ?? "",
  );
  return `geo-${idx}-${id || "x"}-${name || "y"}`;
}

function normalizeContinentCode(x: unknown): ContinentCode | null {
  const v = safeStr(x).toUpperCase();
  if (v === "SA" || v === "NA" || v === "EU" || v === "AF" || v === "AS" || v === "OC") {
    return v as ContinentCode;
  }
  return null;
}


/* Coroplético de um tom só (acento do clube): mais atletas = mais escuro. */
const EMPTY_FILL = "#e9ece8";
function heatFill(count: number, max: number) {
  if (!count || !max) return EMPTY_FILL;
  const pct = Math.round(38 + 62 * Math.sqrt(count / max));
  return `color-mix(in oklab, var(--accent) ${pct}%, #f1f3ef)`;
}
function heatHover(count: number, max: number) {
  if (!count || !max) return EMPTY_FILL;
  return `color-mix(in oklab, var(--accent) 100%, black 18%)`;
}

export default function MapCanvas(props: Props) {
  const { t } = useI18n();
  const {
    mode,
    box,
    projection,
    byCountry,
    byUF,
    countriesWithPlayers,
    continentsWithPlayers,
    ufsWithPlayers,
    nameToISO2,
    onHover,
    onMove,
    onLeave,
    onSelectContinent,
    onSelectCountry,
    onSelectUF,
  } = props;

  const geoData = MAP_DATA[mode];
  const maxCountry = Math.max(0, ...Object.values(byCountry ?? {}));
  const maxUF = Math.max(0, ...Object.values(byUF ?? {}));

  if (!geoData) {
    return (
      <div className="grid h-full w-full place-items-center text-sm text-gray-500">
        {t.mapCanvas.mapaIndisponivel}{" "}
        <span className="font-semibold">{String(mode)}</span>
      </div>
    );
  }

  const isWorld = mode === "WORLD";
  const isBR = mode === "BR";
  const isContinent = !isWorld && !isBR;

  return (
    <ComposableMap
      key={`${mode}-${box.w}-${box.h}`}
      width={box.w}
      height={box.h}
      projection={projection as any}
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      {/* PASSA O JSON, não URL */}
      <Geographies geography={geoData as any}>
        {({ geographies }: any) => {
          const list = Array.isArray(geographies) ? geographies : [];

          return list.map((geo: any, idx: number) => {
            const key = geoKey(geo, idx);

            // -------------------------
            // WORLD: continentes
            // -------------------------
            if (isWorld) {
              const contRaw = getContinentCodeFromGeo(geo);
              const cont = normalizeContinentCode(contRaw);

              const hasPlayers = !!cont && continentsWithPlayers.has(cont);
              const clickable = hasPlayers;

              const continentMap: Record<ContinentCode, string> = {
                SA: t.geoMap.americaSul,
                NA: t.geoMap.americaNorte,
                EU: t.geoMap.europa,
                AF: t.geoMap.africa,
                AS: t.geoMap.asia,
                OC: t.geoMap.oceania,
              };
              const title = cont ? continentMap[cont] : t.mapCanvas.continente;
              const subtitle = hasPlayers ? t.mapCanvas.cliqueAbrir : t.mapCanvas.semJogadores;
              const hint = hasPlayers ? t.mapCanvas.abrirPaises : t.mapCanvas.indisponivel;

              return (
                <Geography
                  key={key}
                  geography={geo}
                  onMouseEnter={(e) => onHover(e, { title, subtitle, hint })}
                  onMouseMove={onMove}
                  onMouseLeave={onLeave}
                  onClick={() => {
                    onLeave();
                    if (!cont) return;
                    if (!hasPlayers) return;
                    onSelectContinent(cont);
                  }}
                  style={{
                    default: {
                      fill: clickable ? "color-mix(in oklab, var(--accent) 72%, #f1f3ef)" : EMPTY_FILL,
                      outline: "none",
                      cursor: clickable ? "pointer" : "default",
                      transition: "fill 160ms ease-out",
                    },
                    hover: {
                      fill: clickable ? "var(--accent)" : EMPTY_FILL,
                      outline: "none",
                      cursor: clickable ? "pointer" : "default",
                    },
                    pressed: {
                      fill: clickable ? "var(--accent)" : EMPTY_FILL,
                      outline: "none",
                    },
                  }}
                />
              );
            }

            // -------------------------
            // CONTINENTE: países
            // -------------------------
            if (isContinent) {
              const iso2 = getISO2FromCountryGeo(geo, nameToISO2);
              const label = getCountryLabel(geo, nameToISO2) || iso2 || "—";

              const count = iso2 ? (byCountry[iso2] ?? 0) : 0;
              const clickable = !!iso2 && countriesWithPlayers.has(iso2);

              const subtitle = `${count} ${count === 1 ? t.mapCanvas.jogador : t.mapCanvas.jogadores}`;
              const hint = clickable ? t.mapCanvas.cliqueVerJogadores : t.mapCanvas.semJogadores;

              return (
                <Geography
                  key={key}
                  geography={geo}
                  onMouseEnter={(e) => onHover(e, { title: label, subtitle, hint })}
                  onMouseMove={onMove}
                  onMouseLeave={onLeave}
                  onClick={() => {
                    onLeave();
                    if (!clickable) return;
                    onSelectCountry(iso2, label);
                  }}
                  style={{
                    default: {
                      fill: heatFill(count, maxCountry),
                      outline: "none",
                      cursor: clickable ? "pointer" : "default",
                      transition: "fill 160ms ease-out",
                    },
                    hover: {
                      fill: heatHover(count, maxCountry),
                      outline: "none",
                      cursor: clickable ? "pointer" : "default",
                    },
                    pressed: {
                      fill: heatHover(count, maxCountry),
                      outline: "none",
                    },
                  }}
                />
              );
            }

            // -------------------------
            // BR: estados
            // -------------------------
            const uf = getUFfromBRGeo(geo);
            const label = getStateLabel(geo) || uf || "—";

            const count = uf ? (byUF[uf] ?? 0) : 0;
            const clickable = !!uf && ufsWithPlayers.has(uf);

            const subtitle = `${count} ${count === 1 ? t.mapCanvas.jogador : t.mapCanvas.jogadores}`;
            const hint = clickable ? t.mapCanvas.cliqueVerJogadores : t.mapCanvas.semJogadores;

            return (
              <Geography
                key={key}
                geography={geo}
                onMouseEnter={(e) =>
                  onHover(e, {
                    title: uf ? `${label} (${uf})` : label,
                    subtitle,
                    hint,
                  })
                }
                onMouseMove={onMove}
                onMouseLeave={onLeave}
                onClick={() => {
                  onLeave();
                  if (!clickable) return;
                  onSelectUF(uf, label);
                }}
                style={{
                  default: {
                    fill: heatFill(count, maxUF),
                    stroke: "#ffffff",
                    transition: "fill 160ms ease-out",
                    strokeWidth: 0.6,
                    outline: "none",
                    cursor: clickable ? "pointer" : "default",
                  },
                  hover: {
                    fill: heatHover(count, maxUF),
                    outline: "none",
                    cursor: clickable ? "pointer" : "default",
                  },
                  pressed: {
                    fill: heatHover(count, maxUF),
                    outline: "none",
                  },
                }}
              />
            );
          });
        }}
      </Geographies>
    </ComposableMap>
  );
}