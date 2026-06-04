import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { obtenerUrlFirmada } from "@/lib/supabase/archivos";
import { FormularioEjercicio } from "../../formulario";
import { actualizarEjercicio, eliminarEjercicio } from "../../acciones";
import { Boton } from "@/components/ui/boton";
import type { Ejercicio } from "@/lib/supabase/tipos";
import { BotonEliminar } from "./boton-eliminar";

export default async function EditarEjercicioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const { data: ejercicio } = await supabase
    .from("ejercicios")
    .select("*")
    .eq("id", id)
    .maybeSingle<Ejercicio>();

  if (!ejercicio) notFound();

  const accion = actualizarEjercicio.bind(null, id);
  const videoUrl = await obtenerUrlFirmada("ejercicios-videos", ejercicio.video_url, 3600);

  return (
    <div className="p-8 mx-auto max-w-5xl">
      <Link href="/ejercicios" className="text-sm text-neutral-400 hover:text-neutral-200">
        ← Volver
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Editar ejercicio</h1>
          <p className="text-sm text-neutral-400 mt-1">{ejercicio.nombre}</p>
        </div>
        <BotonEliminar ejercicioId={ejercicio.id} />
      </div>

      <div className="mt-8 grid grid-cols-3 gap-8">
        <div className="col-span-2">
          <FormularioEjercicio
            ejercicio={ejercicio}
            coachId={coach!.id}
            accion={accion}
            textoBoton="Guardar cambios"
          />
        </div>

        <div className="col-span-1">
          <div className="sticky top-8">
            <div className="text-xs uppercase tracking-wide text-neutral-500 mb-2">
              Vista previa
            </div>
            {videoUrl ? (
              <video
                src={videoUrl}
                controls
                className="w-full rounded-2xl border border-neutral-800 bg-black"
              />
            ) : (
              <div className="aspect-video rounded-2xl border border-dashed border-neutral-800 flex items-center justify-center text-sm text-neutral-500">
                Sin vídeo
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
