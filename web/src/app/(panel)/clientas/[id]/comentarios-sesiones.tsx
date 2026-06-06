import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatearFecha } from "@/lib/utilidades";
import { ComentarioCoachInput } from "./comentario-coach-input";

type SesionFb = {
  id: string;
  fecha: string;
  notas_clienta: string | null;
  feedback: { esfuerzo?: string | null; energia?: string | null } | null;
  comentario_coach: string | null;
};

/**
 * #13 — Feedback del coach por sesión. Lista las últimas sesiones completadas
 * con lo que reportó la clienta (esfuerzo/energía/comentario) y permite al
 * coach dejarle un mensaje personal por sesión, que ella verá en su app.
 */
export async function ComentariosSesiones({ clientaId }: { clientaId: string }) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("sesiones")
    .select("id, fecha, notas_clienta, feedback, comentario_coach")
    .eq("clienta_id", clientaId)
    .eq("completada", true)
    .order("fecha", { ascending: false })
    .limit(6);

  const sesiones = (data ?? []) as SesionFb[];
  if (sesiones.length === 0) return null;

  return (
    <div className="border border-neutral-800 rounded-2xl p-5">
      <h3 className="font-medium mb-1">💬 Feedback a sus sesiones</h3>
      <p className="text-xs text-neutral-500 mb-4">
        Déjale un mensaje personal en sus últimos entrenos. Lo verá en su app.
      </p>
      <ul className="space-y-3">
        {sesiones.map((s) => {
          const fb: string[] = [];
          if (s.feedback?.esfuerzo) fb.push(`Esfuerzo ${s.feedback.esfuerzo}/5`);
          if (s.feedback?.energia) fb.push(`Energía ${s.feedback.energia}/5`);
          return (
            <li key={s.id} className="border border-neutral-900 rounded-xl p-3">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-sm text-neutral-200 capitalize">
                  {formatearFecha(s.fecha)}
                </span>
                {fb.length > 0 && (
                  <span className="text-xs text-neutral-500">{fb.join(" · ")}</span>
                )}
              </div>
              {s.notas_clienta && (
                <p className="text-xs text-neutral-400 mb-2 italic">
                  &ldquo;{s.notas_clienta}&rdquo;
                </p>
              )}
              <ComentarioCoachInput
                sesionId={s.id}
                clientaId={clientaId}
                inicial={s.comentario_coach}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
