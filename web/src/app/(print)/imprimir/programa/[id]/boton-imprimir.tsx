"use client";

import { useEffect } from "react";
import { Printer, X } from "lucide-react";

export function BotonImprimir() {
  // Si la URL trae ?auto=1, dispara el diálogo de impresión solo.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("auto") === "1") {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <div className="no-print sticky top-0 z-10 bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between shadow-sm">
      <div className="text-sm text-neutral-600">
        Vista de impresión. Usa{" "}
        <kbd className="px-1.5 py-0.5 bg-neutral-100 rounded text-xs">⌘P</kbd>{" "}
        /{" "}
        <kbd className="px-1.5 py-0.5 bg-neutral-100 rounded text-xs">
          Ctrl+P
        </kbd>{" "}
        para guardar como PDF.
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-900 text-white text-sm rounded hover:bg-neutral-800"
        >
          <Printer className="size-4" />
          Imprimir / Guardar PDF
        </button>
        <button
          onClick={() => window.close()}
          className="inline-flex items-center gap-1 px-2 py-1.5 text-sm text-neutral-600 hover:text-neutral-900"
          aria-label="Cerrar"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
