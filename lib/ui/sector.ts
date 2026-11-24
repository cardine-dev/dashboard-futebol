import type { Posicao } from "@/type/jogador";

/** Setor do campo. A ordem é fixa (GOL → DEF → MEI → ATA) em toda a interface. */
export type Setor = "GOL" | "DEF" | "MEI" | "ATA";

export const SETORES: Setor[] = ["GOL", "DEF", "MEI", "ATA"];

/**
 * Cores de setor (validadas com o dataviz/validate_palette em modo claro).
 * Apontam para os tokens --color-gol/def/mei/ata do globals.css; var() funciona
 * também em atributo SVG, então o recharts usa os mesmos tokens.
 */
export const SETOR_COR: Record<Setor, string> = {
  GOL: "var(--color-gol)",
  DEF: "var(--color-def)",
  MEI: "var(--color-mei)",
  ATA: "var(--color-ata)",
};

const MAPA: Record<string, Setor> = {
  GOL: "GOL",
  LD: "DEF",
  ZAG: "DEF",
  LE: "DEF",
  LAT: "DEF",
  VOL: "MEI",
  MC: "MEI",
  MEI: "MEI",
  PD: "ATA",
  PE: "ATA",
  ATA: "ATA",
};

export function setorDe(pos: Posicao | string | null | undefined): Setor {
  return MAPA[String(pos ?? "").toUpperCase()] ?? "MEI";
}

export function corDoSetor(pos: Posicao | string | null | undefined): string {
  return SETOR_COR[setorDe(pos)];
}

/** Tinta neutra para séries únicas de gráfico (mesma da rampa --color-gray-800). */
export const INK_SERIE = "var(--color-gray-800)";
export const GRID = "var(--chart-grid)";
export const AXIS_TEXT = "var(--color-gray-500)";
