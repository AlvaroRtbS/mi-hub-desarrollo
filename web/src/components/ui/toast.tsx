"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type ToastTipo = "success" | "error" | "info";

type Toast = {
  id: string;
  tipo: ToastTipo;
  mensaje: string;
};

type ToastApi = {
  show: (mensaje: string, tipo?: ToastTipo) => void;
  success: (mensaje: string) => void;
  error: (mensaje: string) => void;
  info: (mensaje: string) => void;
};

const Ctx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Fallback silencioso para que llamar a useToast sin Provider no rompa la app.
    return {
      show: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
    };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  const quitar = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (mensaje: string, tipo: ToastTipo = "info") => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, tipo, mensaje }]);
      const t = setTimeout(() => quitar(id), 4000);
      timeoutsRef.current.set(id, t);
    },
    [quitar]
  );

  useEffect(() => {
    const map = timeoutsRef.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  const api: ToastApi = {
    show,
    success: (m) => show(m, "success"),
    error: (m) => show(m, "error"),
    info: (m) => show(m, "info"),
  };

  return (
    <Ctx.Provider value={api}>
      {children}
      {/* Contenedor visual */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none max-w-sm w-[calc(100vw-2rem)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={
              "pointer-events-auto rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm flex items-start gap-3 animate-in slide-in-from-right-2 fade-in duration-200 " +
              estilosTipo[t.tipo]
            }
            role="status"
            aria-live={t.tipo === "error" ? "assertive" : "polite"}
          >
            <span className="text-base leading-tight">{iconoTipo[t.tipo]}</span>
            <div className="flex-1 text-sm leading-snug">{t.mensaje}</div>
            <button
              onClick={() => quitar(t.id)}
              className="text-neutral-500 hover:text-neutral-200 text-xs ml-2"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

const estilosTipo: Record<ToastTipo, string> = {
  success: "bg-green-950/90 border-green-900/50 text-green-100",
  error: "bg-red-950/90 border-red-900/50 text-red-100",
  info: "bg-neutral-900/95 border-neutral-800 text-neutral-100",
};

const iconoTipo: Record<ToastTipo, string> = {
  success: "✓",
  error: "✕",
  info: "ⓘ",
};
