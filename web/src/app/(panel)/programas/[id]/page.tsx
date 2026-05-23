import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EstructuraPrograma, Ejercicio } from "@/lib/supabase/tipos";
import { EditorPrograma } from "./editor";

export default async function ProgramaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: coach } = await supabase
    .from("coaches")
    .select("id")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();
  const coachId = (coach as { id?: string } | null)?.id ?? "";

  const { data: programa } = await supabase
    .from("programas")
    .select("id, nombre, descripcion, num_semanas, estructura")
    .eq("id", id)
    .maybeSingle();

  if (!programa) notFound();

  // Biblioteca de ejercicios para el selector
  const { data: ejerciciosData } = await supabase
    .from("ejercicios")
    .select("id, nombre, descripcion, grupos_musculares, material, video_url, imagen_url")
    .order("nombre");

  const ejercicios = (ejerciciosData ?? []) as Pick<
    Ejercicio,
    | "id"
    | "nombre"
    | "descripcion"
    | "grupos_musculares"
    | "material"
    | "video_url"
    | "imagen_url"
  >[];

  // Clientas activas para el modal "Asignar"
  const { data: clientasData } = await supabase
    .from("clientas")
    .select("id, nombre, apellidos, estado")
    .in("estado", ["activa", "invitada"])
    .order("nombre");

  return (
    <div className="p-8 max-w-7xl">
      <Link
        href="/programas"
        className="text-sm text-neutral-400 hover:text-neutral-200"
      >
        ← Volver
      </Link>

      <EditorPrograma
        programaId={programa.id}
        coachId={coachId}
        nombreInicial={programa.nombre}
        descripcionInicial={programa.descripcion}
        estructuraInicial={(programa.estructura as EstructuraPrograma) ?? []}
        ejercicios={ejercicios}
        clientas={clientasData ?? []}
      />
    </div>
  );
}
