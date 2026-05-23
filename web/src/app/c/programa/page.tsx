import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EstructuraPrograma } from "@/lib/supabase/tipos";
import { formatearFecha } from "@/lib/utilidades";

function fechaISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function diasEntre(a: string, b: string): number {
  const fa = new Date(a + "T00:00:00Z");
  const fb = new Date(b + "T00:00:00Z");
  return Math.floor((fb.getTime() - fa.getTime()) / 86400000);
}

export default async function MiProgramaPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: clienta } = await supabase
    .from("clientas")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!clienta) return null;

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

  if (!asign) {
    return (
      <div>
        <h1 className="text-xl font-semibold mb-4">Mi programa</h1>
        <div className="border border-dashed border-neutral-800 rounded-2xl p-8 text-center text-sm text-neutral-500">
          Sin programa asignado todavía.
        </div>
      </div>
    );
  }

  const hoy = fechaISO(new Date());
  const offset = diasEntre(asign.fecha_inicio, hoy);
  const semanaIdxHoy = Math.floor(offset / 7);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">
        {asign.programas?.nombre ?? "Mi programa"}
      </h1>
      <div className="text-xs text-neutral-500 mb-4">
        {formatearFecha(asign.fecha_inicio)}
        {asign.fecha_fin && ` → ${formatearFecha(asign.fecha_fin)}`} ·{" "}
        {asign.estructura_snapshot.length} semanas
      </div>

      <div className="space-y-3">
        {asign.estructura_snapshot.map((sem, i) => {
          const esActual = i === semanaIdxHoy;
          return (
            <details
              key={i}
              open={esActual}
              className={
                "border rounded-2xl overflow-hidden " +
                (esActual
                  ? "border-brand-900/40 bg-brand-950/10"
                  : "border-neutral-800 bg-neutral-950")
              }
            >
              <summary className="px-4 py-3 cursor-pointer text-sm font-medium list-none flex justify-between items-center">
                <span>
                  Semana {sem.semana}
                  {esActual && <span className="ml-2 text-brand-400 text-xs">· ACTUAL</span>}
                </span>
                <span className="text-xs text-neutral-500">
                  {sem.dias.filter((d) => !d.descanso && d.bloques.length > 0).length}{" "}
                  días de entreno
                </span>
              </summary>
              <div className="border-t border-neutral-800 divide-y divide-neutral-900">
                {sem.dias.map((d, j) => (
                  <div key={j} className="px-4 py-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{d.titulo}</span>
                      {d.descanso && (
                        <span className="text-xs text-neutral-500">Descanso</span>
                      )}
                    </div>
                    {!d.descanso && d.bloques.length > 0 && (
                      <div className="text-xs text-neutral-500">
                        {d.bloques.length}{" "}
                        {d.bloques.length === 1 ? "bloque" : "bloques"} ·{" "}
                        {d.bloques.reduce((a, b) => a + b.elementos.length, 0)}{" "}
                        elementos
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
