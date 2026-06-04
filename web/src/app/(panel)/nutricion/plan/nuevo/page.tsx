import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FormularioPlan } from "../../formulario-plan";

export default async function NuevoPlanPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: coach } = await supabase
    .from("coaches")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const { data: clientas } = await supabase
    .from("clientas")
    .select("id, nombre, apellidos")
    .in("estado", ["activa", "invitada"])
    .order("nombre");

  return (
    <div className="p-8 mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold mb-1">Nuevo plan de nutrición</h1>
      <p className="text-sm text-neutral-400 mb-6">
        Sube un PDF y/o escribe el plan en texto. Puedes asignarlo a una clienta
        o dejarlo como plantilla.
      </p>
      <FormularioPlan
        coachId={coach!.id}
        clientas={clientas ?? []}
      />
    </div>
  );
}
