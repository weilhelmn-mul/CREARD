"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CREARD Error Boundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-cm-background p-4">
      <div className="max-w-md w-full bg-cm-surface-container border border-white/10 rounded-2xl p-8 text-center shadow-2xl">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl text-red-400">error</span>
        </div>
        <h2 className="text-xl font-bold text-cm-on-surface font-[family-name:var(--font-sora)] mb-2">
          Error inesperado
        </h2>
        <p className="text-sm text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-4">
          Ocurrio un error al cargar la pagina. Intenta recargar.
        </p>
        <div className="bg-cm-surface-container-highest/60 rounded-xl p-3 mb-4 text-left overflow-auto max-h-32">
          <p className="text-xs text-red-400 font-mono break-all">{error.message}</p>
          {error.digest && (
            <p className="text-[10px] text-cm-on-surface-variant mt-1">Digest: {error.digest}</p>
          )}
        </div>
        <button
          onClick={reset}
          className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-cm-on-primary bg-cm-primary hover:brightness-110 transition-all font-[family-name:var(--font-inter)]"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}