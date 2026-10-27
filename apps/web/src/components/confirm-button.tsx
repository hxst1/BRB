"use client";

import { useState } from "react";
import { useMessages } from "@/lib/i18n/client";

/** Confirmación en línea en vez de un diálogo del navegador. */
export function ConfirmButton({ label, confirmLabel, onConfirm }: { label: string; confirmLabel: string; onConfirm: () => void }) {
  const [asking, setAsking] = useState(false);
  const m = useMessages();
  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className="text-sm text-muted hover:text-ink">
        {label}
      </button>
    );
  }
  return (
    <>
      <button type="button" onClick={onConfirm} className="text-sm font-medium text-danger">
        {confirmLabel}
      </button>
      <button type="button" onClick={() => setAsking(false)} className="text-sm text-muted hover:text-ink">
        {m.run.no}
      </button>
    </>
  );
}
