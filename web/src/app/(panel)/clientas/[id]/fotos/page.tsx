import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { obtenerUrlsFirmadas } from "@/lib/supabase/archivos";
import { inicialesNombre } from "@/lib/utilidades";
import { GestorFotos } from "./gestor-fotos";

type Foto = {
  id: string;
  url: string;
  tipo: string | null;
  fecha: string;
  notas: string | null;
  subida_en: string;
};

export default async function FotosPage({
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
    .single();

  const { data: clienta } = await supabase
    .from("clientas")
    .select("id, nombre, apellidos, comparador_fotos_activo")
    .eq("id", id)
    .maybeSingle();

  if (!clienta) notFound();

  const { data: fotosData } = await supabase
    .from("fotos_progreso")
    .select("id, url, tipo, fecha, notas, subida_en")
    .eq("clienta_id", id)
    .order("fecha", { ascending: true });

  const fotos = (fotosData ?? []) as Foto[];
  const firmadas = await obtenerUrlsFirmadas(
    "fotos-progreso",
    fotos.map((f) => f.url),
    3600
  );

  const fotosConUrl = fotos.map((f) => ({
    ...f,
    urlFirmada: firmadas.get(f.url) ?? null,
  }));

  return (
    <div className="p-8 max-w-5xl">
      <Link
        href={`/clientas/${id}`}
        className="text-sm text-neutral-400 hover:text-neutral-200"
      >
        ← Volver a la ficha
      </Link>

      <div className="mt-4 flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center text-sm font-medium text-neutral-300">
          {inicialesNombre(clienta.nombre, clienta.apellidos)}
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Fotos de progreso</h1>
          <div className="text-sm text-neutral-500">
            {clienta.nombre} {clienta.apellidos ?? ""}
          </div>
        </div>
      </div>

      <GestorFotos
        clientaId={clienta.id}
        coachId={coach!.id}
        comparadorActivo={clienta.comparador_fotos_activo ?? true}
        fotos={fotosConUrl}
      />
    </div>
  );
}
