/**
 * Converte texto de valor monetário em número, aceitando os formatos BR e US.
 *
 *   "34000000"       → 34000000
 *   "12.5"           → 12.5          (separador único com ≠ 3 casas = decimal)
 *   "12,5"           → 12.5
 *   "1.234,56"       → 1234.56       (dois separadores: o último é o decimal)
 *   "1,234.56"       → 1234.56
 *   "34.000.000,00"  → 34000000
 *   "34.000.000"     → 34000000      (separador repetido = milhar)
 *   "1.234"          → 1234          (separador único + exatamente 3 casas = milhar)
 *   "0.500"          → 0.5           (parte inteira 0 = decimal)
 *   "€ 3.200.000"    → 3200000       (símbolos e espaços são ignorados)
 *
 * Devolve null quando não dá para interpretar.
 */
export function parseMoney(input: unknown): number | null {
  if (input == null) return null;
  if (typeof input === "number") return Number.isFinite(input) ? input : null;

  let s = String(input).trim();
  if (!s) return null;

  const negative = /^\(.*\)$/.test(s) || /^-/.test(s.replace(/[^\d\-.,]/g, ""));
  s = s.replace(/[^\d.,]/g, "");
  if (!s || !/\d/.test(s)) return null;

  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  let normalized: string;

  if (lastDot >= 0 && lastComma >= 0) {
    // os dois aparecem: o que vem por último é o decimal
    const decimalSep = lastDot > lastComma ? "." : ",";
    const thousandSep = decimalSep === "." ? "," : ".";
    const [intPart, ...rest] = s.split(decimalSep);
    if (rest.length !== 1) return null;
    normalized = `${intPart.split(thousandSep).join("")}.${rest[0]}`;
  } else if (lastDot >= 0 || lastComma >= 0) {
    const sep = lastDot >= 0 ? "." : ",";
    const parts = s.split(sep);
    if (parts.length > 2) {
      // repetido → milhar (todos os grupos depois do 1º precisam ter 3 dígitos)
      if (!parts.slice(1).every((p) => p.length === 3)) return null;
      normalized = parts.join("");
    } else {
      const [intPart, frac] = parts;
      const looksThousand = frac.length === 3 && intPart.length > 0 && intPart !== "0";
      normalized = looksThousand ? `${intPart}${frac}` : `${intPart || "0"}.${frac}`;
    }
  } else {
    normalized = s;
  }

  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}
