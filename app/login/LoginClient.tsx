"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import LanguageSwitcher from "@/components/Atoms/LanguageSwitcher";
import TermsPrivacyDialog from "@/components/Atoms/TermsPrivacyDialog";
import { CLUBE } from "@/config/clube";

const DEMO_LOGIN = process.env.NEXT_PUBLIC_DEMO_LOGIN !== "false";
const DEMO = {
  admin: { email: "admin@demo.com", senha: "admin@2025" },
  cliente: { email: "cliente@demo.com", senha: "cliente@2025" },
};

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, login } = useAuth();
  const { t } = useI18n();
  const l = t.ui.login;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [termsTab, setTermsTab] = useState<"termos" | "privacidade">("termos");

  useEffect(() => {
    if (!loading && user) {
      const next = searchParams.get("next") || "/dashboard";
      router.replace(next);
    }
  }, [user, loading, router, searchParams]);

  async function doLogin(em: string, pw: string) {
    if (isLoading) return;
    setError("");
    setIsLoading(true);
    try {
      await login(em, pw);
    } catch (err: any) {
      setError(err?.message || t.login.erroLogin);
      setShake((s) => s + 1);
      setIsLoading(false);
    }
  }

  return (
    <div className="grid min-h-dvh bg-[var(--canvas)] lg:grid-cols-[1.05fr_1fr]">
      {/* Campo noturno: o momento autoral do produto (as linhas se desenham uma vez) */}
      <aside className="relative hidden overflow-hidden bg-[var(--night-0)] text-white lg:block">
        <PitchDrawing />
        <div className="relative z-10 flex h-full flex-col justify-between p-10">
          <div className="flex items-center gap-3">
            <img src={CLUBE.escudo} alt={CLUBE.nome} width={44} height={44} className="h-11 w-11 object-contain" />
            <div className="leading-tight">
              <p className="text-[15px] font-semibold">{CLUBE.nome}</p>
              <p className="text-[12.5px] text-[var(--night-ink-2)]">{t.sidebar.appName}</p>
            </div>
          </div>

          <div className="max-w-[440px]">
            <p className="text-[32px] font-semibold leading-[1.15] tracking-[-0.03em] text-balance">{l.tagline}</p>
            <ul className="mt-6 space-y-2.5 text-[14px] text-white/75">
              {(l.fatos as string[]).map((f, i) => (
                <li
                  key={f}
                  className="flex items-center gap-2.5"
                  style={{ animation: `enter 500ms var(--ease-out-expo) ${900 + i * 120}ms both` }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-glow)]" aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      <main className="relative flex items-center justify-center px-5 py-12">
        <div className="absolute right-4 top-4">
          <LanguageSwitcher />
        </div>

        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src={CLUBE.escudo} alt={CLUBE.nome} width={40} height={40} className="h-10 w-10 object-contain" />
            <div className="leading-tight">
              <p className="text-[15px] font-semibold text-gray-950">{CLUBE.nome}</p>
              <p className="text-[12.5px] text-gray-500">{t.sidebar.appName}</p>
            </div>
          </div>

          <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-gray-950">{l.titulo}</h1>
          <p className="mt-1 text-[14px] text-gray-500">
            {l.sub} {CLUBE.nome}
          </p>

          <form
            key={shake}
            className="mt-7 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void doLogin(email, password);
            }}
            style={shake ? { animation: "shake 320ms cubic-bezier(.36,.07,.19,.97) both" } : undefined}
            noValidate={false}
          >
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-gray-700">{t.login.email}</span>
              <span className="relative block">
                <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
                <input
                  className="input !h-11 !pl-10"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                  aria-invalid={!!error}
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-gray-700">{t.login.senha}</span>
              <span className="relative block">
                <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
                <input
                  className="input !h-11 !pl-10 !pr-11"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  aria-invalid={!!error}
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? l.ocultar : l.mostrar}
                  className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-gray-400 hover:bg-[var(--surface-sunken)] hover:text-gray-700 cursor-pointer"
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </span>
            </label>

            {error ? (
              <p role="alert" className="rounded-[10px] bg-red-50 px-3 py-2 text-[13px] text-[var(--bad)] ring-1 ring-red-200">
                {error}
              </p>
            ) : null}

            <button className="btn btn-primary !h-11 w-full cursor-pointer text-[15px]" disabled={isLoading} type="submit">
              {isLoading ? <Loader2 size={17} className="animate-spin" aria-hidden /> : null}
              {isLoading ? t.login.entrando : l.titulo}
              {!isLoading ? <ArrowRight size={16} aria-hidden /> : null}
            </button>
          </form>

          {DEMO_LOGIN ? (
            <div className="mt-6">
              <div className="flex items-center gap-3 text-[12px] text-gray-500">
                <span className="h-px flex-1 bg-[var(--hairline)]" />
                {l.demo}
                <span className="h-px flex-1 bg-[var(--hairline)]" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(["admin", "cliente"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      setEmail(DEMO[k].email);
                      setPassword(DEMO[k].senha);
                      void doLogin(DEMO[k].email, DEMO[k].senha);
                    }}
                    className="btn btn-ghost !h-10 cursor-pointer"
                  >
                    {k === "admin" ? l.admin : l.cliente}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <p className="mt-8 text-center text-[12px] leading-5 text-gray-500">
            {t.login.termosPrefix}
            <button
              type="button"
              onClick={() => {
                setTermsTab("termos");
                setTermsOpen(true);
              }}
              className="underline underline-offset-2 hover:text-gray-800 cursor-pointer"
            >
              {t.login.termosLink}
            </button>
            {t.login.termosConector}
            <button
              type="button"
              onClick={() => {
                setTermsTab("privacidade");
                setTermsOpen(true);
              }}
              className="underline underline-offset-2 hover:text-gray-800 cursor-pointer"
            >
              {t.login.privacidadeLink}
            </button>
            {t.login.termosSuffix}
          </p>
        </div>
      </main>

      <TermsPrivacyDialog open={termsOpen} onClose={() => setTermsOpen(false)} initialTab={termsTab} />
    </div>
  );
}

