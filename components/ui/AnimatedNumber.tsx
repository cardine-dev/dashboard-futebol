"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Número que conta até o valor, como placar eletrônico. Anima quando o valor
 * chega ou muda (evento de dado), nunca em loop. Com movimento reduzido, troca
 * direto. O texto final é sempre o valor formatado, então leitor de tela e
 * export de PDF veem o número certo.
 */
export default function AnimatedNumber({
  value,
  format,
  duration = 700,
  className,
}: {
  value: number | null | undefined;
  format: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const [shown, setShown] = useState<number | null>(value ?? null);
  const from = useRef<number>(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      setShown(null);
      return;
    }
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const exporting =
      typeof document !== "undefined" && document.body.dataset.exporting === "true";
    if (reduce || exporting) {
      setShown(value);
      from.current = value;
      return;
    }

    const start = performance.now();
    const a = from.current;
    const b = value;
    const ease = (t: number) => 1 - Math.pow(1 - t, 4); // ease-out quart

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(a + (b - a) * ease(t));
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else from.current = b;
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      from.current = b;
    };
  }, [value, duration]);

  if (shown === null) return <span className={className}>—</span>;

  return (
    <span className={className} aria-label={value != null ? format(value) : undefined}>
      <span aria-hidden>{format(shown)}</span>
    </span>
  );
}
