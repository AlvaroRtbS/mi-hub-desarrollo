"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";
import { formatearFecha } from "@/lib/utilidades";
import {
  crearObjetivo,
  cambiarEstadoObjetivo,
  eliminarObjetivo,
} from "./acciones-objetivos";

type Objetivo = {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: string;
  valor_inicial: number | null;
  valor_objetivo: number | null;
  unidad: string | null;
  fecha_limite: string | null;
  estado: "activo" | "conseguido" | "archivado";
  conseguido_en: string | null;
  creado_en: string;
};

const TIPOS = [
  { id: "libre", label: "Libre (sin métrica)", unidad: "" },
  { id: "peso", label: "Peso corporal", unidad: "kg" },
  { id: "perimetro_cintura", label: "Cintura", unidad: "cm" },
  { id: "perimetro_cadera", label: "Cadera", unidad: "cm" },
  { id: "porcentaje_grasa", label: "% grasa", unidad: "%" },
  { id: "sesiones_completadas", label: "Sesiones completadas", unidad: "sesiones" },
];

export function PanelObjetivos({
  clientaId,
  objetivos,
  valorActualPorTipo,
}: {
  clientaId: string;
  objetivos: Objetivo[];
  valorActualPorTipo: Record<string, number | null>;
}) {
  const router = useRouter();
  const [agregando, setAgregando] = useState(false);
  const [tipo, setTipo] = useState("libre");
  const [error, setError] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();

  const unidadSugerida = TIPOS.find((t) => t.id === tipo)?.unidad ?? "";

  function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("clienta_id", clientaId);
    startTransition(async () => {
      const r = await crearObjetivo(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setAgregando(false);
      router.refresh();
    });
  }

  function marcarConseguido(id: string) {
    startTransition(async () => {
      await cambiarEstadoObjetivo(id, clientaId, "conseguido");
      router.refresh();
    });
  }

  function archivar(id: string) {
    if (!confirm("¿Archivar este objetivo?")) return;
    startTransition(async () => {
      await cambiarEstadoObjetivo(id, clientaId, "archivado");
      router.refresh();
    });
  }

  function quitar(id: string) {
    if (!confirm("¿Eliminar este objetivo? No se puede recuperar.")) return;
    startTransition(async () => {
      await eliminarObjetivo(id, clientaId);
      router.refresh();
    });
  }

  const activos = objetivos.filter((o) => o.estado === "activo");
  const conseguidos = objetivos.filter((o) => o.estado === "conseguido");

  return (
    <div className="border border-neutral-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">🎯 Objetivos</h3>
        <button
          onClick={() => setAgregando((v) => !v)}
          className="text-xs text-brand-500 hover:text-brand-400"
        >
          {agregando ? "Cancelar" : "+ Nuevo objetivo"}
        </button>
      </div>

      {agregando && (
        <form onSubmit={guardar} className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 mb-4 space-y-3">
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Título</label>
            <input
              name="titulo"
              required
              placeholder="Ej: Bajar 3 cm de cintura"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Tipo</label>
              <select
                name="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
              >
                {TIPOS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Fecha límite (opcional)</label>
              <input
                type="date"
                name="fecha_limite"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {tipo !== "libre" && (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Valor inicial</label>
                <input
                  type="number"
                  step="0.1"
                  name="valor_inicial"
                  placeholder={valorActualPorTipo[tipo]?.toString() ?? "0"}
                  defaultValue={valorActualPorTipo[tipo] ?? ""}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Objetivo</label>
                <input
                  type="number"
                  step="0.1"
                  name="valor_objetivo"
                  required
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Unidad</label>
                <input
                  name="unidad"
                  defaultValue={unidadSugerida}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-neutral-400 mb-1">Notas (opcional)</label>
            <input
              name="descripcion"
              placeholder="Contexto, motivación..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Boton tamano="sm" variante="secundario" onClick={() => setAgregando(false)}>
              Cancelar
            </Boton>
            <Boton type="submit" tamano="sm" disabled={enviando}>
              {enviando ? "Guardando..." : "Crear objetivo"}
            </Boton>
          </div>
        </form>
      )}

      {activos.length === 0 && conseguidos.length === 0 && !agregando ? (
        <div className="text-xs text-neutral-600 italic">
          Sin objetivos. Crea uno para hacer un seguimiento claro.
        </div>
      ) : (
        <div className="space-y-2">
          {activos.map((o) => (
            <ObjetivoFila
              key={o.id}
              objetivo={o}
              actual={valorActualPorTipo[o.tipo] ?? null}
              onConseguido={() => marcarConseguido(o.id)}
              onArchivar={() => archivar(o.id)}
              onEliminar={() => quitar(o.id)}
            />
          ))}
          {conseguidos.length > 0 && (
            <details className="pt-2">
              <summary className="text-xs text-neutral-500 cursor-pointer hover:text-neutral-300">
                Conseguidos ({conseguidos.length})
              </summary>
              <div className="space-y-1 mt-2">
                {conseguidos.map((o) => (
                  <div
                    key={o.id}
                    className="border border-neutral-900 rounded-lg px-3 py-2 flex items-center justify-between text-sm"
                  >
                    <span className="text-neutral-400 line-through">{o.titulo}</span>
                    <span className="text-xs text-green-400">
                      ✓ {o.conseguido_en ? formatearFecha(o.conseguido_en) : ""}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function ObjetivoFila({
  objetivo,
  actual,
  onConseguido,
  onArchivar,
  onEliminar,
}: {
  objetivo: Objetivo;
  actual: number | null;
  onConseguido: () => void;
  onArchivar: () => void;
  onEliminar: () => void;
}) {
  let progreso: number | null = null;
  let progresoTexto: string | null = null;

  if (
    objetivo.tipo !== "libre" &&
    objetivo.valor_inicial !== null &&
    objetivo.valor_objetivo !== null &&
    actual !== null
  ) {
    const inicial = Number(objetivo.valor_inicial);
    const meta = Number(objetivo.valor_objetivo);
    const ahora = Number(actual);
    const total = Math.abs(meta - inicial);
    const recorrido = Math.abs(ahora - inicial);
    progreso = total > 0 ? Math.min(100, Math.round((recorrido / total) * 100)) : 0;
    progresoTexto = `${ahora.toFixed(1)}${objetivo.unidad ?? ""} → ${meta.toFixed(1)}${objetivo.unidad ?? ""}`;
  }

  const diasRestantes = objetivo.fecha_limite
    ? Math.ceil(
        (new Date(objetivo.fecha_limite).getTime() - Date.now()) /
          (24 * 3600 * 1000)
      )
    : null;

  return (
    <div className="border border-neutral-800 rounded-xl p-3 bg-neutral-950">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-neutral-100 truncate">
            {objetivo.titulo}
          </div>
          {objetivo.descripcion && (
            <div className="text-xs text-neutral-500 mt-0.5">{objetivo.descripcion}</div>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={onConseguido}
            className="text-[10px] text-green-400 hover:text-green-300 bg-green-950/30 border border-green-900/40 rounded px-2 py-1"
            title="Marcar como conseguido"
          >
            ✓
          </button>
          <button
            onClick={onArchivar}
            className="text-[10px] text-neutral-500 hover:text-neutral-300"
            title="Archivar"
          >
            ⎘
          </button>
          <button
            onClick={onEliminar}
            className="text-[10px] text-neutral-500 hover:text-red-400"
            title="Eliminar"
          >
            ✕
          </button>
        </div>
      </div>

      {progreso !== null && (
        <>
          <div className="h-1.5 bg-neutral-900 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-gradient-to-r from-brand-600 to-brand-400"
              style={{ width: `${progreso}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-neutral-500 mt-1">
            <span>{progresoTexto}</span>
            <span>{progreso}%</span>
          </div>
        </>
      )}

      {diasRestantes !== null && (
        <div className="text-[10px] text-neutral-500 mt-1.5">
          {diasRestantes > 0
            ? `${diasRestantes} días restantes`
            : diasRestantes === 0
            ? "Vence hoy"
            : `Venció hace ${-diasRestantes} días`}
        </div>
      )}
    </div>
  );
}