/** Campo visto de cima: as linhas se desenham em sequência e o 4-3-3 entra depois. */
function PitchDrawing() {
  const line = (d: number) => ({
    strokeDasharray: 1,
    strokeDashoffset: 1,
    animation: `draw 900ms var(--ease-out-expo) ${d}ms forwards`,
  });
  // 4-3-3 (ataque para cima), cores por setor
  const xi: Array<[number, number, string]> = [
    [300, 760, "var(--color-gol)"],
    [150, 640, "var(--color-def)"], [250, 660, "var(--color-def)"], [350, 660, "var(--color-def)"], [450, 640, "var(--color-def)"],
    [190, 500, "var(--color-mei)"], [300, 520, "var(--color-mei)"], [410, 500, "var(--color-mei)"],
    [170, 330, "var(--color-ata)"], [300, 300, "var(--color-ata)"], [430, 330, "var(--color-ata)"],
  ];
  return (
    <svg
      aria-hidden
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 600 900"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      <defs>
        <radialGradient id="lg" cx="50%" cy="58%" r="60%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="600" height="900" fill="url(#lg)" />
      <g stroke="white" strokeOpacity="0.16" strokeWidth="1.4">
        <rect x="60" y="60" width="480" height="780" pathLength={1} style={line(0)} />
        <line x1="60" y1="450" x2="540" y2="450" pathLength={1} style={line(250)} />
        <circle cx="300" cy="450" r="70" pathLength={1} style={line(400)} />
        <rect x="170" y="60" width="260" height="120" pathLength={1} style={line(550)} />
        <rect x="235" y="60" width="130" height="44" pathLength={1} style={line(650)} />
        <path d="M245 180a60 60 0 0 0 110 0" pathLength={1} style={line(750)} />
        <rect x="170" y="720" width="260" height="120" pathLength={1} style={line(550)} />
        <rect x="235" y="796" width="130" height="44" pathLength={1} style={line(650)} />
        <path d="M245 720a60 60 0 0 1 110 0" pathLength={1} style={line(750)} />
      </g>
      <circle cx="300" cy="450" r="3" fill="white" fillOpacity="0.3" />
      {xi.map(([x, y, c], i) => (
        <g key={i} style={{ animation: `fade 420ms ease-out ${1100 + i * 45}ms both` }}>
          <circle cx={x} cy={y} r="13" fill={c} fillOpacity="0.16" />
          <circle cx={x} cy={y} r="5.5" fill={c} stroke="var(--night-0)" strokeWidth="2" />
        </g>
      ))}
    </svg>
  );
}
