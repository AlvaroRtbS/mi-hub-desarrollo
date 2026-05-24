"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Keyboard, X } from "lucide-react";

/**
 * Atajos de teclado globales del panel del coach.
 *
 * Se montan en cualquier página del panel y escuchan keydown:
 *   ⌘/Ctrl + K   → buscador global (lo maneja el componente BusquedaGlobal)
 *   ⌘/Ctrl + I   → ir a Inicio
 *   ⌘/Ctrl + B   → ir a Clientas
 *   ⌘/Ctrl + P   → ir a Programas
 *   ⌘/Ctrl + E   → ir a Ejercicios
 *   ⌘/Ctrl + M   → ir a Mensajes
 *   G luego N    → nueva clienta (estilo Gmail/Linear)
 *   G luego E    → nuevo ejercicio
 *   ?            → abrir la chuleta de atajos
 *   Esc          → cierra la chuleta
 *
 * Ignora los atajos si el foco está en inputs.
 */
export function AtajosGlobales() {
  const router = useRouter();
  const [chuletaAbierta, setChuletaAbierta] = useState(false);

  useEffect(() => {
    let leaderActivo = false; // para los "G luego X"
    let leaderTimeout: ReturnType<typeof setTimeout> | null = null;

    function resetLeader() {
      leaderActivo = false;
      if (leaderTimeout) {
        clearTimeout(leaderTimeout);
        leaderTimeout = null;
      }
    }

    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const enInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      // Esc siempre cierra chuleta
      if (e.key === "Escape") {
        setChuletaAbierta(false);
        resetLeader();
        return;
      }

      // ? abre la chuleta (incluso si modo lider, salvo en inputs)
      if (e.key === "?" && !enInput) {
        e.preventDefault();
        setChuletaAbierta((v) => !v);
        resetLeader();
        return;
      }

      if (enInput) return;

      // Atajos con modificador
      if (e.metaKey || e.ctrlKey) {
        const navegar = (path: string) => {
          e.preventDefault();
          router.push(path);
        };
        switch (e.key.toLowerCase()) {
          case "i":
            return navegar("/inicio");
          case "b":
            return navegar("/clientas");
          // Nota: "p" lo usa el navegador para imprimir; no lo capturamos
          // para no entorpecer la vista de impresión del editor.
          case "e":
            return navegar("/ejercicios");
          case "m":
            return navegar("/mensajes");
          case "j":
            return navegar("/calendario");
        }
        return;
      }

      // Modo "leader" G + tecla (estilo Gmail/Linear)
      if (leaderActivo) {
        const k = e.key.toLowerCase();
        if (k === "n") {
          e.preventDefault();
          router.push("/clientas/nueva");
        } else if (k === "e") {
          e.preventDefault();
          router.push("/ejercicios/nuevo");
        } else if (k === "p") {
          e.preventDefault();
          router.push("/programas/nuevo");
        }
        resetLeader();
        return;
      }

      if (e.key.toLowerCase() === "g") {
        leaderActivo = true;
        leaderTimeout = setTimeout(resetLeader, 1500);
      }
    }

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      resetLeader();
    };
  }, [router]);

  if (!chuletaAbierta) {
    // Botón flotante discreto para abrir la chuleta
    return (
      <button
        onClick={() => setChuletaAbierta(true)}
        className="fixed bottom-3 right-3 z-[90] size-9 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-500 hover:text-white hover:bg-neutral-800 grid place-items-center transition opacity-60 hover:opacity-100 md:opacity-30 md:hover:opacity-100"
        title="Ver atajos de teclado (?)"
        aria-label="Ver atajos de teclado"
      >
        <Keyboard className="size-4" />
      </button>
    );
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
      onClick={() => setChuletaAbierta(false)}
    >
      <div
        className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800">
          <h2 className="text-base font-semibold">Atajos de teclado</h2>
          <button
            onClick={() => setChuletaAbierta(false)}
            className="text-neutral-500 hover:text-white"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-5 space-y-5">
          <Seccion titulo="Navegación rápida">
            <Atajo combo={["⌘", "K"]} accion="Buscar todo" />
            <Atajo combo={["⌘", "I"]} accion="Ir a Inicio" />
            <Atajo combo={["⌘", "B"]} accion="Ir a Clientas" />
            <Atajo combo={["⌘", "E"]} accion="Ir a Ejercicios" />
            <Atajo combo={["⌘", "M"]} accion="Ir a Mensajes" />
            <Atajo combo={["⌘", "J"]} accion="Ir a Calendario" />
          </Seccion>

          <Seccion titulo="Crear (presiona G y luego la letra)">
            <Atajo combo={["G", "N"]} accion="Nueva clienta" />
            <Atajo combo={["G", "E"]} accion="Nuevo ejercicio" />
            <Atajo combo={["G", "P"]} accion="Nuevo programa" />
          </Seccion>

          <Seccion titulo="Editor de programa">
            <Atajo combo={["1", "-", "7"]} accion="Saltar al día N de la semana" />
            <Atajo combo={["⇧", "←/→"]} accion="Cambiar de semana" />
            <Atajo combo={["⌘", "Z"]} accion="Deshacer" />
          </Seccion>

          <Seccion titulo="Esta ventana">
            <Atajo combo={["?"]} accion="Mostrar / ocultar atajos" />
            <Atajo combo={["Esc"]} accion="Cerrar" />
          </Seccion>
          <p className="text-xs text-neutral-600 pt-2 border-t border-neutral-900">
            En Windows / Linux usa <kbd className="text-[10px]">Ctrl</kbd> en lugar de{" "}
            <kbd className="text-[10px]">⌘</kbd>.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Seccion({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-neutral-500 mb-2">
        {titulo}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Atajo({ combo, accion }: { combo: string[]; accion: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-neutral-200">{accion}</span>
      <div className="flex items-center gap-1">
        {combo.map((tecla, i) => (
          <kbd
            key={i}
            className="px-1.5 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-[10px] text-neutral-300 font-mono min-w-[1.4rem] text-center"
          >
            {tecla}
          </kbd>
        ))}
      </div>
    </div>
  );
}
