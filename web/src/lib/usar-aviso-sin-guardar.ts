"use client";

import { useEffect } from "react";

/**
 * Avisa antes de abandonar una pantalla con cambios sin guardar.
 *
 * Por qué existe: los editores de programa acumulan mucho trabajo en memoria
 * (un mesociclo de 12 semanas son 40 minutos largos) y hasta agosto de 2026 se
 * podía perder entero sin un solo aviso — bastaba un clic en el menú lateral o
 * el atajo de teclado global. No había borrador local ni forma de recuperarlo.
 *
 * Cubre las tres vías por las que se sale de una pantalla:
 *  1. Cerrar o recargar la pestaña  → `beforeunload` (el navegador pone su
 *     propio diálogo; el texto no se puede personalizar, es cosa suya).
 *  2. Clic en un enlace interno     → se intercepta en fase de captura, antes
 *     de que el router de Next se entere.
 *  3. Atajos de teclado globales    → publican `rtbs:navegar-fuera`, que aquí
 *     se cancela si el usuario dice que no.
 */
export function usarAvisoSinGuardar(
  sucio: boolean,
  mensaje = "Tienes cambios sin guardar. Si sales ahora se pierden.\n\n¿Seguro que quieres salir?"
) {
  useEffect(() => {
    if (!sucio) return;

    // 1) Cerrar pestaña o recargar.
    const alCerrar = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    // 2) Clics en enlaces internos. Captura para adelantarse al router.
    const alHacerClic = (e: MouseEvent) => {
      // Respetar clic con modificador (abrir en pestaña nueva) y botón central.
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (e.button !== 0) return;

      const enlace = (e.target as HTMLElement | null)?.closest?.("a");
      if (!enlace) return;

      const href = enlace.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (enlace.target && enlace.target !== "_self") return;
      // Enlaces a otro dominio: los cubre `beforeunload`.
      if (/^https?:\/\//i.test(href) && !href.startsWith(window.location.origin)) return;
      // Salir a la misma ruta no pierde nada.
      if (href === window.location.pathname) return;

      if (!window.confirm(mensaje)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // 3) Navegación por atajo de teclado.
    const alNavegarFuera = (e: Event) => {
      if (!window.confirm(mensaje)) e.preventDefault();
    };

    window.addEventListener("beforeunload", alCerrar);
    document.addEventListener("click", alHacerClic, true);
    window.addEventListener("rtbs:navegar-fuera", alNavegarFuera);

    return () => {
      window.removeEventListener("beforeunload", alCerrar);
      document.removeEventListener("click", alHacerClic, true);
      window.removeEventListener("rtbs:navegar-fuera", alNavegarFuera);
    };
  }, [sucio, mensaje]);
}

/**
 * Lo llaman los atajos globales antes de navegar. Devuelve false si alguna
 * pantalla con cambios sin guardar ha cancelado la salida.
 */
export function puedeNavegarFuera(): boolean {
  const evento = new CustomEvent("rtbs:navegar-fuera", { cancelable: true });
  return window.dispatchEvent(evento);
}
