import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatearFecha } from "@/lib/utilidades";
import { CHECKIN_SEMANAL } from "@/lib/checkin";

type FilaCheckin = {
  semana: string;
  respuestas: Record<string, string> | null;
  creado_en: string;
};

export default async function CheckinsCoachPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: clientaId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: clienta } = await supabase
    .from("clientas")
    .select("id, nombre, apellidos")
    .eq("id", clientaId)
    .maybeSingle<{ id: string; nombre: string; apellidos: string | null }>();
  if (!clienta) notFound();

  const { data: filas } = await supabase
    .from("checkins")
    .select("semana, respuestas, creado_en")
    .eq("clienta_id", clientaId)
    .order("semana", { ascending: false });

  const checkins = (filas ?? []) as FilaCheckin[];

  return (
    <div className="p-4 pt-16 md:p-8 mx-auto max-w-2xl">
      <Link
        href={`/clientas/${clientaId}`}
        className="text-sm text-neutral-400 hover:text-neutral-200"
      >
        ← Volver a {clienta.nombre}
      </Link>
      <h1 className="text-2xl font-semibold mt-3 mb-1">Check-ins semanales</h1>
      <p className="text-sm text-neutral-400 mb-6">
        Lo que {clienta.nombre} ha reportado cada semana.
      </p>

      {checkins.length === 0 ? (
        <div className="border border-dashed border-neutral-800 rounded-2xl p-8 text-center text-sm text-neutral-500">
          {clienta.nombre} aún no ha enviado ningún check-in.
        </div>
      ) : (
        <div className="space-y-4">
          {checkins.map((c) => {
            const r = c.respuestas ?? {};
            return (
              <div
                key={c.semana}
                className="border border-neutral-800 rounded-2xl p-5"
              >
                <div className="text-xs uppercase tracking-wide text-neutral-500 mb-3">
                  Semana del {formatearFecha(c.semana)}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  {(
                    [
                      ["adherencia_entreno", "Entreno"],
                      ["adherencia_dieta", "Dieta"],
                      ["energia", "Energía"],
                      ["sueno", "Sueño"],
                    ] as const
                  ).map(([id, label]) => (
                    <div
                      key={id}
                      className="border border-neutral-800 rounded-lg px-3 py-2 text-center"
                    >
                      <div className="text-[10px] uppercase tracking-wide text-neutral-500">
                        {label}
                      </div>
                      <div className="text-lg font-semibold">
                        {r[id] ? `${r[id]}/5` : "—"}
                      </div>
                    </div>
                  ))}
                </div>
                {r.peso && (
                  <div className="text-sm text-neutral-400 mb-2">
                    Peso reportado: <span className="text-neutral-100">{r.peso} kg</span>
                  </div>
                )}
                {CHECKIN_SEMANAL.preguntas
                  .filter((p) => p.tipo === "parrafo" && r[p.id])
                  .map((p) => (
                    <div key={p.id} className="mb-2">
                      <div className="text-xs text-neutral-500">{p.label}</div>
                      <p className="text-sm whitespace-pre-wrap text-neutral-200">
                        {r[p.id]}
                      </p>
                    </div>
                  ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
