"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  EstructuraPrograma,
  SerieEjercicio,
  ElementoEjercicio,
} from "@/lib/supabase/tipos";
import { Boton } from "@/components/ui/boton";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Lightbulb, Save, RotateCcw, Trash2, Plus, X, Search } from "lucide-react";
import { guardarSnapshotAsignacion } from "./acciones";
import {
  sugerirProgresion,
  type HistorialEjercicio,
  type Sugerencia,
} from "./historial";

type EjercicioBiblioteca = {
  id: string;
  nombre: string;
  grupos_musculares: string[];
  material: string[];
};

type EjercicioInfo = { nombre: string; material: string[] };

// "Sin peso libre" si NINGÚN ejercicio del plan usa peso libre (mancuerna,
// barra, kettlebell, máquina). Si solo usa peso corporal, bandas, etc.,
// las sugerencias serán de reps/variantes en lugar de subir kg.
function deduceSinPesoLibre(materiales: string[]): boolean {
  const PESO_LIBRE = ["mancuerna", "barra", "kettlebell", "máquina", "maquina", "polea", "pesa"];
  const low = materiales.map((m) => m.toLowerCase());
  return !low.some((m) => PESO_LIBRE.some((k) => m.includes(k)));
}

export function EditorAsignacionCliente({
  asignacionId,
  estructuraInicial,
  ejerciciosInfo,
  historiales,
  biblioteca,
}: {
  asignacionId: string;
  estructuraInicial: EstructuraPrograma;
  ejerciciosInfo: Record<string, EjercicioInfo>;
  historiales: Record<string, HistorialEjercicio>;
  biblioteca: EjercicioBiblioteca[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [estructura, setEstructura] = useState<EstructuraPrograma>(
    () => JSON.parse(JSON.stringify(estructuraInicial)) as EstructuraPrograma
  );
  const [semanaIdx, setSemanaIdx] = useState(0);
  const [sucio, setSucio] = useState(false);
  const [guardando, startTransition] = useTransition();
  // Modal de "Añadir ejercicio": guarda dónde se insertaría
  const [añadirA, setAñadirA] = useState<{
    semIdx: number;
    diaIdx: number;
    bloqueIdx: number;
  } | null>(null);

  function actualizar(mutator: (e: EstructuraPrograma) => void) {
    setEstructura((prev) => {
      const copia = JSON.parse(JSON.stringify(prev)) as EstructuraPrograma;
      mutator(copia);
      setSucio(true);
      return copia;
    });
  }

  function editarSerie(
    semIdx: number,
    diaIdx: number,
    bloqueIdx: number,
    elIdx: number,
    serieIdx: number,
    parche: Partial<SerieEjercicio>
  ) {
    actualizar((e) => {
      const el = e[semIdx]?.dias[diaIdx]?.bloques[bloqueIdx]?.elementos[elIdx];
      if (!el || el.tipo !== "ejercicio") return;
      const serie = el.series[serieIdx];
      if (!serie) return;
      Object.assign(serie, parche);
    });
  }

  function aplicarSugerenciaATodas(
    semIdx: number,
    diaIdx: number,
    bloqueIdx: number,
    elIdx: number,
    parche: Partial<SerieEjercicio>
  ) {
    actualizar((e) => {
      const el = e[semIdx]?.dias[diaIdx]?.bloques[bloqueIdx]?.elementos[elIdx];
      if (!el || el.tipo !== "ejercicio") return;
      el.series = el.series.map((s) => ({ ...s, ...parche }));
    });
  }

  function eliminarElemento(
    semIdx: number,
    diaIdx: number,
    bloqueIdx: number,
    elIdx: number
  ) {
    if (!confirm("¿Eliminar este ejercicio del plan de esta clienta?")) return;
    actualizar((e) => {
      const bloque = e[semIdx]?.dias[diaIdx]?.bloques[bloqueIdx];
      if (!bloque) return;
      bloque.elementos.splice(elIdx, 1);
    });
  }

  function añadirEjercicio(ej: EjercicioBiblioteca) {
    if (!añadirA) return;
    const { semIdx, diaIdx, bloqueIdx } = añadirA;
    actualizar((e) => {
      const bloque = e[semIdx]?.dias[diaIdx]?.bloques[bloqueIdx];
      if (!bloque) return;
      // Crear elemento ejercicio nuevo con 3 series por defecto
      const nuevoId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      bloque.elementos.push({
        id: nuevoId,
        tipo: "ejercicio",
        ejercicio_id: ej.id,
        ejercicio_nombre: ej.nombre,
        series: [
          { reps: "10", peso: "" },
          { reps: "10", peso: "" },
          { reps: "10", peso: "" },
        ],
      });
    });
    setAñadirA(null);
  }

  function descartar() {
    if (!confirm("¿Descartar todos los cambios sin guardar?")) return;
    setEstructura(
      JSON.parse(JSON.stringify(estructuraInicial)) as EstructuraPrograma
    );
    setSucio(false);
  }

  function guardar() {
    startTransition(async () => {
      const r = await guardarSnapshotAsignacion(asignacionId, estructura);
      if (!r.ok) {
        toast.error(`No se pudo guardar: ${r.error}`);
        return;
      }
      toast.success("Plan personalizado guardado ✓");
      setSucio(false);
      router.refresh();
    });
  }

  if (estructura.length === 0) {
    return (
      <div className="border border-dashed border-neutral-800 rounded-2xl p-8 text-center text-sm text-neutral-500">
        Este programa no tiene estructura cargada todavía.
      </div>
    );
  }

  const semanaActual = estructura[semanaIdx];

  return (
    <div>
      {/* Selector de semanas + barra de acciones sticky */}
      <div className="sticky top-0 z-10 bg-neutral-950/90 backdrop-blur border-b border-neutral-800 -mx-8 px-8 py-3 mb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-1 flex-wrap">
            {estructura.map((s, i) => (
              <button
                key={i}
                onClick={() => setSemanaIdx(i)}
                className={
                  "text-xs px-3 py-1.5 rounded-full transition " +
                  (i === semanaIdx
                    ? "text-white"
                    : "text-neutral-400 hover:text-white border border-neutral-800")
                }
                style={
                  i === semanaIdx
                    ? { backgroundColor: "var(--brand)" }
                    : undefined
                }
              >
                Semana {s.semana}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {sucio && (
              <>
                <span className="text-xs text-amber-400">
                  Cambios sin guardar
                </span>
                <button
                  onClick={descartar}
                  className="text-xs text-neutral-400 hover:text-white inline-flex items-center gap-1"
                  disabled={guardando}
                >
                  <RotateCcw className="size-3.5" />
                  Descartar
                </button>
              </>
            )}
            <Boton
              tamano="sm"
              variante={sucio ? "primario" : "secundario"}
              onClick={guardar}
              disabled={guardando || !sucio}
            >
              <Save className="size-4 inline mr-1" />
              {guardando ? "Guardando..." : "Guardar plan"}
            </Boton>
          </div>
        </div>
      </div>

      {/* Días de la semana actual */}
      {semanaActual && (
        <div className="space-y-4">
          {semanaActual.dias.map((dia, diaIdx) => {
            const tieneBloques = dia.bloques.length > 0;
            if (!tieneBloques && !dia.descanso) return null;
            return (
              <div
                key={diaIdx}
                className="border border-neutral-800 rounded-2xl bg-neutral-950 overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-neutral-800 flex justify-between items-center">
                  <h3 className="font-medium">
                    {dia.titulo}
                    {dia.descanso && (
                      <span className="ml-2 text-xs text-neutral-500">
                        · Descanso
                      </span>
                    )}
                  </h3>
                </div>
                {dia.descanso || dia.bloques.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-neutral-500 italic">
                    {dia.descanso ? "Día de descanso." : "Sin contenido."}
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-900">
                    {dia.bloques.map((bloque, bloqueIdx) => (
                      <div key={bloqueIdx} className="px-4 py-3">
                        <div className="text-xs uppercase tracking-wide text-neutral-500 mb-2">
                          {bloque.titulo || "Bloque"}
                        </div>
                        <div className="space-y-3">
                          {bloque.elementos.map((el, elIdx) =>
                            el.tipo === "ejercicio" ? (
                              <FilaEjercicio
                                key={el.id}
                                elemento={el}
                                info={ejerciciosInfo[el.ejercicio_id]}
                                historial={historiales[el.ejercicio_id]}
                                onEditarSerie={(serieIdx, parche) =>
                                  editarSerie(
                                    semanaIdx,
                                    diaIdx,
                                    bloqueIdx,
                                    elIdx,
                                    serieIdx,
                                    parche
                                  )
                                }
                                onAplicarATodas={(parche) =>
                                  aplicarSugerenciaATodas(
                                    semanaIdx,
                                    diaIdx,
                                    bloqueIdx,
                                    elIdx,
                                    parche
                                  )
                                }
                                onEliminar={() =>
                                  eliminarElemento(
                                    semanaIdx,
                                    diaIdx,
                                    bloqueIdx,
                                    elIdx
                                  )
                                }
                              />
                            ) : (
                              <div
                                key={el.id}
                                className="text-xs text-neutral-500 italic px-2"
                              >
                                {tipoLegible(el.tipo)}
                                {"titulo" in el ? `: ${el.titulo}` : ""}
                              </div>
                            )
                          )}
                          <button
                            onClick={() =>
                              setAñadirA({
                                semIdx: semanaIdx,
                                diaIdx,
                                bloqueIdx,
                              })
                            }
                            className="w-full text-xs text-neutral-400 hover:text-white inline-flex items-center justify-center gap-1.5 py-2 border border-dashed border-neutral-800 hover:border-neutral-600 rounded-lg transition"
                          >
                            <Plus className="size-3.5" />
                            Añadir ejercicio
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal selector de ejercicio */}
      <ModalAñadirEjercicio
        abierto={añadirA !== null}
        onCerrar={() => setAñadirA(null)}
        biblioteca={biblioteca}
        onElegir={añadirEjercicio}
      />
    </div>
  );
}

function FilaEjercicio({
  elemento,
  info,
  historial,
  onEditarSerie,
  onAplicarATodas,
  onEliminar,
}: {
  elemento: ElementoEjercicio;
  info: EjercicioInfo | undefined;
  historial: HistorialEjercicio | undefined;
  onEditarSerie: (serieIdx: number, parche: Partial<SerieEjercicio>) => void;
  onAplicarATodas: (parche: Partial<SerieEjercicio>) => void;
  onEliminar: () => void;
}) {
  const nombre = info?.nombre ?? elemento.ejercicio_nombre ?? "(Ejercicio)";
  const sinPesoLibre = deduceSinPesoLibre(info?.material ?? []);

  // Calcular sugerencia basada en la primera serie como referencia
  let sugerencia: Sugerencia | null = null;
  if (historial && elemento.series.length > 0) {
    sugerencia = sugerirProgresion(historial, elemento.series[0]!, sinPesoLibre);
  }

  return (
    <div className="bg-neutral-900/30 rounded-lg p-3 group/ej relative">
      <button
        onClick={onEliminar}
        title="Quitar este ejercicio del plan"
        className="absolute top-2 right-2 opacity-30 hover:opacity-100 hover:text-red-400 transition p-1"
        aria-label="Quitar ejercicio"
      >
        <Trash2 className="size-3.5" />
      </button>
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2 pr-6">
        <div className="font-medium text-sm">{nombre}</div>
        {historial && historial.vecesHechas > 0 && (
          <div className="text-[10px] text-neutral-500">
            {historial.vecesHechas} vez{historial.vecesHechas === 1 ? "" : "es"} hecho
            {historial.pesoMaxKg != null && (
              <>
                {" · "}máx {historial.pesoMaxKg} kg
              </>
            )}
            {historial.ultimoRir != null && (
              <>
                {" · "}último RIR {historial.ultimoRir}
              </>
            )}
          </div>
        )}
      </div>

      {/* Sugerencia */}
      {sugerencia && sugerencia.tipo !== "primera_vez" && (
        <Banner
          sugerencia={sugerencia}
          puedeAplicar={!!sugerencia.parche}
          onAplicar={() =>
            sugerencia?.parche && onAplicarATodas(sugerencia.parche)
          }
        />
      )}

      {/* Tabla de series editable */}
      <table className="w-full text-xs mt-2">
        <thead>
          <tr className="text-neutral-500 text-left">
            <th className="font-normal w-10">#</th>
            <th className="font-normal">Reps</th>
            <th className="font-normal">Peso</th>
            <th className="font-normal">RIR</th>
            <th className="font-normal">Descanso</th>
          </tr>
        </thead>
        <tbody>
          {elemento.series.map((s, i) => (
            <tr key={i} className="border-t border-neutral-800/60">
              <td className="py-1.5 text-neutral-500">{i + 1}</td>
              <td className="py-1.5 pr-2">
                <InputInline
                  valor={s.reps}
                  placeholder="10"
                  onChange={(v) => onEditarSerie(i, { reps: v })}
                />
              </td>
              <td className="py-1.5 pr-2">
                <InputInline
                  valor={s.peso}
                  placeholder="—"
                  onChange={(v) => onEditarSerie(i, { peso: v })}
                />
              </td>
              <td className="py-1.5 pr-2">
                <InputInline
                  valor={s.rir ?? ""}
                  placeholder="—"
                  onChange={(v) => onEditarSerie(i, { rir: v })}
                />
              </td>
              <td className="py-1.5 pr-2">
                <InputInline
                  valor={s.descanso ?? ""}
                  placeholder="—"
                  onChange={(v) => onEditarSerie(i, { descanso: v })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InputInline({
  valor,
  placeholder,
  onChange,
}: {
  valor: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="text"
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-transparent border border-transparent hover:border-neutral-800 focus:border-neutral-700 rounded px-1.5 py-0.5 text-xs focus:outline-none placeholder:text-neutral-700"
    />
  );
}

function Banner({
  sugerencia,
  puedeAplicar,
  onAplicar,
}: {
  sugerencia: Sugerencia;
  puedeAplicar: boolean;
  onAplicar: () => void;
}) {
  const colorPorTipo: Record<Sugerencia["tipo"], string> = {
    progresar_peso: "text-green-400 bg-green-950/30 border-green-900/50",
    progresar_reps: "text-green-400 bg-green-950/30 border-green-900/50",
    variante_dificil: "text-blue-400 bg-blue-950/30 border-blue-900/50",
    consolidar: "text-neutral-400 bg-neutral-900/60 border-neutral-800",
    regresar: "text-amber-400 bg-amber-950/30 border-amber-900/50",
    primera_vez: "text-neutral-500 bg-neutral-900/40 border-neutral-800",
  };
  return (
    <div
      className={
        "flex items-start gap-2 px-2 py-1.5 rounded border text-xs " +
        colorPorTipo[sugerencia.tipo]
      }
    >
      <Lightbulb className="size-3.5 shrink-0 mt-0.5" />
      <span className="flex-1">{sugerencia.texto}</span>
      {puedeAplicar && (
        <button
          onClick={onAplicar}
          className="text-[11px] underline opacity-80 hover:opacity-100 shrink-0"
        >
          Aplicar a todas las series
        </button>
      )}
    </div>
  );
}

function tipoLegible(tipo: string): string {
  const mapa: Record<string, string> = {
    contenido: "📝 Contenido",
    metrica_prompt: "📊 Registrar métrica",
    foto_progreso_prompt: "📸 Foto de progreso",
    pasos_prompt: "👣 Pasos",
    recordatorio: "🔔 Recordatorio",
    pdf: "📄 PDF",
    video: "🎬 Vídeo",
    video_externo: "🎬 Vídeo externo",
    enlace: "🔗 Enlace",
  };
  return mapa[tipo] ?? tipo;
}

function ModalAñadirEjercicio({
  abierto,
  onCerrar,
  biblioteca,
  onElegir,
}: {
  abierto: boolean;
  onCerrar: () => void;
  biblioteca: EjercicioBiblioteca[];
  onElegir: (ej: EjercicioBiblioteca) => void;
}) {
  const [query, setQuery] = useState("");
  const [grupoFiltro, setGrupoFiltro] = useState<string>("");

  // Reset al abrir/cerrar
  useEffect(() => {
    if (!abierto) {
      setQuery("");
      setGrupoFiltro("");
    }
  }, [abierto]);

  const gruposDisponibles = useMemo(() => {
    const s = new Set<string>();
    for (const e of biblioteca) {
      for (const g of e.grupos_musculares ?? []) s.add(g);
    }
    return Array.from(s).sort();
  }, [biblioteca]);

  const filtrados = useMemo(() => {
    const q = query.toLowerCase().trim();
    return biblioteca.filter((e) => {
      if (q && !e.nombre.toLowerCase().includes(q)) return false;
      if (grupoFiltro && !e.grupos_musculares.includes(grupoFiltro)) return false;
      return true;
    });
  }, [biblioteca, query, grupoFiltro]);

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Añadir ejercicio al bloque"
      tamano="lg"
    >
      <div className="space-y-3">
        <div className="relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre..."
            autoFocus
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-brand-500"
          />
        </div>

        {gruposDisponibles.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setGrupoFiltro("")}
              className={
                "text-xs px-2.5 py-1 rounded-full border " +
                (!grupoFiltro
                  ? "text-white"
                  : "border-neutral-800 text-neutral-400 hover:text-white")
              }
              style={!grupoFiltro ? { backgroundColor: "var(--brand)", borderColor: "var(--brand)" } : undefined}
            >
              Todos
            </button>
            {gruposDisponibles.slice(0, 12).map((g) => (
              <button
                key={g}
                onClick={() => setGrupoFiltro(g)}
                className={
                  "text-xs px-2.5 py-1 rounded-full border " +
                  (grupoFiltro === g
                    ? "text-white"
                    : "border-neutral-800 text-neutral-400 hover:text-white")
                }
                style={grupoFiltro === g ? { backgroundColor: "var(--brand)", borderColor: "var(--brand)" } : undefined}
              >
                {g}
              </button>
            ))}
          </div>
        )}

        <div className="max-h-80 overflow-y-auto -mx-2 px-2">
          {filtrados.length === 0 ? (
            <div className="text-center py-8 text-sm text-neutral-500">
              Sin resultados.
            </div>
          ) : (
            <ul className="space-y-1">
              {filtrados.slice(0, 60).map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => onElegir(e)}
                    className="w-full text-left px-3 py-2 rounded hover:bg-neutral-900 transition"
                  >
                    <div className="text-sm">{e.nombre}</div>
                    {(e.grupos_musculares.length > 0 ||
                      e.material.length > 0) && (
                      <div className="text-[10px] text-neutral-500 mt-0.5">
                        {[...e.grupos_musculares, ...e.material]
                          .slice(0, 4)
                          .join(" · ")}
                      </div>
                    )}
                  </button>
                </li>
              ))}
              {filtrados.length > 60 && (
                <li className="text-xs text-neutral-600 px-3 py-2">
                  ... y {filtrados.length - 60} más. Refina la búsqueda.
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
