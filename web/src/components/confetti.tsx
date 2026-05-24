"use client";

import { useEffect, useRef } from "react";

/**
 * Lluvia de confeti CSS pura (sin librerías).
 * Lanza N partículas que caen con física simple + rotación.
 *
 * Uso:
 *   <Confetti trigger={completado} />
 *
 * Cada vez que `trigger` cambia a true, dispara una emisión.
 */
export function Confetti({
  trigger,
  duracion = 2500,
  cantidad = 80,
}: {
  trigger: boolean;
  duracion?: number;
  cantidad?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastTrigger = useRef(trigger);

  useEffect(() => {
    if (!trigger || trigger === lastTrigger.current) {
      lastTrigger.current = trigger;
      return;
    }
    lastTrigger.current = trigger;
    if (typeof window === "undefined") return;

    const cont = ref.current;
    if (!cont) return;

    // Respeta prefers-reduced-motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const colores = [
      getComputedStyle(document.documentElement)
        .getPropertyValue("--brand")
        .trim() || "#16a34a",
      "#facc15",
      "#fb7185",
      "#60a5fa",
      "#a78bfa",
      "#34d399",
    ];

    const piezas: HTMLSpanElement[] = [];
    for (let i = 0; i < cantidad; i++) {
      const span = document.createElement("span");
      const color = colores[Math.floor(Math.random() * colores.length)]!;
      const size = 6 + Math.random() * 6;
      const startX = 50 + (Math.random() - 0.5) * 60; // % horizontal
      const endX = startX + (Math.random() - 0.5) * 40;
      const duracionMs = duracion + Math.random() * 800;
      const delayMs = Math.random() * 200;
      const rot = Math.random() * 720 - 360;

      span.style.cssText = `
        position: absolute;
        left: ${startX}%;
        top: 30%;
        width: ${size}px;
        height: ${size * 0.4}px;
        background: ${color};
        border-radius: 1px;
        pointer-events: none;
        will-change: transform, opacity;
        animation: mh-confetti ${duracionMs}ms ease-out ${delayMs}ms forwards;
        --end-x: ${endX - startX}vw;
        --end-rot: ${rot}deg;
      `;
      cont.appendChild(span);
      piezas.push(span);
    }

    const limpiar = setTimeout(() => {
      piezas.forEach((p) => p.remove());
    }, duracion + 1500);

    return () => {
      clearTimeout(limpiar);
      piezas.forEach((p) => p.remove());
    };
  }, [trigger, duracion, cantidad]);

  return (
    <>
      <div
        ref={ref}
        aria-hidden
        className="fixed inset-0 pointer-events-none overflow-hidden z-[300]"
      />
      <style>{`
        @keyframes mh-confetti {
          0%   { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          100% {
            transform: translate(var(--end-x, 0), 80vh) rotate(var(--end-rot, 0deg));
            opacity: 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes mh-confetti { 0%, 100% { opacity: 0; } }
        }
      `}</style>
    </>
  );
}
