import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { obtenerUrlsFirmadas } from "@/lib/supabase/archivos";
import type { EstructuraPrograma, Bloque, Elemento } from "@/lib/supabase/tipos";
import { urlEmbedVideo } from "@/lib/supabase/tipos";
import { LOGROS, calcularNivel, xpTotal as calcularXpTotal, type TipoLogro } from "@/lib/gamificacion";
import { calcularAdherencia, diasProgramadosDeAsignacion } from "@/lib/adherencia";
import { hoyISO } from "@/lib/utilidades";
import { ChevronRight } from "lucide-react";
import { BotonCompletarSesion } from "./boton-completar";
import { RegistroEjercicio } from "./registro-ejercicio";
import { RegistroPasos } from "./registro-pasos";

type SerieRealizada = {
  peso: string;
  reps: string;
  completado: boolean;
};

type RegistrosSesion = Record<
  string,
  { series_realizadas?: SerieRealizada[] }
>;

function diasEntre(a: string, b: string): number {
  const fa = new Date(a + "T00:00:00Z");
  const fb = new Date(b + "T00:00:00Z");
  return Math.floor((fb.getTime() - fa.getTime()) / 86400000);
}

export default async function HoyPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: clienta } = await supabase
    .from("clientas")
    .select("id, nombre")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!clienta) return null;

  // ¿Tiene el formulario inicial pendiente? (para avisarle en Hoy)
  const { data: formInicial } = await supabase
    .from("formulario_respuestas")
    .select("completado")
    .eq("clienta_id", clienta.id)
    .eq("tipo", "inicial")
    .maybeSingle<{ completado: boolean }>();
  const formularioPendiente = !formInicial?.completado;

  // Asignación activa
  const { data: asignacion } = await supabase
    .from("asignaciones")
    .select(
      "id, fecha_inicio, fecha_fin, estructura_snapshot, programas(nombre)"
    )
    .eq("clienta_id", clienta.id)
    .eq("activa", true)
    .order("creada_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  const asign = asignacion as
    | {
        id: string;
        fecha_inicio: string;
        fecha_fin: string | null;
        estructura_snapshot: EstructuraPrograma;
        programas: { nombre: string } | null;
      }
    | null;

  const hoy = hoyISO();

  // Logros + XP
  const { data: logrosData } = await supabase
    .from("logros")
    .select("tipo, conseguido_en")
    .eq("clienta_id", clienta.id);
  const logros = (logrosData ?? []) as Array<{
    tipo: TipoLogro;
    conseguido_en: string;
  }>;
  const xp = calcularXpTotal(logros.map((l) => l.tipo));
  const nivel = calcularNivel(xp);

  // Sin programa
  if (!asign) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-1">¡Hola, {clienta.nombre}!</h1>
        <p className="text-sm text-neutral-400 mb-6">
          Tu entrenador aún no te ha asignado un programa.
        </p>
        {formularioPendiente && (
          <div className="mb-6">
            <AvisoFormularioInicial />
          </div>
        )}
        <div className="border border-dashed border-neutral-800 rounded-2xl p-8 text-center text-sm text-neutral-500">
          Cuando te asigne uno, aparecerá aquí con tu entreno del día.
        </div>
      </div>
    );
  }

  const offset = diasEntre(asign.fecha_inicio, hoy);
  if (offset < 0) {
    return (
      <div>
        <Saludo nombre={clienta.nombre} nivel={nivel} xp={xp} />
        <div className="border border-amber-900/50 bg-amber-950/20 rounded-2xl p-6 text-center mt-6">
          <div className="text-2xl mb-2">⏳</div>
          <div className="text-sm">
            Tu programa <strong>{asign.programas?.nombre}</strong> empieza en{" "}
            {-offset} {-offset === 1 ? "día" : "días"}.
          </div>
        </div>
      </div>
    );
  }

  const semanaIdx = Math.floor(offset / 7);
  const diaIdx = offset % 7;
  const semana = asign.estructura_snapshot[semanaIdx];

  if (!semana) {
    return (
      <div>
        <Saludo nombre={clienta.nombre} nivel={nivel} xp={xp} />
        <div className="border border-neutral-800 rounded-2xl p-6 text-center mt-6">
          <div className="text-2xl mb-2">🎉</div>
          <div className="text-sm">
            ¡Has terminado el programa! Habla con tu entrenador para el
            siguiente.
          </div>
        </div>
      </div>
    );
  }

  const dia = semana.dias[diaIdx]!;

  // URLs firmadas para PDFs y vídeos adjuntos del día actual
  const pathsAdjuntos: (string | null)[] = [];
  // IDs de ejercicios usados hoy → para cargar sus imágenes
  const ejercicioIdsHoy: string[] = [];
  for (const b of dia.bloques) {
    for (const el of b.elementos) {
      if ((el.tipo === "pdf" || el.tipo === "video") && el.url) {
        pathsAdjuntos.push(el.url);
      }
      if (el.tipo === "ejercicio") {
        ejercicioIdsHoy.push(el.ejercicio_id);
      }
    }
  }

  const [urlsAdjuntos, ejerciciosMeta] = await Promise.all([
    obtenerUrlsFirmadas("programa-adjuntos", pathsAdjuntos, 3600),
    ejercicioIdsHoy.length > 0
      ? supabase
          .from("ejercicios")
          .select("id, imagen_url, video_url")
          .in("id", ejercicioIdsHoy)
      : Promise.resolve({ data: [] as Array<{ id: string; imagen_url: string | null; video_url: string | null }> }),
  ]);

  const metaPorEjercicio = new Map(
    (ejerciciosMeta.data ?? []).map((m) => [
      (m as { id: string }).id,
      m as { id: string; imagen_url: string | null; video_url: string | null },
    ])
  );

  // URLs firmadas para imágenes de ejercicios del día
  const pathsImagenes = Array.from(metaPorEjercicio.values()).map(
    (m) => m.imagen_url
  );
  const urlsImagenesEjercicios = await obtenerUrlsFirmadas(
    "ejercicios-imagenes",
    pathsImagenes,
    3600
  );

  // Sesión de hoy (si ya existe)
  const { data: sesionHoy } = await supabase
    .from("sesiones")
    .select("id, completada, registros, porcentaje_completado")
    .eq("clienta_id", clienta.id)
    .eq("fecha", hoy)
    .maybeSingle<{
      id: string;
      completada: boolean;
      registros: RegistrosSesion | null;
      porcentaje_completado: number;
    }>();

  const registrosHoy: RegistrosSesion = sesionHoy?.registros ?? {};

  // Para cada ejercicio del día, buscar el último registro previo
  // (mejor peso de la última sesión anterior con datos de ese elemento).
  const elementoIdsHoy: string[] = [];
  for (const b of dia.bloques) {
    for (const el of b.elementos) {
      if (el.tipo === "ejercicio") elementoIdsHoy.push(el.id);
    }
  }

  const ultimoPorElemento = new Map<
    string,
    { fecha: string; peso: string; reps: string }
  >();
  if (elementoIdsHoy.length > 0) {
    const { data: sesionesPrevias } = await supabase
      .from("sesiones")
      .select("fecha, registros")
      .eq("clienta_id", clienta.id)
      .lt("fecha", hoy)
      .order("fecha", { ascending: false })
      .limit(30);

    for (const s of (sesionesPrevias ?? []) as Array<{
      fecha: string;
      registros: RegistrosSesion | null;
    }>) {
      const regs = s.registros ?? {};
      for (const elId of elementoIdsHoy) {
        if (ultimoPorElemento.has(elId)) continue;
        const reg = regs[elId];
        if (!reg?.series_realizadas) continue;
        let mejorPesoNum = -1;
        let mejor: { peso: string; reps: string } | null = null;
        for (const sr of reg.series_realizadas) {
          if (!sr.completado) continue;
          const p = parseFloat(sr.peso ?? "");
          if (!isNaN(p) && p > mejorPesoNum) {
            mejorPesoNum = p;
            mejor = { peso: sr.peso, reps: sr.reps };
          }
        }
        if (mejor) {
          ultimoPorElemento.set(elId, {
            fecha: s.fecha,
            peso: mejor.peso,
            reps: mejor.reps,
          });
        }
      }
      if (ultimoPorElemento.size >= elementoIdsHoy.length) break;
    }
  }

  // Adherencia
  const { data: sesionesData } = await supabase
    .from("sesiones")
    .select("fecha, completada")
    .eq("clienta_id", clienta.id);
  const sesiones = (sesionesData ?? []) as Array<{
    fecha: string;
    completada: boolean;
  }>;
  const programados = diasProgramadosDeAsignacion(
    asign.fecha_inicio,
    asign.estructura_snapshot,
    hoy
  );
  const adherencia = calcularAdherencia(programados, sesiones);

  return (
    <div>
      <Saludo nombre={clienta.nombre} nivel={nivel} xp={xp} />

      {formularioPendiente && <AvisoFormularioInicial />}

      {/* Banner de racha — solo si tiene racha ≥3 para no saturar */}
      {adherencia.rachaActual >= 3 && (
        <div
          className="mt-3 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2"
          style={{
            background:
              "linear-gradient(90deg, color-mix(in srgb, var(--brand) 25%, transparent), color-mix(in srgb, var(--brand) 8%, transparent))",
            borderLeft: "3px solid var(--brand)",
          }}
        >
          <div className="text-sm">
            <span className="mr-1.5">
              {adherencia.rachaActual >= 14
                ? "🚀"
                : adherencia.rachaActual >= 7
                  ? "🔥"
                  : "💪"}
            </span>
            <strong>{adherencia.rachaActual} días seguidos</strong>{" "}
            entrenando. ¡Sigue así!
          </div>
        </div>
      )}

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        <Stat label="Racha" valor={adherencia.rachaActual} extra={adherencia.rachaActual >= 7 ? "🔥" : adherencia.rachaActual >= 3 ? "💪" : ""} />
        <Stat label="Adherencia" valor={`${adherencia.porcentajeAdherencia}%`} />
        <Stat
          label="Sesiones"
          valor={`${adherencia.sesionesCompletadas}/${adherencia.sesionesProgramadas}`}
        />
      </div>

      {/* Hoy */}
      <div className="mt-6 bg-gradient-to-br from-brand-950/40 to-neutral-900 border border-brand-900/30 rounded-2xl p-5">
        <div className="text-xs uppercase tracking-wide text-brand-400 mb-1">
          HOY · Semana {semanaIdx + 1}
        </div>
        <h1 className="text-xl font-semibold mb-3">{dia.titulo}</h1>

        {dia.descanso || dia.bloques.length === 0 ? (
          <div className="text-sm text-neutral-400">
            {dia.descanso
              ? "💆 Día de descanso. Aprovecha para hidratarte y descansar."
              : "Día libre."}
          </div>
        ) : (
          <div className="space-y-3">
            {dia.bloques.map((b) => (
              <BloqueClienta
                key={b.id}
                bloque={b}
                urlsAdjuntos={urlsAdjuntos}
                metaEjercicios={metaPorEjercicio}
                urlsImagenes={urlsImagenesEjercicios}
                registros={registrosHoy}
                ultimoPorElemento={ultimoPorElemento}
                clientaId={clienta.id}
                fecha={hoy}
                semana={semanaIdx + 1}
                dia={diaIdx + 1}
              />
            ))}

            <BotonCompletarSesion
              clientaId={clienta.id}
              fecha={hoy}
              semana={semanaIdx + 1}
              dia={diaIdx + 1}
              yaCompletada={!!sesionHoy?.completada}
              sesionId={sesionHoy?.id ?? null}
            />
          </div>
        )}
      </div>

      {/* Logros recientes */}
      {logros.length > 0 && (
        <div className="mt-6 border border-neutral-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium">Tus logros</div>
            <div className="text-xs text-neutral-500">{logros.length}</div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {logros.slice(0, 12).map((l) => {
              const def = LOGROS[l.tipo];
              if (!def) return null;
              return (
                <div
                  key={l.tipo}
                  className="bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1 text-center"
                  title={def.descripcion}
                >
                  <span className="text-base mr-1">{def.emoji}</span>
                  <span className="text-[10px] text-neutral-300">{def.nombre}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-xs text-neutral-600 text-center mt-6">
        <Link href="/c/programa" className="text-brand-500">
          Ver programa completo →
        </Link>
      </p>
    </div>
  );
}

function AvisoFormularioInicial() {
  return (
    <Link
      href="/c/formularios/inicial"
      className="flex items-center gap-3 border border-amber-900/50 bg-amber-950/20 rounded-2xl p-4 mt-4 hover:bg-amber-950/30 transition"
    >
      <div className="text-2xl">📋</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">Rellena tu formulario inicial</div>
        <div className="text-xs text-amber-300/80 mt-0.5">
          Un par de minutos. Ayuda a tu entrenador a ajustar tu plan.
        </div>
      </div>
      <ChevronRight className="size-5 text-amber-500/70 shrink-0" />
    </Link>
  );
}

function Saludo({
  nombre,
  nivel,
  xp,
}: {
  nombre: string;
  nivel: ReturnType<typeof calcularNivel>;
  xp: number;
}) {
  const h = new Date().getHours();
  const saludo =
    h < 6 ? "Buenas noches" : h < 13 ? "Buenos días" : h < 21 ? "Buenas tardes" : "Buenas noches";
  return (
    <div>
      <h1 className="text-2xl font-semibold">
        {saludo}, {nombre} 👋
      </h1>
      <div className="flex items-center gap-3 mt-2">
        <div className="text-xs text-neutral-500">
          Nivel {nivel.nivel} · {nivel.nombre}
        </div>
        <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-600 to-brand-400"
            style={{ width: `${nivel.porcentaje}%` }}
          />
        </div>
        <div className="text-xs text-brand-400 font-medium">{xp} XP</div>
      </div>
    </div>
  );
}

function Stat({
  label,
  valor,
  extra,
}: {
  label: string;
  valor: string | number;
  extra?: string;
}) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-center">
      <div className="text-[10px] uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="text-lg font-semibold mt-0.5">
        {valor}
        {extra && <span className="ml-1">{extra}</span>}
      </div>
    </div>
  );
}

function BloqueClienta({
  bloque,
  urlsAdjuntos,
  metaEjercicios,
  urlsImagenes,
  registros,
  ultimoPorElemento,
  clientaId,
  fecha,
  semana,
  dia,
}: {
  bloque: Bloque;
  urlsAdjuntos: Map<string, string>;
  metaEjercicios: Map<
    string,
    { id: string; imagen_url: string | null; video_url: string | null }
  >;
  urlsImagenes: Map<string, string>;
  registros: RegistrosSesion;
  ultimoPorElemento: Map<
    string,
    { fecha: string; peso: string; reps: string }
  >;
  clientaId: string;
  fecha: string;
  semana: number;
  dia: number;
}) {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-3">
      <div className="font-medium text-sm">{bloque.titulo}</div>
      {bloque.indicaciones && (
        <div className="text-xs text-neutral-500 mt-0.5">{bloque.indicaciones}</div>
      )}
      <ul className="mt-2 space-y-2">
        {bloque.elementos.map((el: Elemento) => (
          <li key={el.id} className={el.tipo === "ejercicio" ? "" : "flex items-start gap-2 text-sm"}>
            {el.tipo === "ejercicio" && (
              <div>
                <div className="flex items-start gap-2 mb-2">
                  {(() => {
                    const meta = metaEjercicios.get(el.ejercicio_id);
                    const imgUrl =
                      meta?.imagen_url && urlsImagenes.get(meta.imagen_url);
                    return imgUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imgUrl}
                        alt=""
                        className="w-14 h-14 rounded-lg object-cover bg-neutral-800 border border-neutral-800 flex-shrink-0"
                      />
                    ) : (
                      <span className="w-14 h-14 rounded-lg bg-neutral-800 border border-neutral-800 flex items-center justify-center text-neutral-600 flex-shrink-0">
                        🏋️
                      </span>
                    );
                  })()}
                  <div className="flex-1 min-w-0">
                    <div className="text-neutral-100 font-medium">
                      {el.ejercicio_nombre ?? "Ejercicio"}
                    </div>
                    {el.notas && (
                      <div className="text-xs text-neutral-500 mt-0.5 italic">
                        {el.notas}
                      </div>
                    )}
                  </div>
                </div>
                <RegistroEjercicio
                  clientaId={clientaId}
                  fecha={fecha}
                  semana={semana}
                  dia={dia}
                  elemento={el}
                  registroExistente={
                    registros[el.id]?.series_realizadas ?? null
                  }
                  ultimoRegistro={ultimoPorElemento.get(el.id) ?? null}
                />
              </div>
            )}
            {el.tipo === "contenido" && (
              <div className="flex-1 text-neutral-200">
                <div className="text-xs uppercase tracking-wide text-neutral-500">
                  📝 {el.titulo}
                </div>
                <div className="text-[15px] leading-relaxed mt-1.5 whitespace-pre-wrap">
                  {el.markdown}
                </div>
              </div>
            )}
            {el.tipo === "metrica_prompt" && (
              <div className="flex-1 text-neutral-300">
                ⚖️ Registra tu {el.metrica_tipo.replace(/_/g, " ")}
              </div>
            )}
            {el.tipo === "foto_progreso_prompt" && (
              <div className="flex-1 text-neutral-300">📸 Sube una foto de progreso</div>
            )}
            {el.tipo === "pasos_prompt" && (
              <div className="flex-1">
                <RegistroPasos
                  clientaId={clientaId}
                  fecha={fecha}
                  semana={semana}
                  dia={dia}
                  elementoId={el.id}
                  periodo={el.periodo}
                  instrucciones={el.instrucciones}
                  permitirCapturas={el.permitir_capturas !== false}
                  pasosIniciales={
                    (registros[el.id] as { pasos?: number | null } | undefined)
                      ?.pasos ?? null
                  }
                  capturasIniciales={
                    (registros[el.id] as { capturas?: string[] } | undefined)
                      ?.capturas ?? []
                  }
                />
              </div>
            )}
            {el.tipo === "recordatorio" && (
              <div className="flex-1 text-neutral-300">
                🔔 {el.hora} · {el.mensaje}
              </div>
            )}
            {el.tipo === "pdf" && (
              <div className="flex-1">
                <a
                  href={urlsAdjuntos.get(el.url) ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 hover:border-brand-700/50 hover:bg-neutral-900/80 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📄</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-neutral-100 truncate">
                        {el.titulo || "Documento PDF"}
                      </div>
                      <div className="text-[10px] text-brand-400">Abrir PDF →</div>
                    </div>
                  </div>
                </a>
              </div>
            )}
            {el.tipo === "video" && (
              <div className="flex-1">
                {urlsAdjuntos.get(el.url) ? (
                  <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
                    {el.titulo && (
                      <div className="px-3 pt-2 pb-1 text-xs text-neutral-400">
                        🎥 {el.titulo}
                      </div>
                    )}
                    <video
                      src={urlsAdjuntos.get(el.url)}
                      controls
                      preload="metadata"
                      className="w-full max-h-80 bg-black"
                    />
                  </div>
                ) : (
                  <div className="text-xs text-neutral-500 italic">
                    Vídeo no disponible
                  </div>
                )}
              </div>
            )}
            {el.tipo === "video_externo" && (
              <div className="flex-1">
                {el.url ? (
                  <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
                    {el.titulo && (
                      <div className="px-3 pt-2 pb-1 text-xs text-neutral-400">
                        ▶️ {el.titulo}
                      </div>
                    )}
                    {el.proveedor === "youtube" || el.proveedor === "vimeo" ? (
                      <div className="aspect-video">
                        <iframe
                          src={urlEmbedVideo(el.url)}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <a
                        href={el.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block px-3 py-2 text-xs text-brand-400 hover:text-brand-300"
                      >
                        Abrir vídeo →
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-neutral-500 italic">
                    Vídeo no configurado
                  </div>
                )}
              </div>
            )}
            {el.tipo === "enlace" && (
              <div className="flex-1">
                <a
                  href={el.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 hover:border-brand-700/50 hover:bg-neutral-900/80 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔗</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-neutral-100 truncate">
                        {el.titulo || el.url}
                      </div>
                      {el.descripcion && (
                        <div className="text-[10px] text-neutral-500 truncate">
                          {el.descripcion}
                        </div>
                      )}
                      <div className="text-[10px] text-brand-400 truncate">
                        {el.url}
                      </div>
                    </div>
                  </div>
                </a>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
