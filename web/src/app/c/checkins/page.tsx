import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatearFecha } from "@/lib/utilidades";
import { CHECKIN_SEMANAL, lunesDeEstaSemana } from "@/lib/checkin";
import { CheckinForm } from "./formulario";

type FilaCheckin = {
  semana: string;
  respuestas: Record<string, string> | null;
};

export default async function CheckinsClientaPage() {
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

  const semanaActual = lunesDeEstaSemana();

  const { data: filas } = await supabase
    .from("checkins")
    .select("semana, respuestas")
    .eq("clienta_id", clienta.id)
    .order("semana", { ascending: false });

  const todos = (filas ?? []) as FilaCheckin[];
  const actual = todos.find((c) => c.semana === semanaActual);
  const pasados = todos.filter((c) => c.semana !== semanaActual);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">{CHECKIN_SEMANAL.titulo}</h1>
      <p className="text-sm text-neutral-400 mb-5">{CHECKIN_SEMANAL.intro}</p>

      <div className="border border-neutral-800 rounded-2xl p-4 mb-6">
        <div className="text-xs text-neutral-500 mb-3">
          Semana del {formatearFecha(semanaActual)}
          {actual && <span className="text-emerald-400"> · ✓ enviado</span>}
        </div>
        <CheckinForm
          semana={semanaActual}
          respuestasIniciales={actual?.respuestas ?? {}}
          yaHecho={!!actual}
        />
      </div>

      {pasados.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm uppercase tracking-wide text-neutral-500">
            Anteriores
          </h2>
          {pasados.map((c) => (
            <div
              key={c.semana}
              className="border border-neutral-800 rounded-xl p-3 text-sm"
            >
              <div className="text-xs text-neutral-500 mb-1">
                Semana del {formatearFecha(c.semana)}
              </div>
              <ResumenCheckin respuestas={c.respuestas ?? {}} />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function ResumenCheckin({ respuestas }: { respuestas: Record<string, string> }) {
  const escalas = [
    ["adherencia_entreno", "Entreno"],
    ["adherencia_dieta", "Dieta"],
    ["energia", "Energía"],
    ["sueno", "Sueño"],
  ] as const;
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400">
        {escalas.map(([id, label]) =>
          respuestas[id] ? (
            <span key={id}>
              {label}: <span className="text-neutral-200">{respuestas[id]}/5</span>
            </span>
          ) : null
        )}
        {respuestas.peso ? (
          <span>
            Peso: <span className="text-neutral-200">{respuestas.peso} kg</span>
          </span>
        ) : null}
      </div>
      {respuestas.resumen && (
        <p className="text-neutral-300 whitespace-pre-wrap">{respuestas.resumen}</p>
      )}
    </div>
  );
}
