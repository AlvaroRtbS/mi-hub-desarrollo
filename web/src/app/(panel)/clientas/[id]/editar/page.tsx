import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FormularioClienta } from "../../formulario";
import { actualizarClienta } from "../../acciones";
import type { Clienta } from "@/lib/supabase/tipos";

export default async function EditarClientaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: clienta } = await supabase
    .from("clientas")
    .select("*")
    .eq("id", id)
    .maybeSingle<Clienta>();

  if (!clienta) notFound();

  const accion = actualizarClienta.bind(null, id);

  return (
    <div className="p-8 mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold mb-1">Editar clienta</h1>
      <p className="text-sm text-neutral-400 mb-6">
        Actualiza los datos de {clienta.nombre}.
      </p>
      <FormularioClienta
        clienta={clienta}
        accion={accion}
        textoBoton="Guardar cambios"
        redirigirA={`/clientas/${id}`}
      />
    </div>
  );
}
