"use client";

import { useState, useRef } from "react";
import { formatearFecha } from "@/lib/utilidades";

export function ComparadorAntesDespues({
  antesUrl,
  despuesUrl,
  antesFecha,
  despuesFecha,
}: {
  antesUrl: string;
  despuesUrl: string;
  antesFecha: string;
  despuesFecha: string;
}) {
  const [posicion, setPosicion] = useState(50); // 0 = todo antes, 100 = todo después
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [arrastrando, setArrastrando] = useState(false);

  function actualizarPosicion(clientX: number) {
    const cont = contenedorRef.current;
    if (!cont) return;
    const rect = cont.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosicion(pct);
  }

  return (
    <div className="space-y-3">
      <div
        ref={contenedorRef}
        className="relative w-full aspect-[3/4] max-w-md mx-auto bg-neutral-900 rounded-2xl overflow-hidden select-none touch-none"
        onMouseMove={(e) => arrastrando && actualizarPosicion(e.clientX)}
        onMouseUp={() => setArrastrando(false)}
        onMouseLeave={() => setArrastrando(false)}
        onTouchMove={(e) => {
          if (e.touches[0]) actualizarPosicion(e.touches[0].clientX);
        }}
      >
        {/* Foto "después" de fondo (completa) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={despuesUrl}
          alt="Después"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Foto "antes" con clip-path para mostrar solo la parte izquierda */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${posicion}%` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={antesUrl}
            alt="Antes"
            className="absolute inset-0 h-full object-cover"
            style={{
              width: contenedorRef.current
                ? `${contenedorRef.current.getBoundingClientRect().width}px`
                : "100%",
              maxWidth: "none",
            }}
          />
        </div>

        {/* Línea divisoria + agarradera */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-white pointer-events-none"
          style={{ left: `calc(${posicion}% - 2px)` }}
        />
        <button
          type="button"
          aria-label="Arrastra para comparar"
          className="absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white text-neutral-900 flex items-center justify-center shadow-xl cursor-ew-resize"
          style={{ left: `calc(${posicion}% - 20px)` }}
          onMouseDown={() => setArrastrando(true)}
          onTouchStart={() => setArrastrando(true)}
        >
          ⇆
        </button>

        {/* Etiquetas */}
        <div className="absolute top-3 left-3 text-[10px] uppercase tracking-wide bg-black/60 text-white px-2 py-1 rounded">
          Antes
        </div>
        <div className="absolute top-3 right-3 text-[10px] uppercase tracking-wide bg-black/60 text-white px-2 py-1 rounded">
          Después
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        value={posicion}
        onChange={(e) => setPosicion(Number(e.target.value))}
        className="w-full max-w-md mx-auto block accent-brand-600"
        aria-label="Deslizador comparador"
      />

      <div className="flex justify-between max-w-md mx-auto text-xs text-neutral-500">
        <span>{formatearFecha(antesFecha)}</span>
        <span>{formatearFecha(despuesFecha)}</span>
      </div>
    </div>
  );
}
