import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FormularioLista } from "./formulario-lista";

export default async function NuevaListaPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: clientas } = await supabase
    .from("clientas")
    .select("id, nombre, apellidos")
    .in("estado", ["activa", "invitada"])
    .order("nombre");

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-1">Nueva lista de la compra</h1>
      <p className="text-sm text-neutral-400 mb-6">
        Una línea por producto. La clienta podrá marcar lo que ya tiene.
      </p>
      <FormularioLista clientas={clientas ?? []} />
    </div>
  );
}
