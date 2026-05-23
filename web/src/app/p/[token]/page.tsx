import { notFound } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { EstructuraPrograma, Bloque, Dia } from "@/lib/supabase/tipos";
import { formatearFecha } from "@/lib/utilidades";
import { BotonImprimir } from "./boton-imprimir";
import { LOGROS, calcularNivel, xpTotal as calcularXpTotal, type TipoLogro } from "@/lib/gamificacion";

type DatosPrograma = {
  asignacion_id: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  estructura: EstructuraPrograma;
  clienta_nombre: string;
  clienta_apellidos: string | null;
  programa_nombre: string;
  coach_nombre: string;
  coach_marca_nombre: string | null;
};

export const dynamic = "force-dynamic";

function fechaISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function diasEntre(a: string, b: string): number {
  const fa = new Date(a + "T00:00:00Z");
  const fb = new Date(b + "T00:00:00Z");
  return Math.floor((fb.getTime() - fa.getTime()) / 86400000);
}

export default async function ProgramaPublicoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Usa el client del navegador (sin auth) — la función SQL es security definer
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("programa_por_token", { t: token });

  if (error || !data || data.length === 0) {
    notFound();
  }

  const prog = data[0] as DatosPrograma;

  // Registrar visita (best-effort, no bloquea)
  await supabase.rpc("registrar_visita_token", { t: token });

  // Logros (via función pública por token)
  const { data: logrosData } = await supabase.rpc("logros_por_token", { t: token });
  const logros = (logrosData ?? []) as Array<{
    tipo: TipoLogro;
    conseguido_en: string;
  }>;
  const xpClienta = calcularXpTotal(logros.map((l) => l.tipo));
  const nivel = calcularNivel(xpClienta);

  const hoy = fechaISO(new Date());
  const offsetHoy = diasEntre(prog.fecha_inicio, hoy);
  const semanaIdxHoy = Math.floor(offsetHoy / 7);
  const diaIdxHoy = offsetHoy % 7;
  const estaEnCurso =
    offsetHoy >= 0 && semanaIdxHoy < prog.estructura.length;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-2 mb-2 no-print">
          <div className="text-xs text-neutral-500 uppercase tracking-wide">
            {prog.coach_marca_nombre ?? prog.coach_nombre}
          </div>
          <BotonImprimir />
        </div>
        <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1 hidden print:block">
          {prog.coach_marca_nombre ?? prog.coach_nombre}
        </div>
        <h1 className="text-2xl font-semibold mb-1">{prog.programa_nombre}</h1>
        <div className="text-sm text-neutral-400">
          Para {prog.clienta_nombre} {prog.clienta_apellidos ?? ""}
        </div>
        <div className="text-xs text-neutral-600 mt-1">
          {formatearFecha(prog.fecha_inicio)}
          {prog.fecha_fin && ` → ${formatearFecha(prog.fecha_fin)}`} ·{" "}
          {prog.estructura.length}{" "}
          {prog.estructura.length === 1 ? "semana" : "semanas"}
        </div>

        {/* Logros + nivel */}
        {logros.length > 0 && (
          <div className="mt-6 bg-gradient-to-br from-brand-950/40 to-neutral-900 border border-brand-900/30 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-brand-400">
                  Nivel {nivel.nivel}
                </div>
                <div className="text-lg font-semibold text-neutral-100">
                  {nivel.nombre}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-brand-400">{xpClienta}</div>
                <div className="text-[10px] text-neutral-500 uppercase">XP</div>
              </div>
            </div>
            <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-gradient-to-r from-brand-600 to-brand-400"
                style={{ width: `${nivel.porcentaje}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {logros.map((l) => {
                const def = LOGROS[l.tipo];
                if (!def) return null;
                return (
                  <div
                    key={l.tipo}
                    className="bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1 text-center"
                    title={def.descripcion}
                  >
                    <span className="text-lg mr-1">{def.emoji}</span>
                    <span className="text-[10px] text-neutral-300">{def.nombre}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {estaEnCurso ? (
          <div className="mt-6 bg-brand-950/30 border border-brand-900/50 rounded-2xl p-4">
            <div className="text-xs uppercase tracking-wide text-brand-400 mb-1">
              HOY · Semana {semanaIdxHoy + 1}
            </div>
            <VistaDiaPublico dia={prog.estructura[semanaIdxHoy]!.dias[diaIdxHoy]!} />
          </div>
        ) : offsetHoy < 0 ? (
          <div className="mt-6 bg-amber-950/30 border border-amber-900/50 rounded-2xl p-4 text-sm">
            Empieza el {formatearFecha(prog.fecha_inicio)} ({Math.abs(offsetHoy)}{" "}
            {Math.abs(offsetHoy) === 1 ? "día" : "días"})
          </div>
        ) : (
          <div className="mt-6 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-sm text-neutral-400">
            Programa finalizado.
          </div>
        )}

        <h2 className="text-xs uppercase tracking-wide text-neutral-500 mt-8 mb-3">
          Programa completo
        </h2>
        <div className="space-y-4">
          {prog.estructura.map((semana, i) => (
            <details
              key={i}
              open={i === semanaIdxHoy}
              className="border border-neutral-800 rounded-2xl overflow-hidden bg-neutral-950"
            >
              <summary className="px-4 py-3 cursor-pointer text-sm font-medium hover:bg-neutral-900/50 list-none flex justify-between items-center">
                <span>Semana {semana.semana}</span>
                <span className="text-xs text-neutral-500">
                  {semana.dias.filter((d) => !d.descanso && d.bloques.length > 0).length} días de entreno
                </span>
              </summary>
              <div className="border-t border-neutral-800 divide-y divide-neutral-900">
                {semana.dias.map((d, j) => (
                  <div key={j} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium">{d.titulo}</div>
                      {d.descanso && (
                        <span className="text-xs text-neutral-500">Descanso</span>
                      )}
                    </div>
                    {!d.descanso &&
                      d.bloques.map((b) => (
                        <BloquePublico key={b.id} bloque={b} />
                      ))}
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-neutral-900 text-xs text-neutral-600 text-center">
          Plan de entreno generado en mi-hub
        </div>
      </div>
    </div>
  );
}

function VistaDiaPublico({ dia }: { dia: Dia }) {
  return (
    <div>
      <div className="text-lg font-semibold mb-3">
        {dia.titulo}
        {dia.descanso && (
          <span className="text-xs text-neutral-500 ml-2">(Descanso)</span>
        )}
      </div>
      {dia.descanso || dia.bloques.length === 0 ? (
        <div className="text-sm text-neutral-400">
          {dia.descanso
            ? "Día de descanso. Hidrátate y descansa."
            : "Día libre."}
        </div>
      ) : (
        <div className="space-y-3">
          {dia.bloques.map((b) => (
            <BloquePublico key={b.id} bloque={b} />
          ))}
        </div>
      )}
    </div>
  );
}

function BloquePublico({ bloque }: { bloque: Bloque }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 mb-2">
      <div className="text-sm font-medium">{bloque.titulo}</div>
      {bloque.indicaciones && (
        <div className="text-xs text-neutral-500 mt-0.5">{bloque.indicaciones}</div>
      )}
      <ul className="mt-2 space-y-2">
        {bloque.elementos.map((el) => (
          <li key={el.id} className="text-sm">
            {el.tipo === "ejercicio" && (
              <div>
                <div className="text-neutral-100">
                  • {el.ejercicio_nombre ?? "Ejercicio"}
                </div>
                <div className="text-xs text-neutral-500 ml-3">
                  {el.series
                    .map(
                      (s, i) =>
                        `${i + 1}: ${s.reps} reps${s.peso ? ` @ ${s.peso}` : ""}${s.descanso ? ` · desc ${s.descanso}` : ""}`
                    )
                    .join(" · ")}
                </div>
                {el.notas && (
                  <div className="text-xs text-neutral-500 ml-3 mt-0.5 italic">
                    {el.notas}
                  </div>
                )}
              </div>
            )}
            {el.tipo === "contenido" && (
              <div className="text-neutral-300">
                <div className="text-xs uppercase tracking-wide text-neutral-500">
                  📝 {el.titulo}
                </div>
                <div className="whitespace-pre-wrap text-sm mt-1">
                  {el.markdown}
                </div>
              </div>
            )}
            {el.tipo === "metrica_prompt" && (
              <div className="text-neutral-300">
                ⚖️ Registra tu {el.metrica_tipo.replace(/_/g, " ")}
              </div>
            )}
            {el.tipo === "foto_progreso_prompt" && (
              <div className="text-neutral-300">📸 Sube una foto de progreso</div>
            )}
            {el.tipo === "pasos_prompt" && (
              <div className="text-neutral-300">👣 Registra tus pasos del día</div>
            )}
            {el.tipo === "recordatorio" && (
              <div className="text-neutral-300">
                🔔 {el.hora} · {el.mensaje}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
