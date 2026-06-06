"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Boton } from "@/components/ui/boton";
import { Input, Textarea } from "@/components/ui/campo";
import {
  guardarEstructura,
  actualizarMetadatosPrograma,
  eliminarPrograma,
  duplicarPrograma,
  contarAsignacionesActivas,
  propagarEstructuraAAsignaciones,
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
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { SortableWrapper } from "./sortable-wrapper";
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

/** Suma `n` a unas reps: "10"→"11", "8-10"→"9-11", "30s"→"31s". No toca lo no numérico. */
function incrementarReps(reps: string, n: number): string {
  if (!n) return reps;
  const r = (reps ?? "").trim();
  const rango = r.match(/^(\d+)\s*-\s*(\d+)$/);
  if (rango)
    return `${Math.max(0, parseInt(rango[1]!) + n)}-${Math.max(0, parseInt(rango[2]!) + n)}`;
  const simple = r.match(/^(\d+)(\s*\D.*)?$/);
  if (simple) return `${Math.max(0, parseInt(simple[1]!) + n)}${simple[2] ?? ""}`;
  return reps;
}

/** Suma `n` kg a un peso conservando la unidad: "20 kg"→"22.5 kg". Peso corporal ("" o "0") no cambia. */
function incrementarPeso(peso: string, n: number): string {
  if (!n) return peso;
  const p = (peso ?? "").trim();
  if (p === "" || p === "0") return peso;
  const m = p.match(/^(\d+(?:[.,]\d+)?)(.*)$/);
  if (!m) return peso;
  const val = Math.max(0, parseFloat(m[1]!.replace(",", ".")) + n);
  return `${Number.isInteger(val) ? val : val.toFixed(1)}${m[2] ?? ""}`;
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
  // Progresión automática (#18): incrementos a aplicar al duplicar la semana.
  const [progReps, setProgReps] = useState(1);
  const [progPeso, setProgPeso] = useState(0);
  const [diaIdx, setDiaIdx] = useState(0);
  const [sucio, setSucio] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [guardando, startTransition] = useTransition();
  const [selectorAbierto, setSelectorAbierto] = useState<null | { bloqueId: string }>(null);
  const [asignarAbierto, setAsignarAbierto] = useState(false);
  // Histórico para deshacer (Ctrl+Z). Máx 50 snapshots.
  const [historico, setHistorico] = useState<EstructuraPrograma[]>([]);
  // Portapapeles interno: copia de día o de bloque entre días/semanas.
  const [clipboard, setClipboard] = useState<
    | { tipo: "dia"; payload: Dia }
    | { tipo: "bloque"; payload: Bloque }
    | null
  >(null);

  const semanaActual = estructura[semanaIdx];
  const diaActual = semanaActual?.dias[diaIdx];

  // ============================================================================
  // Mutaciones locales del state
  // ============================================================================

  const actualizarEstructura = useCallback(
    (mutador: (est: EstructuraPrograma) => void) => {
      setEstructura((prev) => {
        // Guardar snapshot previo para deshacer (máx 50)
        setHistorico((h) => [...h.slice(-49), prev]);
        const copia = clonar(prev);
        mutador(copia);
        return copia;
      });
      setSucio(true);
    },
    []
  );

  const deshacer = useCallback(() => {
    setHistorico((h) => {
      if (h.length === 0) return h;
      const ultimo = h[h.length - 1]!;
      setEstructura(ultimo);
      setSucio(true);
      return h.slice(0, -1);
    });
  }, []);

  // Atajo de teclado Ctrl/Cmd+Z para deshacer
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // No interceptar si el usuario está escribiendo en un input/textarea
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      // ⌘Z / Ctrl+Z → deshacer
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        deshacer();
        return;
      }
      // 1-7 → saltar a día N de la semana actual
      if (
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        /^[1-7]$/.test(e.key)
      ) {
        e.preventDefault();
        setDiaIdx(parseInt(e.key, 10) - 1);
        return;
      }
      // ←/→ → semana anterior/siguiente
      if (e.key === "ArrowLeft" && (e.altKey || e.shiftKey)) {
        e.preventDefault();
        setSemanaIdx((i) => Math.max(0, i - 1));
        return;
      }
      if (e.key === "ArrowRight" && (e.altKey || e.shiftKey)) {
        e.preventDefault();
        setSemanaIdx((i) => Math.min(estructura.length - 1, i + 1));
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [deshacer, estructura.length]);

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

  // #18 — Progresión automática: duplica la semana aplicando +reps y/o +kg a
  // cada serie de ejercicio. La forma del programa se mantiene; solo cambian
  // las cargas. Ideal para generar la sobrecarga progresiva semana a semana.
  const duplicarSemanaConProgresion = (idx: number) => {
    if (!progReps && !progPeso) {
      setMensaje({ tipo: "error", texto: "Indica un incremento de reps o de kg." });
      return;
    }
    actualizarEstructura((est) => {
      const orig = est[idx];
      if (!orig) return;
      const copia: Semana = clonar(orig);
      copia.semana = est.length + 1;
      copia.dias.forEach((d) => {
        d.bloques.forEach((b) => {
          b.id = uuid();
          b.elementos.forEach((e) => {
            e.id = uuid();
            if (e.tipo === "ejercicio") {
              e.series = e.series.map((s) => ({
                ...s,
                reps: incrementarReps(s.reps, progReps),
                peso: incrementarPeso(s.peso, progPeso),
              }));
            }
          });
        });
      });
      est.push(copia);
    });
    setSemanaIdx(estructura.length);
    setMensaje({
      tipo: "ok",
      texto: `Semana creada con progresión${progReps ? ` +${progReps} rep` : ""}${progPeso ? ` +${progPeso} kg` : ""}.`,
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

  const duplicarDiaLocal = () => {
    const dActual = estructura[semanaIdx]?.dias[diaIdx];
    if (!dActual) return;
    actualizarEstructura((est) => {
      const sem = est[semanaIdx];
      if (!sem) return;
      const copia: Dia = clonar(dActual);
      copia.bloques.forEach((b) => {
        b.id = uuid();
        b.elementos.forEach((e) => (e.id = uuid()));
      });
      copia.dia = sem.dias.length + 1;
      copia.titulo = `${dActual.titulo} (copia)`;
      sem.dias.push(copia);
    });
    // Saltar al día recién creado
    setTimeout(() => setDiaIdx(estructura[semanaIdx]!.dias.length), 0);
    setMensaje({ tipo: "ok", texto: "Día duplicado al final de la semana." });
    setTimeout(() => setMensaje(null), 2000);
  };

  const copiarDia = () => {
    const d = estructura[semanaIdx]?.dias[diaIdx];
    if (!d) return;
    setClipboard({ tipo: "dia", payload: clonar(d) });
    setMensaje({ tipo: "ok", texto: `Día "${d.titulo}" copiado al portapapeles.` });
    setTimeout(() => setMensaje(null), 2000);
  };

  const pegarDia = () => {
    if (!clipboard || clipboard.tipo !== "dia") return;
    if (
      !confirm(
        "Esto reemplazará todos los bloques del día actual con los del día copiado. ¿Continuar?"
      )
    )
      return;
    actualizarEstructura((est) => {
      const d = est[semanaIdx]?.dias[diaIdx];
      if (!d) return;
      const copia: Dia = clonar(clipboard.payload);
      // Mantener el "dia" numérico actual y el título actual
      d.descanso = copia.descanso ?? false;
      d.bloques = copia.bloques.map((b) => ({
        ...b,
        id: uuid(),
        elementos: b.elementos.map((e) => ({ ...e, id: uuid() })),
      }));
    });
    setMensaje({ tipo: "ok", texto: "Día pegado." });
    setTimeout(() => setMensaje(null), 2000);
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

  const duplicarBloqueLocal = (bIdx: number) => {
    actualizarEstructura((est) => {
      const bloques = est[semanaIdx]?.dias[diaIdx]?.bloques;
      if (!bloques) return;
      const orig = bloques[bIdx];
      if (!orig) return;
      const copia: Bloque = clonar(orig);
      copia.id = uuid();
      copia.titulo = `${orig.titulo} (copia)`;
      copia.elementos.forEach((e) => (e.id = uuid()));
      bloques.splice(bIdx + 1, 0, copia);
    });
  };

  const copiarBloque = (bIdx: number) => {
    const b = estructura[semanaIdx]?.dias[diaIdx]?.bloques[bIdx];
    if (!b) return;
    setClipboard({ tipo: "bloque", payload: clonar(b) });
    setMensaje({ tipo: "ok", texto: `Bloque "${b.titulo}" copiado.` });
    setTimeout(() => setMensaje(null), 2000);
  };

  const pegarBloque = () => {
    if (!clipboard || clipboard.tipo !== "bloque") return;
    actualizarEstructura((est) => {
      const dia = est[semanaIdx]?.dias[diaIdx];
      if (!dia) return;
      const copia: Bloque = clonar(clipboard.payload);
      copia.id = uuid();
      copia.elementos.forEach((e) => (e.id = uuid()));
      dia.bloques.push(copia);
    });
    setMensaje({ tipo: "ok", texto: "Bloque pegado." });
    setTimeout(() => setMensaje(null), 2000);
  };

  const moverBloqueADia = (
    bIdx: number,
    destinoSem: number,
    destinoDia: number
  ) => {
    actualizarEstructura((est) => {
      const bloques = est[semanaIdx]?.dias[diaIdx]?.bloques;
      const destino = est[destinoSem]?.dias[destinoDia];
      if (!bloques || !destino) return;
      const [bloque] = bloques.splice(bIdx, 1);
      if (bloque) destino.bloques.push(bloque);
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
          nuevo = {
            id: uuid(),
            tipo: "contenido",
            titulo: "Nota",
            markdown: "",
            imagenes: [],
          };
          break;
        case "metrica_prompt":
          nuevo = { id: uuid(), tipo: "metrica_prompt", metrica_tipo: "peso" };
          break;
        case "foto_progreso_prompt":
          nuevo = { id: uuid(), tipo: "foto_progreso_prompt" };
          break;
        case "pasos_prompt":
          nuevo = {
            id: uuid(),
            tipo: "pasos_prompt",
            periodo: "media_semanal",
            instrucciones:
              "Sube una captura de tu app de pasos con la media semanal.",
            permitir_capturas: true,
          };
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
      const r = await eliminarPrograma(programaId);
      // En caso de éxito la acción redirige; si vuelve con error, mostrarlo.
      if (r && !r.ok) setMensaje({ tipo: "error", texto: r.error });
    });
  };

  // --- Drag-and-drop ---
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const onDragEndBloques = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    actualizarEstructura((est) => {
      const bloques = est[semanaIdx]?.dias[diaIdx]?.bloques;
      if (!bloques) return;
      const oldIdx = bloques.findIndex((b) => b.id === active.id);
      const newIdx = bloques.findIndex((b) => b.id === over.id);
      if (oldIdx < 0 || newIdx < 0) return;
      const reordenado = arrayMove(bloques, oldIdx, newIdx);
      est[semanaIdx]!.dias[diaIdx]!.bloques = reordenado;
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
            <button
              onClick={deshacer}
              disabled={historico.length === 0}
              className="text-xs text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed px-2"
              title="Deshacer (Ctrl+Z)"
            >
              ↶ Deshacer
            </button>
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
            <BotonPropagar programaId={programaId} sucio={sucio} />
            <a
              href={`/imprimir/programa/${programaId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-xs px-3 py-1.5 rounded border border-neutral-700 text-neutral-300 hover:bg-neutral-900 hover:text-white"
              title="Abre una vista lista para imprimir o guardar como PDF"
            >
              Imprimir / PDF
            </a>
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
            <span className="text-neutral-700 mx-1">|</span>
            <span
              className="text-xs text-neutral-500 inline-flex items-center gap-1"
              title="Crea una semana nueva copiando la actual y sumando estos incrementos a cada serie"
            >
              Progresión:
              <input
                type="number"
                value={progReps}
                onChange={(e) => setProgReps(Math.trunc(Number(e.target.value) || 0))}
                className="w-11 bg-neutral-900 border border-neutral-800 rounded px-1 py-0.5 text-center text-neutral-200"
              />
              rep
              <input
                type="number"
                step="0.5"
                value={progPeso}
                onChange={(e) => setProgPeso(Number(e.target.value) || 0)}
                className="w-12 bg-neutral-900 border border-neutral-800 rounded px-1 py-0.5 text-center text-neutral-200"
              />
              kg
              <button
                onClick={() => duplicarSemanaConProgresion(semanaIdx)}
                className="text-brand-500 hover:text-brand-400 px-1.5 py-0.5 rounded hover:bg-neutral-900"
              >
                + Semana con progresión
              </button>
            </span>
            <span className="text-neutral-700 mx-1">|</span>
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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-semibold">{diaActual.titulo}</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Día {diaActual.dia} · Semana {semanaActual?.semana}
                <span className="ml-2 text-neutral-600">
                  · Atajos:{" "}
                  <kbd className="px-1 py-0.5 bg-neutral-900 rounded border border-neutral-800">
                    1
                  </kbd>
                  -
                  <kbd className="px-1 py-0.5 bg-neutral-900 rounded border border-neutral-800">
                    7
                  </kbd>{" "}
                  saltar día ·{" "}
                  <kbd className="px-1 py-0.5 bg-neutral-900 rounded border border-neutral-800">
                    ⇧
                  </kbd>
                  +
                  <kbd className="px-1 py-0.5 bg-neutral-900 rounded border border-neutral-800">
                    ←/→
                  </kbd>{" "}
                  semana
                </span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={copiarDia}
                className="text-xs text-neutral-500 hover:text-neutral-200"
                title="Copiar este día (con todos sus bloques) al portapapeles"
              >
                ⧉ Copiar día
              </button>
              {clipboard?.tipo === "dia" && (
                <button
                  onClick={pegarDia}
                  className="text-xs text-brand-500 hover:text-brand-400"
                  title="Reemplazar este día con el del portapapeles"
                >
                  ↘ Pegar día
                </button>
              )}
              <button
                onClick={duplicarDiaLocal}
                className="text-xs text-neutral-500 hover:text-neutral-200"
                title="Duplicar este día al final de la semana"
              >
                + Duplicar día
              </button>
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
          </div>

          {diaActual.descanso && diaActual.bloques.length === 0 ? (
            <div className="border border-dashed border-neutral-800 rounded-2xl p-10 text-center text-sm text-neutral-500">
              Día de descanso. No hay bloques asignados.
            </div>
          ) : (
            <>
              <DndContext
                sensors={sensores}
                collisionDetection={closestCenter}
                onDragEnd={onDragEndBloques}
              >
                <SortableContext
                  items={diaActual.bloques.map((b) => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {diaActual.bloques.map((bloque, bIdx) => (
                      <SortableWrapper key={bloque.id} id={bloque.id}>
                        {(handle) => (
                          <VistaBloque
                            bloque={bloque}
                            coachId={coachId}
                            esPrimero={bIdx === 0}
                            esUltimo={bIdx === diaActual.bloques.length - 1}
                            estructura={estructura}
                            semanaActualIdx={semanaIdx}
                            diaActualIdx={diaIdx}
                            dragHandle={handle}
                            sensores={sensores}
                            onActualizar={(parche) =>
                              actualizarBloque(bIdx, parche)
                            }
                            onEliminar={() => eliminarBloque(bIdx)}
                            onMover={(dir) => moverBloque(bIdx, dir)}
                            onDuplicar={() => duplicarBloqueLocal(bIdx)}
                            onCopiar={() => copiarBloque(bIdx)}
                            onMoverADia={(s, d) => moverBloqueADia(bIdx, s, d)}
                            onAbrirSelectorEjercicio={() =>
                              setSelectorAbierto({ bloqueId: bloque.id })
                            }
                            onAñadirElementoSimple={(tipo) =>
                              añadirElementoSimple(bIdx, tipo)
                            }
                            onActualizarElemento={(eIdx, parche) =>
                              actualizarElemento(bIdx, eIdx, parche)
                            }
                            onEliminarElemento={(eIdx) =>
                              eliminarElemento(bIdx, eIdx)
                            }
                            onMoverElemento={(eIdx, dir) =>
                              moverElemento(bIdx, eIdx, dir)
                            }
                            onReordenarElementos={(oldIdx, newIdx) =>
                              actualizarEstructura((est) => {
                                const els =
                                  est[semanaIdx]?.dias[diaIdx]?.bloques[bIdx]
                                    ?.elementos;
                                if (!els) return;
                                est[semanaIdx]!.dias[diaIdx]!.bloques[
                                  bIdx
                                ]!.elementos = arrayMove(els, oldIdx, newIdx);
                              })
                            }
                            onAñadirSerie={(eIdx) => añadirSerie(bIdx, eIdx)}
                            onEliminarSerie={(eIdx, sIdx) =>
                              eliminarSerie(bIdx, eIdx, sIdx)
                            }
                            onActualizarSerie={(eIdx, sIdx, parche) =>
                              actualizarSerie(bIdx, eIdx, sIdx, parche)
                            }
                          />
                        )}
                      </SortableWrapper>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              <div className="flex items-center gap-2">
                <button
                  onClick={añadirBloque}
                  className="flex-1 border border-dashed border-neutral-800 rounded-2xl py-4 text-sm text-neutral-400 hover:text-white hover:border-neutral-700 hover:bg-neutral-900/50"
                >
                  + Añadir bloque
                </button>
                {clipboard?.tipo === "bloque" && (
                  <button
                    onClick={pegarBloque}
                    className="border border-brand-700/40 bg-brand-950/30 rounded-2xl py-4 px-5 text-sm text-brand-400 hover:bg-brand-900/30 hover:border-brand-700"
                    title={`Pegar bloque copiado: "${clipboard.payload.titulo}"`}
                  >
                    ↘ Pegar bloque
                  </button>
                )}
              </div>
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
  estructura,
  semanaActualIdx,
  diaActualIdx,
  dragHandle,
  sensores,
  onActualizar,
  onEliminar,
  onMover,
  onDuplicar,
  onCopiar,
  onMoverADia,
  onAbrirSelectorEjercicio,
  onAñadirElementoSimple,
  onActualizarElemento,
  onEliminarElemento,
  onMoverElemento,
  onReordenarElementos,
  onAñadirSerie,
  onEliminarSerie,
  onActualizarSerie,
}: {
  bloque: Bloque;
  coachId: string;
  esPrimero: boolean;
  esUltimo: boolean;
  estructura: EstructuraPrograma;
  semanaActualIdx: number;
  diaActualIdx: number;
  dragHandle: React.ReactNode;
  sensores: ReturnType<typeof useSensors>;
  onActualizar: (parche: Partial<Bloque>) => void;
  onEliminar: () => void;
  onMover: (dir: -1 | 1) => void;
  onDuplicar: () => void;
  onCopiar: () => void;
  onMoverADia: (semIdx: number, diaIdx: number) => void;
  onAbrirSelectorEjercicio: () => void;
  onAñadirElementoSimple: (tipo: Elemento["tipo"]) => void;
  onActualizarElemento: (eIdx: number, parche: Partial<Elemento>) => void;
  onEliminarElemento: (eIdx: number) => void;
  onMoverElemento: (eIdx: number, dir: -1 | 1) => void;
  onReordenarElementos: (oldIdx: number, newIdx: number) => void;
  onAñadirSerie: (eIdx: number) => void;
  onEliminarSerie: (eIdx: number, sIdx: number) => void;
  onActualizarSerie: (
    eIdx: number,
    sIdx: number,
    parche: Partial<SerieEjercicio>
  ) => void;
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [moverMenuAbierto, setMoverMenuAbierto] = useState(false);

  const onDragEndElementos = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = bloque.elementos.findIndex((e) => e.id === active.id);
    const newIdx = bloque.elementos.findIndex((e) => e.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    onReordenarElementos(oldIdx, newIdx);
  };

  return (
    <div className="border border-neutral-800 rounded-2xl bg-neutral-950">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-neutral-800">
        {dragHandle}
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
            onClick={onDuplicar}
            className="text-xs text-neutral-500 hover:text-white px-1.5"
            title="Duplicar bloque (en el mismo día)"
          >
            ⧉
          </button>
          <button
            onClick={onCopiar}
            className="text-xs text-neutral-500 hover:text-white px-1.5"
            title="Copiar bloque al portapapeles"
          >
            📋
          </button>
          <div className="relative">
            <button
              onClick={() => setMoverMenuAbierto((v) => !v)}
              className="text-xs text-neutral-500 hover:text-white px-1.5"
              title="Mover a otro día"
            >
              →
            </button>
            {moverMenuAbierto && (
              <>
                <button
                  onClick={() => setMoverMenuAbierto(false)}
                  className="fixed inset-0 z-10 cursor-default"
                  aria-label="Cerrar menú"
                />
                <div className="absolute z-20 mt-1 right-0 bg-neutral-950 border border-neutral-800 rounded-lg shadow-xl py-1 min-w-[220px] max-h-80 overflow-auto">
                  <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-neutral-500">
                    Mover bloque a…
                  </div>
                  {estructura.map((sem, sIdx) =>
                    sem.dias.map((dia, dIdx) => {
                      const esActual = sIdx === semanaActualIdx && dIdx === diaActualIdx;
                      if (esActual) return null;
                      return (
                        <button
                          key={`${sIdx}-${dIdx}`}
                          onClick={() => {
                            onMoverADia(sIdx, dIdx);
                            setMoverMenuAbierto(false);
                          }}
                          className="block w-full text-left text-xs px-3 py-1.5 hover:bg-neutral-900 text-neutral-300"
                        >
                          S{sem.semana} · {dia.titulo}
                          {dia.descanso && (
                            <span className="text-neutral-600 ml-1">(descanso)</span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
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
          <DndContext
            sensors={sensores}
            collisionDetection={closestCenter}
            onDragEnd={onDragEndElementos}
          >
            <SortableContext
              items={bloque.elementos.map((e) => e.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {bloque.elementos.map((el, eIdx) => (
                  <SortableWrapper key={el.id} id={el.id}>
                    {(handle) => (
                      <VistaElemento
                        elemento={el}
                        coachId={coachId}
                        esPrimero={eIdx === 0}
                        esUltimo={eIdx === bloque.elementos.length - 1}
                        dragHandle={handle}
                        onActualizar={(parche) =>
                          onActualizarElemento(eIdx, parche)
                        }
                        onEliminar={() => onEliminarElemento(eIdx)}
                        onMover={(dir) => onMoverElemento(eIdx, dir)}
                        onAñadirSerie={() => onAñadirSerie(eIdx)}
                        onEliminarSerie={(sIdx) =>
                          onEliminarSerie(eIdx, sIdx)
                        }
                        onActualizarSerie={(sIdx, parche) =>
                          onActualizarSerie(eIdx, sIdx, parche)
                        }
                      />
                    )}
                  </SortableWrapper>
                ))}
              </div>
            </SortableContext>
          </DndContext>
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
                      ["pasos_prompt", "👣 Pedir pasos (con captura)"],
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
  dragHandle,
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
  dragHandle: React.ReactNode;
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
            <div className="space-y-2">
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
              <ImagenesAdjuntas
                coachId={coachId}
                elementoId={elemento.id}
                imagenes={elemento.imagenes ?? []}
                onActualizar={(nuevas) => onActualizar({ imagenes: nuevas })}
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
            <div className="space-y-2">
              <div className="text-xs text-neutral-500">👣 Pedir pasos</div>
              <label className="block">
                <span className="block text-[11px] text-neutral-500 mb-0.5">
                  Período
                </span>
                <select
                  value={elemento.periodo ?? "dia"}
                  onChange={(e) =>
                    onActualizar({
                      periodo: e.target.value as
                        | "dia"
                        | "semana"
                        | "media_semanal",
                    })
                  }
                  className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500"
                >
                  <option value="dia">Del día</option>
                  <option value="semana">De la semana (total)</option>
                  <option value="media_semanal">Media semanal</option>
                </select>
              </label>
              <textarea
                value={elemento.instrucciones ?? ""}
                onChange={(e) =>
                  onActualizar({ instrucciones: e.target.value })
                }
                placeholder="Instrucciones para la clienta (ej: sube una captura de la app)"
                rows={2}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500 resize-y"
              />
              <label className="inline-flex items-center gap-2 text-xs text-neutral-300">
                <input
                  type="checkbox"
                  checked={elemento.permitir_capturas !== false}
                  onChange={(e) =>
                    onActualizar({ permitir_capturas: e.target.checked })
                  }
                  className="accent-brand-500"
                />
                Permitir que la clienta adjunte captura(s) al rellenar
              </label>
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
          {dragHandle}
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

/**
 * Botón "Aplicar a todas las clientas" — propaga la estructura actual
 * a todas las asignaciones activas de este programa.
 *
 * Útil para coaches que mantienen UN programa base (ej. "Pérdida de
 * peso 12 semanas") y van iterando: cambias el programa una vez y se
 * refleja en todas las clientas que lo tienen asignado.
 *
 * Confirma siempre por modal porque sobrescribe customizaciones por
 * clienta (si las hubiera en estructura_snapshot).
 */
function BotonPropagar({
  programaId,
  sucio,
}: {
  programaId: string;
  sucio: boolean;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [cuenta, setCuenta] = useState<number | null>(null);
  const [propagando, startTransition] = useTransition();

  async function abrir() {
    setConfirmando(true);
    setCuenta(null);
    const n = await contarAsignacionesActivas(programaId);
    setCuenta(n);
  }

  function aplicar() {
    startTransition(async () => {
      const r = await propagarEstructuraAAsignaciones(programaId);
      if (!r.ok) {
        alert(r.error ?? "No se pudo propagar.");
        return;
      }
      alert(
        `Estructura aplicada a ${r.actualizadas} clienta${r.actualizadas === 1 ? "" : "s"}.`
      );
      setConfirmando(false);
    });
  }

  return (
    <>
      <button
        onClick={abrir}
        disabled={sucio}
        title={
          sucio
            ? "Guarda los cambios pendientes antes de propagar"
            : "Aplica la versión guardada de este programa a todas las clientas que lo tienen asignado"
        }
        className="inline-flex items-center text-xs px-3 py-1.5 rounded border border-neutral-700 text-neutral-300 hover:bg-neutral-900 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Aplicar a todas
      </button>

      {confirmando && (
        <div
          className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => !propagando && setConfirmando(false)}
        >
          <div
            className="bg-neutral-950 border border-neutral-800 rounded-2xl max-w-md w-full p-5 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold mb-2">
              Aplicar este programa a todas las clientas
            </h3>
            {cuenta == null ? (
              <p className="text-sm text-neutral-500 animate-pulse">
                Contando clientas afectadas…
              </p>
            ) : cuenta === 0 ? (
              <p className="text-sm text-neutral-400">
                No hay ninguna clienta con este programa asignado todavía.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-neutral-300">
                  Esto reemplazará la estructura de{" "}
                  <strong>
                    {cuenta} clienta{cuenta === 1 ? "" : "s"}
                  </strong>{" "}
                  con la versión actual del programa.
                </p>
                <p className="text-xs text-amber-400 bg-amber-950/30 border border-amber-900/50 rounded px-3 py-2">
                  ⚠ Si alguna de ellas tenía customizaciones (pesos
                  ajustados, ejercicios sustituidos), se perderán.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setConfirmando(false)}
                disabled={propagando}
                className="text-sm px-3 py-1.5 rounded text-neutral-400 hover:text-white"
              >
                Cancelar
              </button>
              {cuenta != null && cuenta > 0 && (
                <button
                  onClick={aplicar}
                  disabled={propagando}
                  className="text-sm px-3 py-1.5 rounded text-white"
                  style={{ backgroundColor: "var(--brand)" }}
                >
                  {propagando ? "Aplicando…" : `Aplicar a ${cuenta}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Componente reutilizable: subir múltiples imágenes adjuntas a un elemento
 * del programa. Guarda los paths en bucket "programa-adjuntos".
 * Muestra thumbnails con botón de quitar y un botón "+ Imagen" para añadir.
 */
function ImagenesAdjuntas({
  coachId,
  elementoId,
  imagenes,
  onActualizar,
}: {
  coachId: string;
  elementoId: string;
  imagenes: string[];
  onActualizar: (nuevas: string[]) => void;
}) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const refInput = useRef<HTMLInputElement>(null);

  // Cargar URLs firmadas para las thumbnails (caduca en 1h)
  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      if (imagenes.length === 0) {
        setUrls({});
        return;
      }
      const supabase = createSupabaseBrowserClient();
      const nuevo: Record<string, string> = {};
      for (const path of imagenes) {
        const { data } = await supabase.storage
          .from("programa-adjuntos")
          .createSignedUrl(path, 3600);
        if (data?.signedUrl) nuevo[path] = data.signedUrl;
      }
      if (!cancelado) setUrls(nuevo);
    }
    cargar();
    return () => {
      cancelado = true;
    };
  }, [imagenes]);

  async function alSeleccionar(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? []);
    if (archivos.length === 0) return;
    setSubiendo(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const nuevasRutas: string[] = [];
      for (const archivo of archivos) {
        const ext = archivo.name.split(".").pop() ?? "jpg";
        const ruta = `${coachId}/img-${elementoId}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 6)}.${ext}`;
        const { error: errSubida } = await supabase.storage
          .from("programa-adjuntos")
          .upload(ruta, archivo, { cacheControl: "3600", upsert: false });
        if (errSubida) {
          setError(errSubida.message);
          continue;
        }
        nuevasRutas.push(ruta);
      }
      onActualizar([...imagenes, ...nuevasRutas]);
    } finally {
      setSubiendo(false);
      if (refInput.current) refInput.current.value = "";
    }
  }

  function quitar(path: string) {
    onActualizar(imagenes.filter((p) => p !== path));
  }

  return (
    <div className="pt-1">
      <div className="text-[11px] text-neutral-500 mb-1.5">
        Imágenes adjuntas{" "}
        <span className="text-neutral-600">({imagenes.length})</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {imagenes.map((path) => (
          <div
            key={path}
            className="relative size-16 rounded overflow-hidden bg-neutral-900 border border-neutral-800 group"
          >
            {urls[path] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={urls[path]}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full grid place-items-center text-[10px] text-neutral-600">
                …
              </div>
            )}
            <button
              type="button"
              onClick={() => quitar(path)}
              className="absolute top-0 right-0 size-5 grid place-items-center bg-black/80 text-white text-xs opacity-0 group-hover:opacity-100 transition"
              aria-label="Quitar imagen"
              title="Quitar imagen"
            >
              ✕
            </button>
          </div>
        ))}
        <label
          className={
            "size-16 rounded border border-dashed grid place-items-center text-xs cursor-pointer transition " +
            (subiendo
              ? "border-neutral-700 text-neutral-600"
              : "border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-white")
          }
        >
          {subiendo ? "…" : "+ Imagen"}
          <input
            ref={refInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            disabled={subiendo}
            onChange={alSeleccionar}
          />
        </label>
      </div>
      {error && (
        <div className="text-[11px] text-red-400 mt-1.5">{error}</div>
      )}
    </div>
  );
}
