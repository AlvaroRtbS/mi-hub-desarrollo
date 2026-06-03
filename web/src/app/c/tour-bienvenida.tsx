"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  Camera,
  Ruler,
  MessageCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

const STORAGE_KEY = "mi-hub-c-tour-visto-v1";

type Paso = {
  icono: React.ReactNode;
  titulo: string;
  texto: string;
};

const PASOS: Paso[] = [
  {
    icono: <Sparkles className="size-7" />,
    titulo: "¡Bienvenida a tu app!",
    texto:
      "Aquí es donde verás tu entrenamiento, registrarás tus medidas, subirás fotos de tu progreso y hablarás con tu entrenador. Te enseño rápido cómo funciona.",
  },
  {
    icono: <Calendar className="size-7" />,
    titulo: "Tu entreno cada día",
    texto:
      "Abre HOY en cualquier momento y verás lo que toca: ejercicios, series y pesos. Cuando termines, marca el entreno como completado. Tu entrenador lo verá al instante.",
  },
  {
    icono: <Ruler className="size-7" />,
    titulo: "Registra tu progreso",
    texto:
      "En MEDIDAS apunta tu peso, perímetros, o lo que tu entrenador te pida. En FOTOS sube tus fotos de progreso para comparar evolución. Es rápido — sin presión.",
  },
  {
    icono: <MessageCircle className="size-7" />,
    titulo: "Habla con tu entrenador",
    texto:
      "El CHAT es para todo: dudas con un ejercicio, contarle cómo te ha ido el día, pedirle cambios. Verás respuestas rápidas para usar con un toque cuando tengas prisa.",
  },
  {
    icono: <Camera className="size-7" />,
    titulo: "Listo para empezar",
    texto:
      "Todo lo que registres aquí lo verá tu entrenador en tiempo real. Cuanta más info, mejor te puede ajustar el plan. ¡A entrenar! 💪",
  },
];

export function TourBienvenida() {
  const [paso, setPaso] = useState(0);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const yaVisto = window.localStorage.getItem(STORAGE_KEY);
    if (!yaVisto) {
      // Pequeño delay para que la página termine de hidratarse antes
      const t = setTimeout(() => setAbierto(true), 400);
      return () => clearTimeout(t);
    }
  }, []);

  function cerrar() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        STORAGE_KEY,
        new Date().toISOString()
      );
    }
    setAbierto(false);
  }

  if (!abierto) return null;
  if (typeof document === "undefined") return null;

  const p = PASOS[paso]!;
  const esUltimo = paso === PASOS.length - 1;
  const esPrimero = paso === 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
      onClick={cerrar}
    >
      <div
        className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Skip button arriba derecha */}
        <div className="flex justify-between items-center px-3 pt-3">
          <div className="flex gap-1.5">
            {PASOS.map((_, i) => (
              <span
                key={i}
                className="h-1 w-6 rounded-full transition"
                style={{
                  backgroundColor:
                    i === paso
                      ? "var(--brand)"
                      : i < paso
                        ? "color-mix(in srgb, var(--brand) 50%, transparent)"
                        : "#262626",
                }}
              />
            ))}
          </div>
          <button
            onClick={cerrar}
            className="text-neutral-500 hover:text-white p-1"
            aria-label="Cerrar tour"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Contenido del paso */}
        <div className="px-6 pt-4 pb-5 text-center">
          <div
            className="size-16 mx-auto rounded-full grid place-items-center mb-4 text-white"
            style={{ backgroundColor: "var(--brand)" }}
          >
            {p.icono}
          </div>
          <h2 className="text-lg font-semibold mb-2">{p.titulo}</h2>
          <p className="text-sm text-neutral-400 leading-relaxed">{p.texto}</p>
        </div>

        {/* Navegación */}
        <div className="border-t border-neutral-800 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => !esPrimero && setPaso(paso - 1)}
            disabled={esPrimero}
            className="text-xs text-neutral-400 hover:text-white inline-flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="size-4" />
            Atrás
          </button>
          <span className="text-xs text-neutral-600">
            {paso + 1} / {PASOS.length}
          </span>
          {esUltimo ? (
            <button
              onClick={cerrar}
              className="text-xs text-white font-medium px-3 py-1.5 rounded-full"
              style={{ backgroundColor: "var(--brand)" }}
            >
              ¡A entrenar!
            </button>
          ) : (
            <button
              onClick={() => setPaso(paso + 1)}
              className="text-xs text-white font-medium px-3 py-1.5 rounded-full inline-flex items-center gap-1"
              style={{ backgroundColor: "var(--brand)" }}
            >
              Siguiente
              <ChevronRight className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
