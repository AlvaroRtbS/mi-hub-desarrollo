"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { enviarMiMensaje } from "./acciones";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Mensaje = {
  id: string;
  contenido: string;
  remitente: "coach" | "clienta";
  enviado_en: string;
  leido: boolean;
};

function formateaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  });
}

export function ChatClienta({
  clientaId,
  mensajesIniciales,
  soloLectura = false,
}: {
  clientaId: string;
  mensajesIniciales: Mensaje[];
  /** Si es true, oculta el cuadro de escribir: la clienta responde por WhatsApp. */
  soloLectura?: boolean;
}) {
  const router = useRouter();
  const [borrador, setBorrador] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();
  const contenedorRef = useRef<HTMLDivElement>(null);

  const [mensajes, setMensajes] = useState<Mensaje[]>(mensajesIniciales);

  useEffect(() => {
    setMensajes(mensajesIniciales);
  }, [mensajesIniciales]);

  // Realtime: nuevos mensajes (típicamente del coach)
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const canal = supabase
      .channel(`mensajes-mi-chat-${clientaId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensajes",
          filter: `clienta_id=eq.${clientaId}`,
        },
        (payload) => {
          const nuevo = payload.new as Mensaje;
          setMensajes((prev) => {
            if (prev.some((m) => m.id === nuevo.id)) return prev;
            return [...prev, nuevo];
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [clientaId]);

  useEffect(() => {
    if (contenedorRef.current) {
      contenedorRef.current.scrollTop = contenedorRef.current.scrollHeight;
    }
  }, [mensajes.length]);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!borrador.trim()) return;
    setError(null);
    const texto = borrador;
    setBorrador("");
    startTransition(async () => {
      const r = await enviarMiMensaje(texto);
      if (!r.ok) {
        setError(r.error);
        setBorrador(texto);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div
      className={
        "flex flex-col mt-4 " +
        (soloLectura
          ? "max-h-[55vh]"
          : "h-[calc(100vh-220px)] min-h-[400px]")
      }
    >
      <div
        ref={contenedorRef}
        className="flex-1 overflow-y-auto py-2 space-y-3 pr-2"
      >
        {mensajes.length === 0 ? (
          <div className="text-center text-sm text-neutral-500 py-12">
            {soloLectura
              ? "Aquí verás tu conversación con tu entrenador."
              : "Aún no hay mensajes. ¡Escribe el primero!"}
          </div>
        ) : (
          mensajes.map((m) => {
            const esMia = m.remitente === "clienta";
            return (
              <div
                key={m.id}
                className={"flex " + (esMia ? "justify-end" : "justify-start")}
              >
                <div
                  className={
                    "max-w-[80%] rounded-2xl px-3 py-2 " +
                    (esMia
                      ? "bg-brand-600 text-white rounded-br-sm"
                      : "bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-bl-sm")
                  }
                >
                  <div className="text-sm whitespace-pre-wrap">{m.contenido}</div>
                  <div
                    className={
                      "text-[10px] mt-1 " +
                      (esMia ? "text-white/60" : "text-neutral-500")
                    }
                  >
                    {formateaHora(m.enviado_en)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2 mb-2">
          {error}
        </div>
      )}

      {/* Respuestas rápidas — comunes en chat coach-clienta */}
      {!soloLectura && !borrador && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 mb-1">
          {RESPUESTAS_RAPIDAS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setBorrador(r)}
              className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-600 hover:text-white"
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {!soloLectura && (
        <form
          onSubmit={enviar}
          className="border-t border-neutral-800 pt-3 flex items-end gap-2"
        >
          <textarea
            value={borrador}
            onChange={(e) => setBorrador(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviar(e);
              }
            }}
            placeholder="Escribe a tu entrenador..."
            rows={2}
            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 resize-none"
          />
          <button
            type="submit"
            disabled={enviando || !borrador.trim()}
            className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium"
          >
            {enviando ? "..." : "Enviar"}
          </button>
        </form>
      )}
    </div>
  );
}

const RESPUESTAS_RAPIDAS = [
  "✅ Hecho",
  "Voy ahora",
  "Hoy no puedo",
  "Lo muevo mañana",
  "Duda 🤔",
  "Gracias 🙏",
];
