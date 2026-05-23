"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";
import { Input, Textarea } from "@/components/ui/campo";
import {
  guardarEstructura,
  actualizarMetadatosPrograma,
  eliminarPrograma,
  duplicarPrograma,
} from "../acciones";
import type {
  EstructuraPrograma,
  Semana,
  Dia,
  Bloque,
  Elemento,
  ElementoEjercicio,
  SerieEjercicio,
  Ejercicio,
} from "@/lib/supabase/tipos";
import { NOMBRES_DIAS, detectarProveedorVideo } from "@/lib/supabase/tipos";
import { SubirArchivo } from "@/components/ui/subir-archivo";
import { SelectorEjercicios } from "./selector-ejercicios";
import { ModalAsignar } from "./modal-asignar";

type EjercicioBiblio = Pick<
  Ejercicio,
  "id" | "nombre" | "descripcion" | "grupos_musculares" | "material" | "video_url" | "imagen_url"
>;

type ClientaBasica = {
  id: string;
  nombre: string;
  apellidos: string | null;
  estado: string;
};

type Props = {
  programaId: string;
  coachId: string;
  nombreInicial: string;
  descripcionInicial: string | null;
  estructuraInicial: EstructuraPrograma;
  ejercicios: EjercicioBiblio[];
  clientas: ClientaBasica[];
};

function uuid() {
  return crypto.randomUUID();
}

function clonar<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function semanasVaciasSiHaceFalta(
  est: EstructuraPrograma | null | undefined
): EstructuraPrograma {
  if (est && est.length > 0) return est;
  return [
    {
      semana: 1,
      dias: NOMBRES_DIAS.map((titulo, j) => ({
        dia: j + 1,
        titulo,
        descanso: j >= 5,
        bloques: [],
      })),
    },
  ];
}

