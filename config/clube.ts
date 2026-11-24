/**
 * Clube que assiste à demonstração (white-label).
 *
 * Para apresentar a outro clube, não mexa no código: defina no `.env.local`
 *
 *   NEXT_PUBLIC_CLUBE_NOME="Dínamo Esporte Clube"
 *   NEXT_PUBLIC_CLUBE_SIGLA="DEC"
 *   NEXT_PUBLIC_CLUBE_CIDADE="Araxá · MG"
 *   NEXT_PUBLIC_CLUBE_ESCUDO="/assets/clubes/dinamo-fc.png"
 *   NEXT_PUBLIC_CLUBE_COR="#c8102e"
 *
 * e reinicie o servidor. A cor vira o acento do painel inteiro (botões, foco,
 * seleção, destaques) e o texto sobre ela escolhe branco ou tinta sozinho pelo
 * contraste. Escudos de clubes reais ficam em `public/assets/clubes/` e fora do
 * git (o repositório é público).
 */

const env = (v: string | undefined, fallback: string) =>
  v && v.trim() ? v.trim() : fallback;

export type ClubeConfig = {
  nome: string;
  sigla: string;
  cidade: string;
  escudo: string;
  cor: string;
};

export const CLUBE: ClubeConfig = {
  nome: env(process.env.NEXT_PUBLIC_CLUBE_NOME, "Clube Demonstração"),
  sigla: env(process.env.NEXT_PUBLIC_CLUBE_SIGLA, "CDM"),
  cidade: env(process.env.NEXT_PUBLIC_CLUBE_CIDADE, "São Paulo · SP"),
  escudo: env(process.env.NEXT_PUBLIC_CLUBE_ESCUDO, "/assets/clubes/escudo-demo.svg"),
  cor: env(process.env.NEXT_PUBLIC_CLUBE_COR, "#0b7a45"),
};

/* ----------------------------- cor de acento ----------------------------- */

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace("#", "").trim();
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function luminance([r, g, b]: [number, number, number]) {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Variáveis CSS do acento do clube, com o texto sobre o acento escolhido por contraste. */
export function accentVars(cor: string = CLUBE.cor): Record<string, string> {
  const rgb = hexToRgb(cor);
  if (!rgb) return {};
  const L = luminance(rgb);
  const contrastWhite = 1.05 / (L + 0.05);
  const contrastInk = (L + 0.05) / 0.0245; // tinta ~ #101a15
  const hex = "#" + rgb.map((n) => n.toString(16).padStart(2, "0")).join("");
  return {
    "--accent": hex,
    "--accent-ink": contrastWhite >= contrastInk ? "#ffffff" : "#0e1512",
  };
}
