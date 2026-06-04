"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Eye,
} from "lucide-react";
import {
  type PreguntaForm,
  type TipoPregunta,
  TIPOS_PREGUNTA,
  nuevoIdPregunta,
  usaOpciones,
  usaEscala,
} from "@/lib/formularios";
import {
  actualizarFormulario,
  eliminarFormulario,
  asignarFormulario,
  desasignarFormulario,
} from "../acciones";
import { useToast } from "@/components/ui/toast";

type Clienta = { id: string; nombre: string; apellidos: string | null };
type Asignacion = {
  id: string;
  clienta_id: string;
  completado: boolean;
  completado_en: string | null;
};

export function Constructor({
  formularioId,
  tituloInicial,
  descripcionInicial,
  preguntasIniciales,
  clientas,
  asignaciones,
}: {
  formularioId: string;
  tituloInicial: string;
  descripcionInicial: string;
  preguntasIniciales: PreguntaForm[];
  clientas: Clienta[];
  asignaciones: Asignacion[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [titulo, setTitulo] = useState(tituloInicial);
  const [descripcion, setDescripcion] = useState(descripcionInicial);
  const [preguntas, setPreguntas] = useState<PreguntaForm[]>(preguntasIniciales);
  const [guardando, startGuardar] = useTransition();
  const [, startAsignar] = useTransition();

  const asignacionPorClienta = new Map(asignaciones.map((a) => [a.clienta_id, a]));

  function actualizarPregunta(idx: number, cambios: Partial<PreguntaForm>) {
    setPreguntas((ps) => ps.map((p, i) => (i === idx ? { ...p, ...cambios } : p)));
  }

  function añadirPregunta() {
    setPreguntas((ps) => [
      ...ps,
      { id: nuevoIdPregunta(ps), label: "", tipo: "texto" as TipoPregunta },
    ]);
  }

  function borrarPregunta(idx: number) {
    setPreguntas((ps) => ps.filter((_, i) => i !== idx));
  }

  function mover(idx: number, dir: -1 | 1) {
    setPreguntas((ps) => {
      const destino = idx + dir;
      if (destino < 0 || destino >= ps.length) return ps;
      const copia = [...ps];
      [copia[idx], copia[destino]] = [copia[destino], copia[idx]];
      return copia;
    });
  }

  function guardar() {
    // Limpieza: quita opciones vacías y exige label en cada pregunta.
    const limpias: PreguntaForm[] = preguntas.map((p) => ({
      ...p,
      opciones: usaOpciones(p.tipo)
        ? (p.opciones ?? []).map((o) => o.trim()).filter(Boolean)
        : undefined,
      etiquetaMin: usaEscala(p.tipo) ? p.etiquetaMin : undefined,
      etiquetaMax: usaEscala(p.tipo) ? p.etiquetaMax : undefined,
    }));

    const sinLabel = limpias.find((p) => !p.label.trim());
    if (sinLabel) {
      toast.error("Todas las preguntas necesitan un enunciado.");
      return;
    }
    const sinOpciones = limpias.find(
      (p) => usaOpciones(p.tipo) && (p.opciones ?? []).length === 0
    );
    if (sinOpciones) {
      toast.error(`"${sinOpciones.label}" necesita al menos una opción.`);
      return;
    }

    startGuardar(async () => {
      const r = await actualizarFormulario(formularioId, {
        titulo,
        descripcion: descripcion || null,
        preguntas: limpias,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Formulario guardado ✓");
      router.refresh();
    });
  }

  function borrarFormulario() {
    if (!confirm("¿Borrar este formulario y todas sus asignaciones? No se puede deshacer.")) {
      return;
    }
    startGuardar(async () => {
      const r = await eliminarFormulario(formularioId);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Formulario borrado");
      router.push("/formularios");
    });
  }

  function toggleAsignar(clientaId: string, asignada: boolean) {
    startAsignar(async () => {
      const r = asignada
        ? await desasignarFormulario(formularioId, clientaId)
        : await asignarFormulario(formularioId, clientaId);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      {/* Cabecera editable */}
      <div className="space-y-3">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título del formulario"
          className="w-full bg-transparent text-2xl font-semibold focus:outline-none border-b border-transparent focus:border-neutral-700 pb-1"
        />
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Descripción o instrucciones (opcional)"
          rows={2}
          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 resize-y"
        />
      </div>

      {/* Preguntas */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wide">
          Preguntas
        </h2>
        {preguntas.length === 0 && (
          <p className="text-sm text-neutral-500">
            Aún no hay preguntas. Añade la primera abajo.
          </p>
        )}
        {preguntas.map((p, idx) => (
          <EditorPregunta
            key={p.id}
            pregunta={p}
            indice={idx}
            total={preguntas.length}
            onCambio={(c) => actualizarPregunta(idx, c)}
            onBorrar={() => borrarPregunta(idx)}
            onMover={(dir) => mover(idx, dir)}
          />
        ))}
        <button
          onClick={añadirPregunta}
          className="inline-flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 font-medium"
        >
          <Plus className="size-4" /> Añadir pregunta
        </button>
      </div>

      {/* Acciones de guardado */}
      <div className="flex items-center gap-3 border-t border-neutral-800 pt-4">
        <button
          onClick={guardar}
          disabled={guardando}
          className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition"
        >
          <Save className="size-4" />
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        <button
          onClick={borrarFormulario}
          disabled={guardando}
          className="inline-flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 ml-auto"
        >
          <Trash2 className="size-4" /> Borrar formulario
        </button>
      </div>

      {/* Asignación a clientas */}
      <div className="space-y-3 border-t border-neutral-800 pt-6">
        <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wide">
          Asignar a clientas
        </h2>
        {clientas.length === 0 ? (
          <p className="text-sm text-neutral-500">No tienes clientas todavía.</p>
        ) : (
          <div className="space-y-1.5">
            {clientas.map((c) => {
              const asig = asignacionPorClienta.get(c.id);
              const asignada = !!asig;
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-lg border border-neutral-800 px-3 py-2"
                >
                  <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={asignada}
                      onChange={() => toggleAsignar(c.id, asignada)}
                      className="accent-brand-600 size-4"
                    />
                    <span className="text-sm truncate">
                      {c.nombre} {c.apellidos ?? ""}
                    </span>
                  </label>
                  {asignada && (
                    <>
                      <span className="text-xs shrink-0">
                        {asig!.completado ? (
                          <span className="text-emerald-400">✓ Completado</span>
                        ) : (
                          <span className="text-amber-400">Pendiente</span>
                        )}
                      </span>
                      {asig!.completado && (
                        <Link
                          href={`/formularios/${formularioId}/r/${asig!.id}`}
                          className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 shrink-0"
                        >
                          <Eye className="size-3.5" /> Ver
                        </Link>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EditorPregunta({
  pregunta: p,
  indice,
  total,
  onCambio,
  onBorrar,
  onMover,
}: {
  pregunta: PreguntaForm;
  indice: number;
  total: number;
  onCambio: (c: Partial<PreguntaForm>) => void;
  onBorrar: () => void;
  onMover: (dir: -1 | 1) => void;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <input
          value={p.label}
          onChange={(e) => onCambio({ label: e.target.value })}
          placeholder={`Pregunta ${indice + 1}`}
          className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
        />
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => onMover(-1)}
            disabled={indice === 0}
            className="p-1.5 text-neutral-500 hover:text-neutral-200 disabled:opacity-30"
            aria-label="Subir"
          >
            <ArrowUp className="size-4" />
          </button>
          <button
            onClick={() => onMover(1)}
            disabled={indice === total - 1}
            className="p-1.5 text-neutral-500 hover:text-neutral-200 disabled:opacity-30"
            aria-label="Bajar"
          >
            <ArrowDown className="size-4" />
          </button>
          <button
            onClick={onBorrar}
            className="p-1.5 text-neutral-500 hover:text-red-400"
            aria-label="Borrar pregunta"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={p.tipo}
          onChange={(e) => onCambio({ tipo: e.target.value as TipoPregunta })}
          className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-brand-500"
        >
          {TIPOS_PREGUNTA.map((t) => (
            <option key={t.tipo} value={t.tipo}>
              {t.label}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm text-neutral-400 cursor-pointer">
          <input
            type="checkbox"
            checked={!!p.requerida}
            onChange={(e) => onCambio({ requerida: e.target.checked })}
            className="accent-brand-600"
          />
          Obligatoria
        </label>

        {(p.tipo === "texto" || p.tipo === "parrafo" || p.tipo === "numero") && (
          <input
            value={p.placeholder ?? ""}
            onChange={(e) => onCambio({ placeholder: e.target.value })}
            placeholder="Texto de ayuda (opcional)"
            className="flex-1 min-w-[8rem] bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-brand-500"
          />
        )}
        {p.tipo === "numero" && (
          <input
            value={p.sufijo ?? ""}
            onChange={(e) => onCambio({ sufijo: e.target.value })}
            placeholder="Sufijo (kg, cm…)"
            className="w-28 bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-brand-500"
          />
        )}
      </div>

      {usaOpciones(p.tipo) && (
        <div>
          <span className="block text-xs text-neutral-500 mb-1">
            Opciones (una por línea)
          </span>
          <textarea
            value={(p.opciones ?? []).join("\n")}
            onChange={(e) => onCambio({ opciones: e.target.value.split("\n") })}
            rows={3}
            placeholder={"Opción 1\nOpción 2"}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 resize-y"
          />
        </div>
      )}

      {usaEscala(p.tipo) && (
        <div className="flex gap-3">
          <input
            value={p.etiquetaMin ?? ""}
            onChange={(e) => onCambio({ etiquetaMin: e.target.value })}
            placeholder="Etiqueta del 1 (ej: Nada)"
            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-brand-500"
          />
          <input
            value={p.etiquetaMax ?? ""}
            onChange={(e) => onCambio({ etiquetaMax: e.target.value })}
            placeholder="Etiqueta del 5 (ej: Mucho)"
            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-brand-500"
          />
        </div>
      )}
    </div>
  );
}
