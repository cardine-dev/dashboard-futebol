"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

type Tone = "success" | "error" | "info";

type ToastItem = {
  id: number;
  title: string;
  description?: string;
  tone: Tone;
  action?: { label: string; onClick: () => void };
};

type ToastInput = Omit<ToastItem, "id" | "tone"> & { tone?: Tone; duration?: number };

type ToastCtx = {
  toast: (t: ToastInput) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

const ICON: Record<Tone, React.ReactNode> = {
  success: <CheckCircle2 size={16} className="text-[var(--good)]" aria-hidden />,
  error: <AlertTriangle size={16} className="text-[var(--bad)]" aria-hidden />,
  info: <Info size={16} className="text-gray-500" aria-hidden />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    ({ duration = 3600, tone = "success", ...rest }: ToastInput) => {
      const id = ++seq.current;
      setItems((prev) => [...prev.slice(-2), { id, tone, ...rest }]);
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[80] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2"
      >
        {items.map((it) => (
          <div
            key={it.id}
            role={it.tone === "error" ? "alert" : "status"}
            className="pointer-events-auto flex items-start gap-3 rounded-[12px] bg-[var(--night-1)] px-3.5 py-3 text-white shadow-[var(--shadow-toast)] ring-1 ring-white/10"
            style={{ animation: "toast-in 260ms var(--ease-out-expo) both" }}
          >
            <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-white">
              {ICON[it.tone]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-5">{it.title}</p>
              {it.description ? (
                <p className="mt-0.5 text-xs leading-4 text-white/65">{it.description}</p>
              ) : null}
            </div>
            {it.action ? (
              <button
                type="button"
                onClick={() => {
                  it.action?.onClick();
                  dismiss(it.id);
                }}
                className="rounded-md px-2 py-1 text-xs font-semibold text-[var(--accent-glow)] hover:bg-white/10 cursor-pointer"
              >
                {it.action.label}
              </button>
            ) : null}
            <button
              type="button"
              aria-label={t.ui.toast.fechar}
              onClick={() => dismiss(it.id)}
              className="-mr-1 grid h-6 w-6 place-items-center rounded-md text-white/50 hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast precisa de <ToastProvider>");
  return ctx.toast;
}
