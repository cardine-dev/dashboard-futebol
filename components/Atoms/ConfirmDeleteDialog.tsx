"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/contexts/I18nContext";

export default function ConfirmDeleteDialog({
  open,
  title,
  description,
  expectedPhrase,
  itemName,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title?: string;
  description?: string;
  expectedPhrase: string; // ex: `DELETAR ${nome}`
  itemName?: string; // só pra exibir
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
}) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setText("");
      setErr(null);
      setLoading(false);
    }
  }, [open]);

  const canConfirm = useMemo(() => {
    return text.trim() === expectedPhrase.trim();
  }, [text, expectedPhrase]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* overlay */}
      <div
        className="backdrop-in absolute inset-0 bg-[var(--scrim)] backdrop-blur-[2px]"
        onClick={() => {
          if (!loading) onCancel();
        }}
      />

      {/* modal */}
      <div className="absolute inset-0 grid place-items-center px-4">
        <div role="alertdialog" aria-modal="true" className="overlay-in w-full max-w-[480px] overflow-hidden rounded-[16px] bg-[var(--surface)] shadow-[var(--shadow-3)]">
          <div className="p-5 pb-3">
            <div className="text-[16px] font-semibold tracking-[-0.01em] text-gray-950">{title || t.confirmDelete.titulo}</div>
            {description && (
              <div className="mt-1 text-[13px] leading-5 text-gray-600">{description}</div>
            )}
          </div>

          <div className="px-5 pb-4 space-y-3">
            {itemName && (
              <div className="rounded-[10px] bg-[var(--surface-2)] px-3 py-2 ring-1 ring-[var(--hairline)]">
                <div className="text-[11px] text-gray-500">
                  {t.confirmDelete.voceEstaDeletando}
                </div>
                <div className="text-sm font-medium text-gray-950">{itemName}</div>
              </div>
            )}

            <div className="text-xs text-gray-600">
              {t.confirmDelete.paraConfirmar}
              <div className="num mt-1 font-semibold text-[var(--bad)] select-all">
                {expectedPhrase}
              </div>
            </div>

            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={loading}
              className="input focus:!border-[var(--bad)] focus:!ring-red-500/20"
              placeholder={t.confirmDelete.digiteAqui}
              autoFocus
            />

            {err && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {err}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-[var(--hairline)] bg-[var(--surface-2)] px-5 py-3">
            <button
              type="button"
              onClick={() => {
                if (!loading) onCancel();
              }}
              className="btn btn-ghost cursor-pointer"
              disabled={loading}
            >
              {t.confirmDelete.cancelar}
            </button>

            <button
              type="button"
              disabled={!canConfirm || loading}
              onClick={async () => {
                try {
                  setLoading(true);
                  setErr(null);
                  await onConfirm();
                } catch (e: any) {
                  setErr(e?.message ?? t.confirmDelete.erroDeletar);
                } finally {
                  setLoading(false);
                }
              }}
              className="btn cursor-pointer bg-[var(--bad)] text-white hover:bg-red-800"
            >
              {loading ? t.confirmDelete.deletando : t.confirmDelete.deletar}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
