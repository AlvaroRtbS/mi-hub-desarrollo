import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EstructuraPrograma, Bloque, Elemento } from "@/lib/supabase/tipos";
import { LOGROS, calcularNivel, xpTotal as calcularXpTotal, type TipoLogro } from "@/lib/gamificacion";
import { calcularAdherencia, diasProgramadosDeAsignacion } from "@/lib/adherencia";
import { BotonCompletarSesion } from "./boton-completar";

function fechaISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

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

  const hoy = fechaISO(new Date());

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
          Tu entrenadora aún no te ha asignado un programa.
        </p>
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
            ¡Has terminado el programa! Habla con tu entrenadora para el
            siguiente.
          </div>
        </div>
      </div>
    );
  }

  const dia = semana.dias[diaIdx]!;

  // Sesión de hoy (si ya existe)
  const { data: sesionHoy } = await supabase
    .from("sesiones")
    .select("id, completada, registros")
    .eq("clienta_id", clienta.id)
    .eq("fecha", hoy)
    .maybeSingle();

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
              <BloqueClienta key={b.id} bloque={b} />
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

function BloqueClienta({ bloque }: { bloque: Bloque }) {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-3">
      <div className="font-medium text-sm">{bloque.titulo}</div>
      {bloque.indicaciones && (
        <div className="text-xs text-neutral-500 mt-0.5">{bloque.indicaciones}</div>
      )}
      <ul className="mt-2 space-y-1.5">
        {bloque.elementos.map((el: Elemento) => (
          <li key={el.id} className="flex items-start gap-2 text-sm">
            {el.tipo === "ejercicio" && (
              <>
                <span className="text-neutral-500 mt-0.5">•</span>
                <div className="flex-1 min-w-0">
                  <div className="text-neutral-100">{el.ejercicio_nombre ?? "Ejercicio"}</div>
                  <div className="text-xs text-neutral-500">
                    {el.series.length} series ·{" "}
                    {el.series.map((s) => s.reps).join(" / ")}{" "}
                    {el.series[0]?.peso && `@ ${el.series[0]?.peso}`}
                  </div>
                  {el.notas && (
                    <div className="text-xs text-neutral-500 mt-0.5 italic">{el.notas}</div>
                  )}
                </div>
              </>
            )}
            {el.tipo === "contenido" && (
              <div className="flex-1 text-neutral-300">
                <div className="text-xs uppercase tracking-wide text-neutral-500">
                  📝 {el.titulo}
                </div>
                <div className="text-sm mt-1 whitespace-pre-wrap">{el.markdown}</div>
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
              <div className="flex-1 text-neutral-300">👣 Registra tus pasos del día</div>
            )}
            {el.tipo === "recordatorio" && (
              <div className="flex-1 text-neutral-300">
                🔔 {el.hora} · {el.mensaje}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
