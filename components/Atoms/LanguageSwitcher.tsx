"use client";

import { useI18n } from "@/contexts/I18nContext";
import type { Locale } from "@/locales";

const LOCALES: { locale: Locale; code: string; label: string }[] = [
  { locale: "pt", code: "PT", label: "Português" },
  { locale: "en", code: "EN", label: "English" },
  { locale: "es", code: "ES", label: "Español" },
];

export default function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t.ui.shell.idioma}
      className={["seg", className].filter(Boolean).join(" ")}
    >
      {LOCALES.map((l) => (
        <button
          key={l.locale}
          type="button"
          onClick={() => setLocale(l.locale)}
          title={l.label}
          aria-label={l.label}
          aria-pressed={locale === l.locale}
          className="num !text-[11px] !px-2"
        >
          {l.code}
        </button>
      ))}
    </div>
  );
}
