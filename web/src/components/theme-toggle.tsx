"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Coffee } from "lucide-react";

export type Tema = "dark" | "light" | "cream";
const STORAGE_KEY = "mh-theme";

function leerTema(): Tema {
  if (typeof window === "undefined") return "dark";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "light" || v === "cream" ? v : "dark";
}

function aplicarTema(t: Tema) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = t;
  try {
    window.localStorage.setItem(STORAGE_KEY, t);
  } catch {
    // ignorar (modo incógnito puede bloquear)
  }
}

/**
 * Toggle de tema con 3 opciones. Persiste en localStorage. Se sincroniza
 * con el script inline del layout que aplica el tema antes de la hidratación
 * para evitar el flash de tema incorrecto.
 */
export function ThemeToggle({
  compacto = false,
}: {
  compacto?: boolean;
}) {
  const [tema, setTema] = useState<Tema>("dark");
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setTema(leerTema());
    setMontado(true);
  }, []);

  function cambiar(nuevo: Tema) {
    setTema(nuevo);
    aplicarTema(nuevo);
  }

  const opciones: Array<{ id: Tema; icono: React.ReactNode; label: string }> = [
    { id: "dark", icono: <Moon className="size-4" />, label: "Oscuro" },
    { id: "light", icono: <Sun className="size-4" />, label: "Claro" },
    { id: "cream", icono: <Coffee className="size-4" />, label: "Crema" },
  ];

  // Para evitar mismatch SSR/cliente, no renderizamos el estado activo
  // hasta que esté montado en cliente.
  return (
    <div
      className={
        "inline-flex items-center gap-1 p-1 rounded-full border border-neutral-800 bg-neutral-900/50"
      }
      role="radiogroup"
      aria-label="Tema de la interfaz"
    >
      {opciones.map((opt) => {
        const activo = montado && tema === opt.id;
        return (
          <button
            key={opt.id}
            role="radio"
            aria-checked={activo}
            onClick={() => cambiar(opt.id)}
            title={opt.label}
            className={
              "rounded-full transition flex items-center gap-1.5 " +
              (compacto ? "p-1.5" : "px-3 py-1.5") +
              " " +
              (activo
                ? "text-white"
                : "text-neutral-400 hover:text-white")
            }
            style={
              activo ? { backgroundColor: "var(--brand)" } : undefined
            }
          >
            {opt.icono}
            {!compacto && <span className="text-xs">{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Script inline para aplicar el tema ANTES de la hidratación.
 * Evita el flash de pantalla en oscuro y luego cambio a claro/crema.
 *
 * Renderizar en <head> del layout raíz:
 *   <ScriptTema />
 */
export function ScriptTema() {
  return (
    <script
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: `
(function () {
  try {
    var t = localStorage.getItem('${STORAGE_KEY}');
    if (t === 'light' || t === 'cream') {
      document.documentElement.dataset.theme = t;
    }
  } catch (e) {}
})();
        `,
      }}
    />
  );
}
