"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { guardarRegistroSerie, guardarComentarioEjercicio } from "./acciones";
import type { ElementoEjercicio } from "@/lib/supabase/tipos";
import { MessageSquarePlus, Check, Camera } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SerieRealizada = {
  peso: string;
  reps: string;
  completado: boolean;
};

/**
 * Tarjeta interactiva del ejercicio: la clienta marca cada serie cuando la
 * hace, anota el peso y las reps reales, y todo se guarda en
 * sesiones.registros[elementoId].series_realizadas.
 *
 * Auto-save: el toggle "completado" guarda al instante. Los inputs de
 * peso/reps guardan en onBlur (al perder el foco) para no machacar el server
 * en cada tecla.
 */
export function RegistroEjercicio({
  clientaId,
  fecha,
  semana,
  dia,
  elemento,
  registroExistente,
  ultimoRegistro,
  comentarioExistente,
  adjuntosExistentes,
  coachId,
}: {
  clientaId: string;
  fecha: string;
  semana: number;
  dia: number;
  elemento: ElementoEjercicio;
  registroExistente: SerieRealizada[] | null;
  ultimoRegistro: { fecha: string; peso: string; reps: string } | null;
  comentarioExistente: string | null;
  adjuntosExistentes: string[];
  coachId: string;
}) {
  const router = useRouter();
  const [enviando, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Comentario + fotos de la clienta sobre este ejercicio (#2 huecos TS)
  const [comentario, setComentario] = useState(comentarioExistente ?? "");
  const [adjuntos, setAdjuntos] = useState<string[]>(adjuntosExistentes);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [subiendo, setSubiendo] = useState(false);
  const [mostrandoComentario, setMostrandoComentario] = useState(
    !!comentarioExistente || adjuntosExistentes.length > 0
  );
  const [comentarioGuardado, setComentarioGuardado] = useState(false);

  // URLs firmadas para previsualizar las fotos ya subidas.
  useEffect(() => {
    if (adjuntos.length === 0) {
      setUrls({});
      return;
    }
    let cancelado = false;
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const nuevo: Record<string, string> = {};
      for (const path of adjuntos) {
        const { data } = await supabase.storage
          .from("fotos-progreso")
          .createSignedUrl(path, 3600);
        if (data?.signedUrl) nuevo[path] = data.signedUrl;
      }
      if (!cancelado) setUrls(nuevo);
    })();
    return () => {
      cancelado = true;
    };
  }, [adjuntos]);

  async function subirAdjuntos(files: FileList) {
    if (files.length === 0) return;
    setSubiendo(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const nuevas: string[] = [];
      for (const archivo of Array.from(files)) {
        const ext = archivo.name.split(".").pop() ?? "jpg";
        // Ruta unificada coachId/clientaId/archivo: la clienta puede escribir
        // (seg2 = su id) y el coach puede leerla (seg1 = su id) en su panel.
        const ruta = `${coachId}/${clientaId}/ej-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 6)}.${ext}`;
        const { error: errUp } = await supabase.storage
          .from("fotos-progreso")
          .upload(ruta, archivo, { cacheControl: "3600", upsert: false });
        if (errUp) {
          setError(errUp.message);
          continue;
        }
        nuevas.push(ruta);
      }
      if (nuevas.length) setAdjuntos((prev) => [...prev, ...nuevas]);
    } finally {
      setSubiendo(false);
    }
  }

  function quitarAdjunto(path: string) {
    setAdjuntos((prev) => prev.filter((p) => p !== path));
  }

  const comentarioCambiado =
    comentario.trim() !== (comentarioExistente ?? "").trim();
  const adjuntosCambiados =
    adjuntos.join(",") !== adjuntosExistentes.join(",");
  const hayCambios = comentarioCambiado || adjuntosCambiados;

  function guardarComentario() {
    setError(null);
    startTransition(async () => {
      const r = await guardarComentarioEjercicio({
        clientaId,
        fecha,
        semana,
        dia,
        elementoId: elemento.id,
        comentario,
        adjuntos,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setComentarioGuardado(true);
      setTimeout(() => setComentarioGuardado(false), 2000);
      router.refresh();
    });
  }

  // Estado local con los registros. Arranca con lo registrado (si existe),
  // si no con los valores planificados (peso/reps) pero sin marcar completado.
  const inicial: SerieRealizada[] = (() => {
    if (registroExistente && registroExistente.length > 0) {
      // Padding por si el plan tiene más series de las registradas
      const out = [...registroExistente];
      while (out.length < elemento.series.length) {
        const planificada = elemento.series[out.length]!;
        out.push({
          peso: planificada.peso,
          reps: planificada.reps,
          completado: false,
        });
      }
      return out;
    }
    return elemento.series.map((s) => ({
      peso: s.peso,
      reps: s.reps,
      completado: false,
    }));
  })();

  const [series, setSeries] = useState<SerieRealizada[]>(inicial);

  function guardarParche(serieIdx: number, parche: Partial<SerieRealizada>) {
    setError(null);
    startTransition(async () => {
      const r = await guardarRegistroSerie({
        clientaId,
        fecha,
        semana,
        dia,
        elementoId: elemento.id,
        serieIdx,
        parche,
      });
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  function toggleCompleto(idx: number) {
    const nuevo = !series[idx]!.completado;
    setSeries((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, completado: nuevo } : s))
    );
    // Si se marca completado y el peso/reps están vacíos, copiar del plan
    const actual = series[idx]!;
    const peso = actual.peso || elemento.series[idx]?.peso || "";
    const reps = actual.reps || elemento.series[idx]?.reps || "";
    guardarParche(idx, { completado: nuevo, peso, reps });
  }

  function cambiarValor(
    idx: number,
    campo: "peso" | "reps",
    valor: string
  ) {
    setSeries((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [campo]: valor } : s))
    );
  }

  function guardarValorAlSalir(
    idx: number,
    campo: "peso" | "reps"
  ) {
    guardarParche(idx, { [campo]: series[idx]![campo] });
  }

  const total = series.length;
  const completadas = series.filter((s) => s.completado).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="text-[10px] uppercase tracking-wide text-neutral-500">
            Series
          </div>
          {ultimoRegistro && (
            <div
              className="text-[10px] text-amber-400/80 bg-amber-950/20 border border-amber-900/30 rounded px-1.5 py-0.5"
              title={`Última vez: ${ultimoRegistro.fecha}`}
            >
              Último: {ultimoRegistro.peso || "—"} kg × {ultimoRegistro.reps || "—"}
            </div>
          )}
        </div>
        <div className="text-[10px] text-neutral-500">
          {completadas}/{total}
        </div>
      </div>
      <ul className="space-y-1.5">
        {series.map((s, idx) => {
          const planificada = elemento.series[idx];
          return (
            <li
              key={idx}
              className={
                "flex items-center gap-2 rounded-lg px-2 py-1.5 transition " +
                (s.completado
                  ? "bg-green-950/20 border border-green-900/40"
                  : "bg-neutral-900/50 border border-neutral-800")
              }
            >
              <button
                onClick={() => toggleCompleto(idx)}
                disabled={enviando}
                className={
                  "w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition " +
                  (s.completado
                    ? "bg-brand-600 border-brand-600 text-white"
                    : "border-neutral-700 hover:border-brand-500")
                }
                aria-label={
                  s.completado ? "Marcar serie como no hecha" : "Marcar serie como hecha"
                }
              >
                {s.completado && (
                  <span className="text-[10px] leading-none">✓</span>
                )}
              </button>
              <span className="text-[10px] text-neutral-500 w-7 tabular-nums">
                S{idx + 1}
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={s.peso}
                onChange={(e) => cambiarValor(idx, "peso", e.target.value)}
                onBlur={() => guardarValorAlSalir(idx, "peso")}
                placeholder={planificada?.peso || "kg"}
                className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-sm w-16 focus:outline-none focus:border-brand-500"
              />
              <span className="text-[10px] text-neutral-500">×</span>
              <input
                type="text"
                inputMode="numeric"
                value={s.reps}
                onChange={(e) => cambiarValor(idx, "reps", e.target.value)}
                onBlur={() => guardarValorAlSalir(idx, "reps")}
                placeholder={planificada?.reps || "reps"}
                className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-sm w-14 focus:outline-none focus:border-brand-500"
              />
              <span className="text-[10px] text-neutral-500 flex-shrink-0">
                reps
              </span>
              {planificada && (
                <span className="text-[10px] text-neutral-600 ml-auto truncate">
                  Plan: {planificada.peso || "—"} × {planificada.reps}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {/* Comentario por ejercicio (#2): la clienta cuenta cómo le fue */}
      {!mostrandoComentario ? (
        <button
          onClick={() => setMostrandoComentario(true)}
          className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-neutral-500 hover:text-neutral-300"
        >
          <MessageSquarePlus className="size-3.5" /> Añadir comentario
        </button>
      ) : (
        <div className="mt-2 space-y-2">
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={2}
            placeholder="¿Cómo te fue este ejercicio? (molestias, sensaciones…)"
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 resize-none"
          />
          {/* Fotos adjuntas (ej. para que el coach revise la técnica) */}
          <div className="flex flex-wrap gap-2">
            {adjuntos.map((path) => (
              <div
                key={path}
                className="relative size-14 rounded overflow-hidden bg-neutral-900 border border-neutral-800 group"
              >
                {urls[path] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urls[path]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-[10px] text-neutral-600">…</div>
                )}
                <button
                  type="button"
                  onClick={() => quitarAdjunto(path)}
                  className="absolute top-0 right-0 size-4 grid place-items-center bg-black/80 text-white text-[10px]"
                  aria-label="Quitar foto"
                >
                  ✕
                </button>
              </div>
            ))}
            <label
              className={
                "size-14 rounded border border-dashed grid place-items-center cursor-pointer " +
                (subiendo ? "border-neutral-700 text-neutral-600" : "border-neutral-700 text-neutral-400 hover:border-neutral-500")
              }
              title="Adjuntar foto"
            >
              {subiendo ? <span className="text-xs">…</span> : <Camera className="size-4" />}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                disabled={subiendo}
                onChange={(e) => {
                  if (e.target.files) subirAdjuntos(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <button
            onClick={guardarComentario}
            disabled={enviando || subiendo || !hayCambios}
            className="text-xs font-medium text-white rounded-lg px-4 py-1.5 disabled:opacity-40"
            style={{ backgroundColor: "var(--brand)" }}
          >
            {comentarioGuardado ? (
              <span className="inline-flex items-center gap-1">
                <Check className="size-4" /> Guardado
              </span>
            ) : (
              "Enviar"
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="text-xs text-red-400 mt-2">{error}</div>
      )}
    </div>
  );
}
