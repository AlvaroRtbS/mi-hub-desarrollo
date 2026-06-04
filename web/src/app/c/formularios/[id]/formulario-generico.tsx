"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  type Formulario,
  type PreguntaForm,
  respuestaVacia,
} from "@/lib/formularios";
import { guardarRespuestaFormulario } from "../acciones";
import { Confetti } from "@/components/confetti";
import { useToast } from "@/components/ui/toast";

type Valor = string | string[];

export function FormularioGenerico({
  asignacionId,
  formulario,
  respuestasIniciales,
  yaCompletado,
}: {
  asignacionId: string;
  formulario: Formulario;
  respuestasIniciales: Record<string, Valor>;
  yaCompletado: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [respuestas, setRespuestas] =
    useState<Record<string, Valor>>(respuestasIniciales);
  const [error, setError] = useState<string | null>(null);
  const [celebrar, setCelebrar] = useState(false);
  const [enviando, startTransition] = useTransition();

  function set(id: string, valor: Valor) {
    setRespuestas((r) => ({ ...r, [id]: valor }));
  }

  function toggleMultiple(id: string, opcion: string) {
    setRespuestas((r) => {
      const actual = Array.isArray(r[id]) ? (r[id] as string[]) : [];
      const nuevo = actual.includes(opcion)
        ? actual.filter((o) => o !== opcion)
        : [...actual, opcion];
      return { ...r, [id]: nuevo };
    });
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validación de preguntas obligatorias.
    const faltan = formulario.preguntas.filter(
      (p) => p.requerida && respuestaVacia(respuestas[p.id])
    );
    if (faltan.length > 0) {
      setError(`Faltan respuestas obligatorias: ${faltan.map((p) => p.label).join(", ")}`);
      return;
    }

    startTransition(async () => {
      const r = await guardarRespuestaFormulario(asignacionId, respuestas, true);
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

  return (
    <form onSubmit={enviar} className="space-y-5">
      <Confetti trigger={celebrar} cantidad={40} duracion={2000} />

      {formulario.preguntas.map((p) => (
        <CampoPregunta
          key={p.id}
          pregunta={p}
          valor={respuestas[p.id]}
          onTexto={(v) => set(p.id, v)}
          onToggle={(op) => toggleMultiple(p.id, op)}
        />
      ))}

      {error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2.5 transition"
      >
        {enviando ? "Enviando…" : yaCompletado ? "Guardar cambios" : "Enviar a mi entrenador"}
      </button>
      {yaCompletado && (
        <p className="text-center text-xs text-neutral-500">
          Ya lo enviaste. Puedes actualizar tus respuestas cuando quieras.
        </p>
      )}
    </form>
  );
}

function CampoPregunta({
  pregunta: p,
  valor,
  onTexto,
  onToggle,
}: {
  pregunta: PreguntaForm;
  valor: Valor | undefined;
  onTexto: (v: string) => void;
  onToggle: (opcion: string) => void;
}) {
  const texto = typeof valor === "string" ? valor : "";
  const seleccionadas = Array.isArray(valor) ? valor : [];

  return (
    <div className="block">
      <span className="block text-sm font-medium text-neutral-200 mb-1.5">
        {p.label}
        {p.requerida && <span className="text-red-400"> *</span>}
      </span>

      {p.tipo === "parrafo" && (
        <textarea
          value={texto}
          onChange={(e) => onTexto(e.target.value)}
          placeholder={p.placeholder}
          rows={3}
          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 resize-y"
        />
      )}

      {(p.tipo === "texto" || p.tipo === "numero" || p.tipo === "fecha") && (
        <div className="relative">
          <input
            type={p.tipo === "numero" ? "number" : p.tipo === "fecha" ? "date" : "text"}
            inputMode={p.tipo === "numero" ? "decimal" : undefined}
            value={texto}
            onChange={(e) => onTexto(e.target.value)}
            placeholder={p.placeholder}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
          />
          {p.sufijo && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">
              {p.sufijo}
            </span>
          )}
        </div>
      )}

      {p.tipo === "escala" && (
        <div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => {
              const activo = texto === String(n);
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => onTexto(String(n))}
                  className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
                    activo
                      ? "bg-brand-600 border-brand-600 text-white"
                      : "bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-600"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
          {(p.etiquetaMin || p.etiquetaMax) && (
            <div className="flex justify-between text-xs text-neutral-500 mt-1">
              <span>{p.etiquetaMin}</span>
              <span>{p.etiquetaMax}</span>
            </div>
          )}
        </div>
      )}

      {p.tipo === "eleccion" && (
        <div className="space-y-2">
          {(p.opciones ?? []).map((op) => (
            <label
              key={op}
              className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm cursor-pointer transition ${
                texto === op
                  ? "bg-brand-950 border-brand-600"
                  : "bg-neutral-950 border-neutral-800 hover:border-neutral-600"
              }`}
            >
              <input
                type="radio"
                name={p.id}
                checked={texto === op}
                onChange={() => onTexto(op)}
                className="accent-brand-600"
              />
              <span>{op}</span>
            </label>
          ))}
        </div>
      )}

      {p.tipo === "multiple" && (
        <div className="space-y-2">
          {(p.opciones ?? []).map((op) => {
            const marcada = seleccionadas.includes(op);
            return (
              <label
                key={op}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm cursor-pointer transition ${
                  marcada
                    ? "bg-brand-950 border-brand-600"
                    : "bg-neutral-950 border-neutral-800 hover:border-neutral-600"
                }`}
              >
                <input
                  type="checkbox"
                  checked={marcada}
                  onChange={() => onToggle(op)}
                  className="accent-brand-600"
                />
                <span>{op}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
