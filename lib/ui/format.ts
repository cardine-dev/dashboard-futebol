/**
 * Formatação curta para leitura de relance (KPIs, cards, ficha).
 * Valores de jogador vêm em milhões de euro no cadastro; valores de mercado
 * (transferências) vêm em euro. Cada função diz qual unidade espera.
 */

const LOCALE_MAP: Record<string, string> = { pt: "pt-BR", en: "en-US", es: "es-ES" };

export function intlLocale(locale?: string) {
  return LOCALE_MAP[locale ?? "pt"] ?? "pt-BR";
}

const SUFIXOS: Record<string, { mi: string; mil: string; bi: string }> = {
  "pt-BR": { bi: "bi", mi: "mi", mil: "mil" },
  "es-ES": { bi: "mil M", mi: "M", mil: "mil" },
  "en-US": { bi: "B", mi: "M", mil: "K" },
};

/** € em euro → "€ 711,3 mi" */
export function eurCompact(v: number | null | undefined, locale = "pt-BR", digits = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const s = SUFIXOS[locale] ?? SUFIXOS["pt-BR"];
  const abs = Math.abs(v);
  const nf = (n: number, d = digits) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: d, minimumFractionDigits: d }).format(n);
  if (abs >= 1e9) return `€ ${nf(v / 1e9)} ${s.bi}`;
  if (abs >= 1e6) return `€ ${nf(v / 1e6)} ${s.mi}`;
  if (abs >= 1e3) return `€ ${nf(v / 1e3, 0)} ${s.mil}`;
  return `€ ${nf(v, 0)}`;
}

/** Valor do cadastro de jogador (milhões de euro) → "€ 12,4 mi" */
export function eurMi(vMi: number | null | undefined, locale = "pt-BR"): string {
  if (vMi === null || vMi === undefined || !Number.isFinite(vMi)) return "—";
  return eurCompact(vMi * 1e6, locale, vMi * 1e6 >= 1e6 ? 1 : 0);
}

export function eurFull(v: number | null | undefined, locale = "pt-BR"): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

export function num(v: number | null | undefined, locale = "pt-BR", digits = 0): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return new Intl.NumberFormat(locale, { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(v);
}

/** Meses inteiros entre hoje e a data (negativo = já passou). */
export function mesesAte(iso: string | null | undefined, hoje = new Date()): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return (d.getFullYear() - hoje.getFullYear()) * 12 + (d.getMonth() - hoje.getMonth());
}

export function dataCurta(iso: string | null | undefined, locale = "pt-BR"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale, { month: "short", year: "numeric" });
}

export function iniciais(nome: string | null | undefined): string {
  return String(nome ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