export function EditorPrograma({
  programaId,
  coachId,
  nombreInicial,
  descripcionInicial,
  estructuraInicial,
  ejercicios,
  clientas,
}: Props) {
  const router = useRouter();
  const [estructura, setEstructura] = useState<EstructuraPrograma>(() =>
    semanasVaciasSiHaceFalta(estructuraInicial)
  );
  const [nombre, setNombre] = useState(nombreInicial);
  const [descripcion, setDescripcion] = useState(descripcionInicial ?? "");
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [semanaIdx, setSemanaIdx] = useState(0);
  const [diaIdx, setDiaIdx] = useState(0);
  const [sucio, setSucio] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [guardando, startTransition] = useTransition();
  const [selectorAbierto, setSelectorAbierto] = useState<null | { bloqueId: string }>(null);
  const [asignarAbierto, setAsignarAbierto] = useState(false);

  const semanaActual = estructura[semanaIdx];
  const diaActual = semanaActual?.dias[diaIdx];

  // ============================================================================
  // Mutaciones locales del state
  // ============================================================================

  const actualizarEstructura = useCallback(
    (mutador: (est: EstructuraPrograma) => void) => {
      setEstructura((prev) => {
        const copia = clonar(prev);
        mutador(copia);
        return copia;
      });
      setSucio(true);
    },
    []
  );

  // --- Semanas ---
  const añadirSemana = () => {
    actualizarEstructura((est) => {
      const num = est.length + 1;
      est.push({
        semana: num,
        dias: NOMBRES_DIAS.map((titulo, j) => ({
          dia: j + 1,
          titulo,
          descanso: j >= 5,
          bloques: [],
        })),
      });
    });
    setSemanaIdx(estructura.length);
  };

  const duplicarSemanaLocal = (idx: number) => {
    actualizarEstructura((est) => {
      const orig = est[idx];
      if (!orig) return;
      const copia: Semana = clonar(orig);
      copia.semana = est.length + 1;
      copia.dias.forEach((d) => {
        d.bloques.forEach((b) => {
          b.id = uuid();
          b.elementos.forEach((e) => (e.id = uuid()));
        });
      });
      est.push(copia);
    });
  };

  const eliminarSemanaLocal = (idx: number) => {
    if (estructura.length <= 1) {
      setMensaje({ tipo: "error", texto: "El programa debe tener al menos una semana." });
      return;
    }
    if (!confirm("¿Eliminar esta semana? Se pierden todos sus bloques.")) return;
    actualizarEstructura((est) => {
      est.splice(idx, 1);
      est.forEach((s, i) => (s.semana = i + 1));
    });
    setSemanaIdx(Math.max(0, idx - 1));
  };

  // --- Días ---
  const toggleDescanso = (dIdx: number) => {
    actualizarEstructura((est) => {
      const d = est[semanaIdx]?.dias[dIdx];
      if (!d) return;
      d.descanso = !d.descanso;
    });
  };

  // --- Bloques ---
  const añadirBloque = () => {
    actualizarEstructura((est) => {
      const d = est[semanaIdx]?.dias[diaIdx];
      if (!d) return;
      d.bloques.push({
        id: uuid(),
        titulo: "Bloque",
        elementos: [],
      });
    });
  };

  const eliminarBloque = (bIdx: number) => {
    if (!confirm("¿Eliminar este bloque y todos sus elementos?")) return;
    actualizarEstructura((est) => {
      est[semanaIdx]?.dias[diaIdx]?.bloques.splice(bIdx, 1);
    });
  };

  const moverBloque = (bIdx: number, direccion: -1 | 1) => {
    actualizarEstructura((est) => {
      const bloques = est[semanaIdx]?.dias[diaIdx]?.bloques;
      if (!bloques) return;
      const destino = bIdx + direccion;
      if (destino < 0 || destino >= bloques.length) return;
      [bloques[bIdx], bloques[destino]] = [bloques[destino]!, bloques[bIdx]!];
    });
  };

  const actualizarBloque = (bIdx: number, parche: Partial<Bloque>) => {
    actualizarEstructura((est) => {
      const b = est[semanaIdx]?.dias[diaIdx]?.bloques[bIdx];
      if (!b) return;
      Object.assign(b, parche);
    });
  };

  // --- Elementos ---
  const añadirElementoEjercicio = (bloqueId: string, ejercicio: EjercicioBiblio) => {
    actualizarEstructura((est) => {
      const bloques = est[semanaIdx]?.dias[diaIdx]?.bloques;
      const bloque = bloques?.find((b) => b.id === bloqueId);
      if (!bloque) return;
      const nuevo: ElementoEjercicio = {
        id: uuid(),
        tipo: "ejercicio",
        ejercicio_id: ejercicio.id,
        ejercicio_nombre: ejercicio.nombre,
        series: [
          { reps: "10", peso: "" },
          { reps: "10", peso: "" },
          { reps: "10", peso: "" },
        ],
      };
      bloque.elementos.push(nuevo);
    });
  };

  const añadirElementoSimple = (bIdx: number, tipo: Elemento["tipo"]) => {
    actualizarEstructura((est) => {
      const bloque = est[semanaIdx]?.dias[diaIdx]?.bloques[bIdx];
      if (!bloque) return;
      let nuevo: Elemento;
      switch (tipo) {
        case "contenido":
          nuevo = { id: uuid(), tipo: "contenido", titulo: "Nota", markdown: "" };
          break;
        case "metrica_prompt":
          nuevo = { id: uuid(), tipo: "metrica_prompt", metrica_tipo: "peso" };
          break;
        case "foto_progreso_prompt":
          nuevo = { id: uuid(), tipo: "foto_progreso_prompt" };
          break;
        case "pasos_prompt":
          nuevo = { id: uuid(), tipo: "pasos_prompt" };
          break;
        case "recordatorio":
          nuevo = { id: uuid(), tipo: "recordatorio", hora: "20:00", mensaje: "" };
          break;
        case "pdf":
          nuevo = { id: uuid(), tipo: "pdf", titulo: "Documento PDF", url: "" };
          break;
        case "video":
          nuevo = { id: uuid(), tipo: "video", titulo: "Vídeo", url: "" };
          break;
        case "video_externo":
          nuevo = {
            id: uuid(),
            tipo: "video_externo",
            titulo: "Vídeo (YouTube / Vimeo)",
            url: "",
            proveedor: "otro",
          };
          break;
        case "enlace":
          nuevo = { id: uuid(), tipo: "enlace", titulo: "Enlace", url: "" };
          break;
        default:
          return;
      }
      bloque.elementos.push(nuevo);
    });
  };

  const eliminarElemento = (bIdx: number, eIdx: number) => {
    actualizarEstructura((est) => {
      est[semanaIdx]?.dias[diaIdx]?.bloques[bIdx]?.elementos.splice(eIdx, 1);
    });
  };

  const moverElemento = (bIdx: number, eIdx: number, direccion: -1 | 1) => {
    actualizarEstructura((est) => {
      const elementos = est[semanaIdx]?.dias[diaIdx]?.bloques[bIdx]?.elementos;
      if (!elementos) return;
      const destino = eIdx + direccion;
      if (destino < 0 || destino >= elementos.length) return;
      [elementos[eIdx], elementos[destino]] = [elementos[destino]!, elementos[eIdx]!];
    });
  };

  const actualizarElemento = (bIdx: number, eIdx: number, parche: Partial<Elemento>) => {
    actualizarEstructura((est) => {
      const el = est[semanaIdx]?.dias[diaIdx]?.bloques[bIdx]?.elementos[eIdx];
      if (!el) return;
      Object.assign(el, parche);
    });
  };

  const añadirSerie = (bIdx: number, eIdx: number) => {
    actualizarEstructura((est) => {
      const el = est[semanaIdx]?.dias[diaIdx]?.bloques[bIdx]?.elementos[eIdx];
      if (!el || el.tipo !== "ejercicio") return;
      const ultima = el.series[el.series.length - 1];
      el.series.push({
        reps: ultima?.reps ?? "10",
        peso: ultima?.peso ?? "",
      });
    });
  };

  const eliminarSerie = (bIdx: number, eIdx: number, sIdx: number) => {
    actualizarEstructura((est) => {
      const el = est[semanaIdx]?.dias[diaIdx]?.bloques[bIdx]?.elementos[eIdx];
      if (!el || el.tipo !== "ejercicio") return;
      if (el.series.length <= 1) return;
      el.series.splice(sIdx, 1);
    });
  };

  const actualizarSerie = (
    bIdx: number,
    eIdx: number,
    sIdx: number,
    parche: Partial<SerieEjercicio>
  ) => {
    actualizarEstructura((est) => {
      const el = est[semanaIdx]?.dias[diaIdx]?.bloques[bIdx]?.elementos[eIdx];
      if (!el || el.tipo !== "ejercicio") return;
      const s = el.series[sIdx];
      if (!s) return;
      Object.assign(s, parche);
    });
  };

  // ============================================================================
  // Guardar / metadatos
  // ============================================================================

  const guardar = () => {
    setMensaje(null);
    startTransition(async () => {
      const r = await guardarEstructura(programaId, estructura);
      if (!r.ok) {
        setMensaje({ tipo: "error", texto: r.error });
      } else {
        setSucio(false);
        setMensaje({ tipo: "ok", texto: "Guardado." });
        setTimeout(() => setMensaje(null), 2000);
      }
    });
  };

  const guardarMeta = () => {
    const fd = new FormData();
    fd.set("nombre", nombre);
    fd.set("descripcion", descripcion);
    startTransition(async () => {
      const r = await actualizarMetadatosPrograma(programaId, fd);
      if (!r.ok) {
        setMensaje({ tipo: "error", texto: r.error });
        return;
      }
      setEditandoMeta(false);
      router.refresh();
    });
  };

  const duplicar = () => {
    startTransition(async () => {
      const r = await duplicarPrograma(programaId);
      if (r.ok && r.id) router.push(`/programas/${r.id}`);
      else if (!r.ok) setMensaje({ tipo: "error", texto: r.error });
    });
  };

  const eliminar = () => {
    if (!confirm("¿Eliminar este programa? No se puede deshacer.")) return;
    startTransition(async () => {
      await eliminarPrograma(programaId);
    });
  };

  // ============================================================================
  // Render
  // ============================================================================

  const ejerciciosUsados = useMemo(() => {
    const map = new Map<string, number>();
    estructura.forEach((s) =>
      s.dias.forEach((d) =>
        d.bloques.forEach((b) =>
          b.elementos.forEach((e) => {
            if (e.tipo === "ejercicio") {
              map.set(e.ejercicio_id, (map.get(e.ejercicio_id) ?? 0) + 1);
            }
          })
        )
      )
    );
    return map;
  }, [estructura]);

  return (
    <div className="mt-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1 min-w-0">
          {editandoMeta ? (
            <div className="space-y-2 max-w-2xl">
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre del programa"
              />
              <Textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Descripción"
              />
              <div className="flex gap-2">
                <Boton tamano="sm" onClick={guardarMeta} disabled={guardando}>
                  Guardar
                </Boton>
                <Boton
                  tamano="sm"
                  variante="secundario"
                  onClick={() => {
                    setNombre(nombreInicial);
                    setDescripcion(descripcionInicial ?? "");
                    setEditandoMeta(false);
                  }}
                >
                  Cancelar
                </Boton>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold">{nombre}</h1>
              {descripcion && (
                <p className="text-sm text-neutral-400 mt-1">{descripcion}</p>
              )}
              <button
                onClick={() => setEditandoMeta(true)}
                className="text-xs text-neutral-500 hover:text-neutral-300 mt-1"
              >
                Editar nombre / descripción
              </button>
            </>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {sucio && (
              <span className="text-xs text-amber-400">Cambios sin guardar</span>
            )}
            <Boton
              tamano="sm"
              variante={sucio ? "primario" : "secundario"}
              onClick={guardar}
              disabled={guardando || !sucio}
            >
              {guardando ? "Guardando..." : "Guardar"}
            </Boton>
            <Boton
              tamano="sm"
              variante="secundario"
              onClick={() => setAsignarAbierto(true)}
            >
              Asignar a clienta
            </Boton>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={duplicar}
              className="text-xs text-neutral-500 hover:text-neutral-300"
            >
              Duplicar
            </button>
            <span className="text-neutral-700">·</span>
            <button
              onClick={eliminar}
              className="text-xs text-neutral-500 hover:text-red-400"
            >
              Eliminar programa
            </button>
          </div>
        </div>
      </div>

      {mensaje && (
        <div
          className={
            "text-sm rounded-lg px-3 py-2 mt-3 " +
            (mensaje.tipo === "ok"
              ? "text-green-300 bg-green-950/30 border border-green-900/50"
              : "text-red-400 bg-red-950/30 border border-red-900/50")
          }
        >
          {mensaje.texto}
        </div>
      )}

      {/* Tabs de semanas */}
      <div className="mt-6 flex items-center gap-1 flex-wrap border-b border-neutral-800 pb-2">
        {estructura.map((s, i) => {
          const activa = i === semanaIdx;
          return (
            <button
              key={i}
              onClick={() => setSemanaIdx(i)}
              className={
                "text-sm px-3 py-1.5 rounded-lg border " +
                (activa
                  ? "bg-neutral-800 border-neutral-700 text-white"
                  : "border-transparent text-neutral-400 hover:text-white hover:bg-neutral-900")
              }
            >
              Semana {s.semana}
            </button>
          );
        })}
        <button
          onClick={añadirSemana}
          className="text-sm px-3 py-1.5 rounded-lg text-brand-500 hover:bg-neutral-900 ml-2"
        >
          + Añadir semana
        </button>
        {estructura.length > 0 && (
          <>
            <span className="text-neutral-700 mx-1">|</span>
            <button
              onClick={() => duplicarSemanaLocal(semanaIdx)}
              className="text-xs text-neutral-500 hover:text-neutral-200 px-2"
            >
              Duplicar semana actual
            </button>
            <button
              onClick={() => eliminarSemanaLocal(semanaIdx)}
              className="text-xs text-neutral-500 hover:text-red-400 px-2"
            >
              Eliminar semana
            </button>
          </>
        )}
      </div>

      {/* Selector de día */}
      <div className="mt-4 flex items-center gap-1 flex-wrap">
        {semanaActual?.dias.map((d, i) => {
          const activo = i === diaIdx;
          const totalElementos = d.bloques.reduce(
            (acc, b) => acc + b.elementos.length,
            0
          );
          return (
            <button
              key={i}
              onClick={() => setDiaIdx(i)}
              className={
                "text-sm px-3 py-2 rounded-lg border min-w-[80px] " +
                (activo
                  ? "bg-neutral-800 border-neutral-700 text-white"
                  : "border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900/50")
              }
            >
              <div className="font-medium">{d.titulo.slice(0, 3)}</div>
              <div className="text-[10px] text-neutral-500 mt-0.5">
                {d.descanso
                  ? "Descanso"
                  : totalElementos === 0
                  ? "Vacío"
                  : `${totalElementos} elem.`}
              </div>
            </button>
          );
        })}
      </div>

      {/* Detalle del día */}
      {diaActual && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{diaActual.titulo}</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Día {diaActual.dia} · Semana {semanaActual?.semana}
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-400">
              <input
                type="checkbox"
                checked={diaActual.descanso ?? false}
                onChange={() => toggleDescanso(diaIdx)}
                className="accent-brand-600"
              />
              Día de descanso
            </label>
          </div>

          {diaActual.descanso && diaActual.bloques.length === 0 ? (
            <div className="border border-dashed border-neutral-800 rounded-2xl p-10 text-center text-sm text-neutral-500">
              Día de descanso. No hay bloques asignados.
            </div>
          ) : (
            <>
              {diaActual.bloques.map((bloque, bIdx) => (
                <VistaBloque
                  key={bloque.id}
                  bloque={bloque}
                  coachId={coachId}
                  esPrimero={bIdx === 0}
                  esUltimo={bIdx === diaActual.bloques.length - 1}
                  onActualizar={(parche) => actualizarBloque(bIdx, parche)}
                  onEliminar={() => eliminarBloque(bIdx)}
                  onMover={(dir) => moverBloque(bIdx, dir)}
                  onAbrirSelectorEjercicio={() =>
                    setSelectorAbierto({ bloqueId: bloque.id })
                  }
                  onAñadirElementoSimple={(tipo) => añadirElementoSimple(bIdx, tipo)}
                  onActualizarElemento={(eIdx, parche) =>
                    actualizarElemento(bIdx, eIdx, parche)
                  }
                  onEliminarElemento={(eIdx) => eliminarElemento(bIdx, eIdx)}
                  onMoverElemento={(eIdx, dir) => moverElemento(bIdx, eIdx, dir)}
                  onAñadirSerie={(eIdx) => añadirSerie(bIdx, eIdx)}
                  onEliminarSerie={(eIdx, sIdx) => eliminarSerie(bIdx, eIdx, sIdx)}
                  onActualizarSerie={(eIdx, sIdx, parche) =>
                    actualizarSerie(bIdx, eIdx, sIdx, parche)
                  }
                />
              ))}

              <button
                onClick={añadirBloque}
                className="w-full border border-dashed border-neutral-800 rounded-2xl py-4 text-sm text-neutral-400 hover:text-white hover:border-neutral-700 hover:bg-neutral-900/50"
              >
                + Añadir bloque
              </button>
            </>
          )}
        </div>
      )}

      {/* Modal selector ejercicios */}
      {selectorAbierto && (
        <SelectorEjercicios
          ejercicios={ejercicios}
          usados={ejerciciosUsados}
          onElegir={(e) => {
            añadirElementoEjercicio(selectorAbierto.bloqueId, e);
            setSelectorAbierto(null);
          }}
          onCerrar={() => setSelectorAbierto(null)}
        />
      )}

      {/* Modal asignar */}
      {asignarAbierto && (
        <ModalAsignar
          programaId={programaId}
          clientas={clientas}
          onCerrar={() => setAsignarAbierto(false)}
          onAsignado={() => {
            setAsignarAbierto(false);
            setMensaje({ tipo: "ok", texto: "Programa asignado." });
            setTimeout(() => setMensaje(null), 2500);
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Sub-componente: bloque
// ============================================================================

function VistaBloque({
  bloque,
  coachId,
  esPrimero,
  esUltimo,
  onActualizar,
  onEliminar,
  onMover,
  onAbrirSelectorEjercicio,
  onAñadirElementoSimple,
  onActualizarElemento,
  onEliminarElemento,
  onMoverElemento,
  onAñadirSerie,
  onEliminarSerie,
  onActualizarSerie,
}: {
  bloque: Bloque;
  coachId: string;
  esPrimero: boolean;
  esUltimo: boolean;
  onActualizar: (parche: Partial<Bloque>) => void;
  onEliminar: () => void;
  onMover: (dir: -1 | 1) => void;
  onAbrirSelectorEjercicio: () => void;
  onAñadirElementoSimple: (tipo: Elemento["tipo"]) => void;
  onActualizarElemento: (eIdx: number, parche: Partial<Elemento>) => void;
  onEliminarElemento: (eIdx: number) => void;
  onMoverElemento: (eIdx: number, dir: -1 | 1) => void;
  onAñadirSerie: (eIdx: number) => void;
  onEliminarSerie: (eIdx: number, sIdx: number) => void;
  onActualizarSerie: (
    eIdx: number,
    sIdx: number,
    parche: Partial<SerieEjercicio>
  ) => void;
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <div className="border border-neutral-800 rounded-2xl bg-neutral-950">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-neutral-800">
        <input
          value={bloque.titulo}
          onChange={(e) => onActualizar({ titulo: e.target.value })}
          className="bg-transparent text-base font-medium focus:outline-none flex-1 min-w-0"
          placeholder="Título del bloque"
        />
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMover(-1)}
            disabled={esPrimero}
            className="text-xs text-neutral-500 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-500 px-1.5"
            title="Subir bloque"
          >
            ↑
          </button>
          <button
            onClick={() => onMover(1)}
            disabled={esUltimo}
            className="text-xs text-neutral-500 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-500 px-1.5"
            title="Bajar bloque"
          >
            ↓
          </button>
          <button
            onClick={onEliminar}
            className="text-xs text-neutral-500 hover:text-red-400 px-1.5"
            title="Eliminar bloque"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="px-4 py-3">
        <input
          value={bloque.indicaciones ?? ""}
          onChange={(e) => onActualizar({ indicaciones: e.target.value })}
          className="w-full bg-transparent text-xs text-neutral-500 placeholder:text-neutral-700 focus:outline-none mb-3"
          placeholder="Indicaciones (opcional): descanso entre series, tempo, RPE..."
        />

        {bloque.elementos.length === 0 ? (
          <div className="text-xs text-neutral-600 italic py-2">
            Sin elementos. Añade uno abajo.
          </div>
        ) : (
          <div className="space-y-2">
            {bloque.elementos.map((el, eIdx) => (
              <VistaElemento
                key={el.id}
                elemento={el}
                coachId={coachId}
                esPrimero={eIdx === 0}
                esUltimo={eIdx === bloque.elementos.length - 1}
                onActualizar={(parche) => onActualizarElemento(eIdx, parche)}
                onEliminar={() => onEliminarElemento(eIdx)}
                onMover={(dir) => onMoverElemento(eIdx, dir)}
                onAñadirSerie={() => onAñadirSerie(eIdx)}
                onEliminarSerie={(sIdx) => onEliminarSerie(eIdx, sIdx)}
                onActualizarSerie={(sIdx, parche) =>
                  onActualizarSerie(eIdx, sIdx, parche)
                }
              />
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-800">
          <button
            onClick={onAbrirSelectorEjercicio}
            className="text-sm text-brand-500 hover:text-brand-400"
          >
            + Añadir ejercicio
          </button>
          <span className="text-neutral-700">·</span>
          <div className="relative">
            <button
              onClick={() => setMenuAbierto((v) => !v)}
              className="text-sm text-neutral-400 hover:text-white"
            >
              + Otro tipo
            </button>
            {menuAbierto && (
              <>
                <button
                  onClick={() => setMenuAbierto(false)}
                  className="fixed inset-0 z-10 cursor-default"
                  aria-label="Cerrar menú"
                />
                <div className="absolute z-20 mt-1 left-0 bg-neutral-950 border border-neutral-800 rounded-lg shadow-xl py-1 min-w-[220px]">
                  {(
                    [
                      ["contenido", "📝 Nota / contenido"],
                      ["pdf", "📄 PDF adjunto"],
                      ["video", "🎥 Vídeo (subir)"],
                      ["video_externo", "▶️ Vídeo (YouTube / Vimeo)"],
                      ["enlace", "🔗 Enlace externo"],
                      ["metrica_prompt", "⚖️ Pedir métrica"],
                      ["foto_progreso_prompt", "📸 Pedir foto"],
                      ["pasos_prompt", "👣 Pedir pasos del día"],
                      ["recordatorio", "🔔 Recordatorio"],
                    ] as const
                  ).map(([tipo, label]) => (
                    <button
                      key={tipo}
                      onClick={() => {
                        onAñadirElementoSimple(tipo);
                        setMenuAbierto(false);
                      }}
                      className="block w-full text-left text-sm px-3 py-2 hover:bg-neutral-900 text-neutral-200"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-componente: elemento (ejercicio o "simple")
// ============================================================================

function VistaElemento({
  elemento,
  coachId,
  esPrimero,
  esUltimo,
  onActualizar,
  onEliminar,
  onMover,
  onAñadirSerie,
  onEliminarSerie,
  onActualizarSerie,
}: {
  elemento: Elemento;
  coachId: string;
  esPrimero: boolean;
  esUltimo: boolean;
  onActualizar: (parche: Partial<Elemento>) => void;
  onEliminar: () => void;
  onMover: (dir: -1 | 1) => void;
  onAñadirSerie: () => void;
  onEliminarSerie: (sIdx: number) => void;
  onActualizarSerie: (sIdx: number, parche: Partial<SerieEjercicio>) => void;
}) {
  return (
    <div className="border border-neutral-800 rounded-lg bg-neutral-900/50 px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {elemento.tipo === "ejercicio" && (
            <div>
              <div className="text-sm font-medium text-neutral-100 truncate">
                {elemento.ejercicio_nombre ?? "Ejercicio"}
              </div>
              <div className="mt-2 space-y-1">
                <div className="grid grid-cols-[2rem_1fr_1fr_1fr_1fr_2rem] gap-2 text-[11px] text-neutral-500 uppercase tracking-wide">
                  <div></div>
                  <div>Reps</div>
                  <div>Peso</div>
                  <div>RIR</div>
                  <div>Desc.</div>
                  <div></div>
                </div>
                {elemento.series.map((s, sIdx) => (
                  <div
                    key={sIdx}
                    className="grid grid-cols-[2rem_1fr_1fr_1fr_1fr_2rem] gap-2 items-center"
                  >
                    <div className="text-xs text-neutral-500 text-center">
                      {sIdx + 1}
                    </div>
                    <input
                      value={s.reps}
                      onChange={(e) =>
                        onActualizarSerie(sIdx, { reps: e.target.value })
                      }
                      placeholder="10"
                      className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500"
                    />
                    <input
                      value={s.peso}
                      onChange={(e) =>
                        onActualizarSerie(sIdx, { peso: e.target.value })
                      }
                      placeholder="kg"
                      className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500"
                    />
                    <input
                      value={s.rir ?? ""}
                      onChange={(e) =>
                        onActualizarSerie(sIdx, { rir: e.target.value })
                      }
                      placeholder="—"
                      className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500"
                    />
                    <input
                      value={s.descanso ?? ""}
                      onChange={(e) =>
                        onActualizarSerie(sIdx, { descanso: e.target.value })
                      }
                      placeholder="60s"
                      className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500"
                    />
                    <button
                      onClick={() => onEliminarSerie(sIdx)}
                      disabled={elemento.series.length <= 1}
                      className="text-xs text-neutral-600 hover:text-red-400 disabled:opacity-20 disabled:hover:text-neutral-600"
                      title="Eliminar serie"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={onAñadirSerie}
                className="text-xs text-brand-500 hover:text-brand-400 mt-2"
              >
                + Serie
              </button>
              <input
                value={elemento.notas ?? ""}
                onChange={(e) => onActualizar({ notas: e.target.value })}
                placeholder="Notas (técnica, sustituciones...)"
                className="w-full bg-transparent text-xs text-neutral-400 placeholder:text-neutral-700 focus:outline-none mt-2"
              />
            </div>
          )}

          {elemento.tipo === "contenido" && (
            <div className="space-y-1">
              <div className="text-xs text-neutral-500">📝 Nota / contenido</div>
              <input
                value={elemento.titulo}
                onChange={(e) => onActualizar({ titulo: e.target.value })}
                placeholder="Título"
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500"
              />
              <textarea
                value={elemento.markdown}
                onChange={(e) => onActualizar({ markdown: e.target.value })}
                placeholder="Texto que verá la clienta..."
                rows={3}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500 resize-y"
              />
            </div>
          )}

          {elemento.tipo === "metrica_prompt" && (
            <div className="space-y-1">
              <div className="text-xs text-neutral-500">⚖️ Pedir métrica</div>
              <select
                value={elemento.metrica_tipo}
                onChange={(e) => onActualizar({ metrica_tipo: e.target.value })}
                className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500"
              >
                <option value="peso">Peso corporal</option>
                <option value="perimetro_cintura">Perímetro cintura</option>
                <option value="perimetro_cadera">Perímetro cadera</option>
                <option value="perimetro_brazo">Perímetro brazo</option>
                <option value="porcentaje_grasa">% grasa corporal</option>
                <option value="masa_muscular">Masa muscular</option>
              </select>
            </div>
          )}

          {elemento.tipo === "foto_progreso_prompt" && (
            <div className="text-sm text-neutral-300">
              📸 Solicitar foto de progreso
            </div>
          )}

          {elemento.tipo === "pasos_prompt" && (
            <div className="text-sm text-neutral-300">
              👣 Solicitar pasos del día
            </div>
          )}

          {elemento.tipo === "recordatorio" && (
            <div className="space-y-1">
              <div className="text-xs text-neutral-500">🔔 Recordatorio</div>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={elemento.hora}
                  onChange={(e) => onActualizar({ hora: e.target.value })}
                  className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500"
                />
                <input
                  value={elemento.mensaje}
                  onChange={(e) => onActualizar({ mensaje: e.target.value })}
                  placeholder="Mensaje (Ej: Bebe agua)"
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          )}

          {elemento.tipo === "pdf" && (
            <div className="space-y-2">
              <div className="text-xs text-neutral-500">📄 PDF adjunto</div>
              <input
                value={elemento.titulo}
                onChange={(e) => onActualizar({ titulo: e.target.value })}
                placeholder="Título del documento"
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500"
              />
              {elemento.url ? (
                <div className="flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5">
                  <div className="text-xs text-neutral-300 truncate flex-1">
                    <span className="text-neutral-500">📄</span>{" "}
                    {elemento.nombre_archivo ?? elemento.url.split("/").pop()}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onActualizar({ url: "", nombre_archivo: undefined })
                    }
                    className="text-xs text-neutral-500 hover:text-red-400 ml-2"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <SubirArchivo
                  bucket="programa-adjuntos"
                  accept="application/pdf"
                  coachId={coachId}
                  nombre={`pdf-${elemento.id}`}
                  descripcion="PDF · hasta 150 MB"
                  onSubido={(ruta, nombreArchivo) =>
                    onActualizar({ url: ruta, nombre_archivo: nombreArchivo })
                  }
                />
              )}
            </div>
          )}

          {elemento.tipo === "video" && (
            <div className="space-y-2">
              <div className="text-xs text-neutral-500">🎥 Vídeo (subido)</div>
              <input
                value={elemento.titulo}
                onChange={(e) => onActualizar({ titulo: e.target.value })}
                placeholder="Título del vídeo"
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500"
              />
              {elemento.url ? (
                <div className="flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5">
                  <div className="text-xs text-neutral-300 truncate flex-1">
                    <span className="text-neutral-500">🎥</span>{" "}
                    {elemento.nombre_archivo ?? elemento.url.split("/").pop()}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onActualizar({ url: "", nombre_archivo: undefined })
                    }
                    className="text-xs text-neutral-500 hover:text-red-400 ml-2"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <SubirArchivo
                  bucket="programa-adjuntos"
                  accept="video/mp4,video/quicktime,video/webm"
                  coachId={coachId}
                  nombre={`video-${elemento.id}`}
                  descripcion="MP4 / MOV / WebM · hasta 150 MB"
                  onSubido={(ruta, nombreArchivo) =>
                    onActualizar({ url: ruta, nombre_archivo: nombreArchivo })
                  }
                />
              )}
            </div>
          )}

          {elemento.tipo === "video_externo" && (
            <div className="space-y-2">
              <div className="text-xs text-neutral-500">▶️ Vídeo externo</div>
              <input
                value={elemento.titulo}
                onChange={(e) => onActualizar({ titulo: e.target.value })}
                placeholder="Título"
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500"
              />
              <input
                value={elemento.url}
                onChange={(e) => {
                  const url = e.target.value;
                  onActualizar({
                    url,
                    proveedor: detectarProveedorVideo(url),
                  });
                }}
                placeholder="Pega URL de YouTube o Vimeo"
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500"
              />
              {elemento.url && (
                <div className="text-[10px] text-neutral-500">
                  {elemento.proveedor === "youtube"
                    ? "✓ YouTube detectado"
                    : elemento.proveedor === "vimeo"
                    ? "✓ Vimeo detectado"
                    : "⚠ No se reconoce el proveedor — se mostrará como enlace"}
                </div>
              )}
            </div>
          )}

          {elemento.tipo === "enlace" && (
            <div className="space-y-2">
              <div className="text-xs text-neutral-500">🔗 Enlace</div>
              <input
                value={elemento.titulo}
                onChange={(e) => onActualizar({ titulo: e.target.value })}
                placeholder="Título"
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500"
              />
              <input
                value={elemento.url}
                onChange={(e) => onActualizar({ url: e.target.value })}
                placeholder="https://..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500"
              />
              <input
                value={elemento.descripcion ?? ""}
                onChange={(e) => onActualizar({ descripcion: e.target.value })}
                placeholder="Descripción (opcional)"
                className="w-full bg-transparent text-xs text-neutral-400 placeholder:text-neutral-700 focus:outline-none"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-0.5 pl-1">
          <button
            onClick={() => onMover(-1)}
            disabled={esPrimero}
            className="text-xs text-neutral-500 hover:text-white disabled:opacity-20 disabled:hover:text-neutral-500 px-1"
            title="Subir"
          >
            ↑
          </button>
          <button
            onClick={() => onMover(1)}
            disabled={esUltimo}
            className="text-xs text-neutral-500 hover:text-white disabled:opacity-20 disabled:hover:text-neutral-500 px-1"
            title="Bajar"
          >
            ↓
          </button>
          <button
            onClick={onEliminar}
            className="text-xs text-neutral-500 hover:text-red-400 px-1 mt-1"
            title="Eliminar"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
