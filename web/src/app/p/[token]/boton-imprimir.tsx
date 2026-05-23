"use client";

export function BotonImprimir() {
  function imprimir() {
    // Abrir todos los <details> antes de imprimir
    document.querySelectorAll("details").forEach((d) => d.setAttribute("open", ""));
    setTimeout(() => window.print(), 100);
  }

  return (
    <button
      onClick={imprimir}
      className="no-print text-xs px-3 py-1.5 rounded-lg border border-neutral-800 text-neutral-300 hover:bg-neutral-900"
    >
      🖨️ Imprimir / Guardar PDF
    </button>
  );
}
