import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ListaAgenda } from "./lista-agenda";
import type { TareaCoach } from "@/lib/supabase/tipos";

export default async function AgendaPage() {
  const supabase = await createSupabaseServerClient();

  // Pendientes primero (por vencimiento), luego hechas (más recientes arriba).
  const { data } = await supabase
    .from("tareas_coach")
    .select("*")
    .order("hecha", { ascending: true })
    .order("vence", { ascending: true, nullsFirst: false })
    .order("creada_en", { ascending: false })
    .returns<TareaCoach[]>();

  return (
    <div className="p-4 pt-16 md:p-8 mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Agenda</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Tu lista de tareas del día a día (no atada a una clienta concreta).
        </p>
      </div>
      <ListaAgenda tareas={data ?? []} />
    </div>
  );
}
