"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Boton } from "@/components/ui/boton";
import { enviarMensaje, simularMensajeClienta } from "../acciones";
import {
  PLANTILLAS,
  rellenarPlantilla,
  type PlantillaMensaje,
  type DatosClientaParaPlantilla,
} from "@/lib/plantillas-mensajes";
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

export function Conversacion({
  clientaId,
  clientaNombre,
  mensajesIniciales,
  datosPlantilla,
}: {
  clientaId: string;
  clientaNombre: string;
  mensajesIniciales: Mensaje[];
  datosPlantilla?: Omit<DatosClientaParaPlantilla, "nombre">;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [borrador, setBorrador] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();
  const [mostrandoDebug, setMostrandoDebug] = useState(false);
  const [mostrandoPlantillas, setMostrandoPlantillas] = useState(false);
  const [filtroPlantillas, setFiltroPlantillas] = useState<string>("todas");
  const contenedorRef = useRef<HTMLDivElement>(null);

  // Si la URL trae ?plantilla=<id>, precarga el borrador con esa plantilla
  // ya rellenada con los datos de la clienta. Usado por SugerenciasHoy
  // para que el coach abra el chat con el mensaje listo.
  useEffect(() => {
    const id = searchParams?.get("plantilla");
    if (!id) return;
    const p = PLANTILLAS.find((x) => x.id === id);
    if (p) {
      setBorrador(
        rellenarPlantilla(p, {
          nombre: clientaNombre,
          ...(datosPlantilla ?? {}),
        })
      );
    }
    // limpia el query string sin recargar para no rellenar dos veces
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("plantilla");
      window.history.replaceState({}, "", url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Estado local — arranca con lo del server y se actualiza vía Realtime
  const [mensajes, setMensajes] = useState<Mensaje[]>(mensajesIniciales);

  // Re-sync cuando el server pasa nuevos iniciales (ej. tras router.refresh tras enviar)
  useEffect(() => {
    setMensajes(mensajesIniciales);
  }, [mensajesIniciales]);

  // Suscripción a inserts en tabla mensajes filtrados por clienta_id
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const canal = supabase
      .channel(`mensajes-clienta-${clientaId}`)
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

  function insertarPlantilla(p: PlantillaMensaje) {
    setBorrador(
      rellenarPlantilla(p, {
        nombre: clientaNombre,
        ...(datosPlantilla ?? {}),
      })
    );
    setMostrandoPlantillas(false);
  }

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
      const r = await enviarMensaje(clientaId, texto);
      if (!r.ok) {
        setError(r.error);
        setBorrador(texto);
        return;
      }
      router.refresh();
    });
  }

  function simular() {
    const texto = prompt(
      "Simular mensaje entrante de la clienta (solo para pruebas):"
    );
    if (!texto?.trim()) return;
    startTransition(async () => {
      const r = await simularMensajeClienta(clientaId, texto);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="mt-4 flex flex-col h-[calc(100vh-220px)] min-h-[400px]">
      <div
        ref={contenedorRef}
        className="flex-1 overflow-y-auto py-4 space-y-3 pr-2"
      >
        {mensajes.length === 0 ? (
          <div className="text-center text-sm text-neutral-500 py-12">
            No hay mensajes aún. Escribe el primero.
          </div>
        ) : (
          mensajes.map((m) => {
            const esCoach = m.remitente === "coach";
            return (
              <div
                key={m.id}
                className={
                  "flex " + (esCoach ? "justify-end" : "justify-start")
                }
              >
                <div
                  className={
                    "max-w-[75%] rounded-2xl px-4 py-2 " +
                    (esCoach
                      ? "bg-brand-600 text-white rounded-br-sm"
                      : "bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-bl-sm")
                  }
                >
                  <div className="text-sm whitespace-pre-wrap">{m.contenido}</div>
                  <div
                    className={
                      "text-[10px] mt-1 " +
                      (esCoach ? "text-white/60" : "text-neutral-500")
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

      {mostrandoPlantillas && (
        <div className="border-t border-neutral-800 pt-3 pb-2">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-neutral-400">Plantillas</div>
            <div className="flex gap-1 flex-wrap">
              {(["todas", "saludos", "seguimiento", "motivacion", "tecnica", "informativos"] as const).map(
                (c) => (
                  <button
                    key={c}
                    onClick={() => setFiltroPlantillas(c)}
                    className={
                      "text-[10px] px-2 py-0.5 rounded-full border " +
                      (filtroPlantillas === c
                        ? "bg-brand-600 border-brand-600 text-white"
                        : "border-neutral-800 text-neutral-400 hover:text-white")
                    }
                  >
                    {c === "todas" ? "Todas" : c}
                  </button>
                )
              )}
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1">
            {PLANTILLAS.filter(
              (p) => filtroPlantillas === "todas" || p.categoria === filtroPlantillas
            ).map((p) => (
              <button
                key={p.id}
                onClick={() => insertarPlantilla(p)}
                className="text-left bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg px-2 py-1.5"
              >
                <div className="text-xs font-medium text-neutral-200 truncate">{p.titulo}</div>
                <div className="text-[10px] text-neutral-500 truncate">
                  {rellenarPlantilla(p, {
                    nombre: clientaNombre,
                    ...(datosPlantilla ?? {}),
                  }).slice(0, 80)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

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
          placeholder="Escribe un mensaje... (Enter para enviar, Shift+Enter para salto de línea)"
          rows={2}
          className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 resize-none"
        />
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setMostrandoPlantillas((v) => !v)}
            className="text-xs text-neutral-500 hover:text-brand-500 px-2 py-1 rounded border border-neutral-800 hover:border-neutral-700"
            title="Plantillas de mensajes"
          >
            {mostrandoPlantillas ? "✕" : "📝"}
          </button>
          <Boton type="submit" disabled={enviando || !borrador.trim()}>
            {enviando ? "..." : "Enviar"}
          </Boton>
        </div>
      </form>

      <div className="mt-2 flex justify-end">
        <button
          onClick={() => setMostrandoDebug((v) => !v)}
          className="text-[10px] text-neutral-700 hover:text-neutral-500"
        >
          {mostrandoDebug ? "Ocultar pruebas" : "Pruebas"}
        </button>
      </div>

      {mostrandoDebug && (
        <div className="mt-2 border border-dashed border-neutral-800 rounded-lg p-3 text-xs text-neutral-500">
          <div className="mb-2">
            Cuando se active WhatsApp, los mensajes de tus clientas llegarán
            automáticamente aquí. De momento, puedes simular uno para probar:
          </div>
          <button
            onClick={simular}
            className="text-xs text-brand-500 hover:text-brand-400"
          >
            Simular mensaje entrante de la clienta
          </button>
        </div>
      )}
    </div>
  );
}
