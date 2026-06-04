"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FORMULARIO_INICIAL, type Pregunta } from "@/lib/formulario-inicial";
import { guardarFormularioInicial } from "../acciones";
import { Confetti } from "@/components/confetti";
import { useToast } from "@/components/ui/toast";

const PREGUNTAS = FORMULARIO_INICIAL.preguntas;

function CampoPregunta({
  pregunta: p,
  valor,
  onCambio,
  autoFocus,
}: {
  pregunta: Pregunta;
  valor: string;
  onCambio: (v: string) => void;
  autoFocus?: boolean;
}) {
  if (p.tipo === "parrafo") {
    return (
      <textarea
        autoFocus={autoFocus}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        placeholder={p.placeholder}
        rows={4}
        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 resize-y"
      />
    );
  }
  return (
    <div className="relative">
      <input
        autoFocus={autoFocus}
        type={p.tipo === "numero" ? "number" : p.tipo === "fecha" ? "date" : "text"}
        inputMode={p.tipo === "numero" ? "decimal" : undefined}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        placeholder={p.placeholder}
        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
      />
      {p.sufijo && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">
          {p.sufijo}
        </span>
      )}
    </div>
  );
}

export function FormularioInicial({
  respuestasIniciales,
  yaCompletado,
}: {
  respuestasIniciales: Record<string, string>;
  yaCompletado: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [respuestas, setRespuestas] =
    useState<Record<string, string>>(respuestasIniciales);
  const [error, setError] = useState<string | null>(null);
  const [celebrar, setCelebrar] = useState(false);
  const [enviando, startTransition] = useTransition();
  // Si ya lo completó, arranca en modo lista (revisar/editar rápido); si es
  // nueva, en modo asistente (una pregunta por pantalla, menos intimidante).
  const [modo, setModo] = useState<"asistente" | "lista">(
    yaCompletado ? "lista" : "asistente"
  );
  const [paso, setPaso] = useState(0);

  function set(id: string, valor: string) {
    setRespuestas((r) => ({ ...r, [id]: valor }));
  }

  function enviar() {
    setError(null);
    startTransition(async () => {
      const r = await guardarFormularioInicial(respuestas, true);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setCelebrar(true);
      setTimeout(() => setCelebrar(false), 3500);
      toast.success("¡Formulario enviado! ✓");
      router.push("/c/formularios");
      router.refresh();
    });
  }

  const total = PREGUNTAS.length;
  const textoEnviar = enviando
    ? "Enviando…"
    : yaCompletado
      ? "Guardar cambios"
      : "Enviar a mi entrenador";

  // ----- Modo lista (todas las preguntas) -----
  if (modo === "lista") {
    return (
      <div className="space-y-5">
        <Confetti trigger={celebrar} cantidad={40} duracion={2000} />
        {PREGUNTAS.map((p) => (
          <label key={p.id} className="block">
            <span className="block text-sm font-medium text-neutral-200 mb-1.5">
              {p.label}
            </span>
            <CampoPregunta pregunta={p} valor={respuestas[p.id] ?? ""} onCambio={(v) => set(p.id, v)} />
          </label>
        ))}

        {error && (
          <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <button
          onClick={enviar}
          disabled={enviando}
          className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2.5 transition"
        >
          {textoEnviar}
        </button>
        {!yaCompletado && (
          <button
            onClick={() => setModo("asistente")}
            className="w-full text-center text-xs text-neutral-500 hover:text-neutral-300"
          >
            Volver al modo guiado
          </button>
        )}
      </div>
    );
  }

  // ----- Modo asistente (una pregunta por pantalla) -----
  const p = PREGUNTAS[paso]!;
  const esUltima = paso === total - 1;

  return (
    <div className="space-y-5">
      <Confetti trigger={celebrar} cantidad={40} duracion={2000} />

      {/* Progreso */}
      <div>
        <div className="flex items-center justify-between text-xs text-neutral-500 mb-1.5">
          <span>Pregunta {paso + 1} de {total}</span>
          <button onClick={() => setModo("lista")} className="hover:text-neutral-300">
            Ver todas
          </button>
        </div>
        <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${((paso + 1) / total) * 100}%`, backgroundColor: "var(--brand)" }}
          />
        </div>
      </div>

      {/* Pregunta actual */}
      <div className="min-h-[8rem]">
        <div className="text-base font-medium text-neutral-100 mb-3">{p.label}</div>
        <CampoPregunta
          key={p.id}
          pregunta={p}
          valor={respuestas[p.id] ?? ""}
          onCambio={(v) => set(p.id, v)}
          autoFocus
        />
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Navegación */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setPaso((s) => Math.max(0, s - 1))}
          disabled={paso === 0}
          className="inline-flex items-center gap-1 rounded-lg border border-neutral-800 px-3 py-2.5 text-sm text-neutral-300 disabled:opacity-30 hover:bg-neutral-900"
        >
          <ChevronLeft className="size-4" /> Atrás
        </button>
        {esUltima ? (
          <button
            onClick={enviar}
            disabled={enviando}
            className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2.5 transition"
          >
            {textoEnviar}
          </button>
        ) : (
          <button
            onClick={() => setPaso((s) => Math.min(total - 1, s + 1))}
            className="flex-1 inline-flex items-center justify-center gap-1 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg px-4 py-2.5 transition"
          >
            Siguiente <ChevronRight className="size-4" />
          </button>
        )}
      </div>
      <p className="text-center text-xs text-neutral-600">
        Puedes dejar en blanco lo que no sepas y seguir.
      </p>
    </div>
  );
}
