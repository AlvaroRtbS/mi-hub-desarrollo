import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FormularioEjercicio } from "../formulario";
import { crearEjercicio } from "../acciones";

export default async function NuevoEjercicioPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: coach } = await supabase
    .from("coaches")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!coach) redirect("/login");

  return (
    <div className="p-4 pt-16 md:p-8 mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold mb-1">Nuevo ejercicio</h1>
      <p className="text-sm text-neutral-400 mb-6">
        Crea un ejercicio para tu biblioteca personal.
      </p>
      <FormularioEjercicio
        coachId={coach.id}
        accion={crearEjercicio}
        textoBoton="Crear ejercicio"
      />
    </div>
  );
}
