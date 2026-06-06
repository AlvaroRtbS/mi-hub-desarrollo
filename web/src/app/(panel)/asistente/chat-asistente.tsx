"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";

type Mensaje = { role: "user" | "assistant"; content: string };

const SUGERENCIAS = [
  "¿Qué clientas necesitan mi atención hoy?",
  "¿Quién no ha entrenado esta semana?",
  "¿Quién tiene mensajes sin leer o check-in pendiente?",
  "Resume cómo va cada clienta.",
];

export function ChatAsistente() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, cargando]);

  async function enviar(texto: string) {
    const pregunta = texto.trim();
    if (!pregunta || cargando) return;
    const nuevos = [...mensajes, { role: "user" as const, content: pregunta }];
    setMensajes(nuevos);
    setInput("");
    setCargando(true);
    try {
      const res = await fetch("/api/ia/chat-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta, historial: mensajes }),
      });
      const data = await res.json();
      setMensajes([
        ...nuevos,
        {
          role: "assistant",
          content: data.ok ? data.respuesta : `⚠️ ${data.error || "Error al responder."}`,
        },
      ]);
    } catch {
      setMensajes([...nuevos, { role: "assistant", content: "⚠️ No se pudo conectar con el asistente." }]);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {mensajes.length === 0 && (
          <div className="text-center py-10">
            <Sparkles className="size-8 text-brand-500 mx-auto mb-3" />
            <p className="text-sm text-neutral-400 mb-4">
              Pregúntame sobre tus clientas. Respondo con sus datos reales (adherencia,
              actividad, peso, check-ins, mensajes).
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
              {SUGERENCIAS.map((s) => (
                <button
                  key={s}
                  onClick={() => enviar(s)}
                  className="text-xs rounded-full border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:bg-neutral-800"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {mensajes.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-brand-600 text-white"
                  : "bg-neutral-900 border border-neutral-800 text-neutral-100"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {cargando && (
          <div className="flex justify-start">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-2.5 text-sm text-neutral-400">
              Pensando…
            </div>
          </div>
        )}
        <div ref={finRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(input);
        }}
        className="flex items-center gap-2 border-t border-neutral-800 pt-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pregunta sobre tus clientas…"
          className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500"
        />
        <button
          type="submit"
          disabled={cargando || !input.trim()}
          className="inline-flex items-center justify-center size-10 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white shrink-0"
          aria-label="Enviar"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}
