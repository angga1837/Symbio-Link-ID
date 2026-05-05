"use client";

import React, { useEffect, useState } from "react";

type ToastVariant = "default" | "success" | "destructive";
type ToastOptions = { title?: string; description?: string; variant?: ToastVariant; duration?: number };

// Simple toast event-based API to mimic shadcn/toast usage
export function toast(opts: ToastOptions) {
  const event = new CustomEvent("symbio-toast", { detail: opts });
  window.dispatchEvent(event as Event);
}

export function Toaster() {
  const [toasts, setToasts] = useState<Array<{ id: string; title?: string; description?: string; variant?: ToastVariant }>>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as ToastOptions;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setToasts((t) => [...t, { id, title: detail.title, description: detail.description, variant: detail.variant || "default" }]);
      const timeout = (detail.duration ?? 4000);
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, timeout);
    };

    window.addEventListener("symbio-toast", handler as EventListener);
    return () => window.removeEventListener("symbio-toast", handler as EventListener);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 bottom-6 z-50 flex flex-col gap-3">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`max-w-sm w-full rounded-lg p-3 shadow-md border ${
            t.variant === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : t.variant === "destructive" ? "bg-rose-50 border-rose-200 text-rose-800" : "bg-white border-slate-200 text-slate-800"
          }`}
        >
          <div className="font-semibold">{t.title}</div>
          {t.description && <div className="text-sm mt-1">{t.description}</div>}
        </div>
      ))}
    </div>
  );
}

export default Toaster;
