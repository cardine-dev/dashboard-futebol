// components/Atoms/SuccessDialog.tsx
"use client";

import { CheckCircle2 } from "lucide-react";

type SuccessDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

export default function SuccessDialog({
  open,
  title,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: SuccessDialogProps) {
  if (!open) return null;

  return (
    <div className="backdrop-in fixed inset-0 z-50 flex items-center justify-center bg-[var(--scrim)] px-4 backdrop-blur-[2px]">
      <div role="dialog" aria-modal="true" className="overlay-in w-full max-w-sm rounded-[16px] bg-[var(--surface)] p-5 shadow-[var(--shadow-3)]">
        <div className="flex gap-3 mb-4">
          <div className="mt-1">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]" style={{ animation: "pop 360ms cubic-bezier(0.34,1.56,0.64,1) 120ms both" }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-gray-950">{title}</h2>
            {description && (
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          {secondaryLabel && onSecondary && (
            <button
              type="button"
              className="btn btn-ghost cursor-pointer"
              onClick={onSecondary}
            >
              {secondaryLabel}
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary cursor-pointer"
            onClick={onPrimary}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
