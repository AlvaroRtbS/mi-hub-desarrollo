import { createSupabaseServerClient } from "@/lib/supabase/server";
import { obtenerUrlsFirmadas } from "@/lib/supabase/archivos";
import { GestorMisFotos } from "./gestor";

type Foto = {
  id: string;
  url: string;
  tipo: string | null;
  fecha: string;
  notas: string | null;
  subida_en: string;
};

export default async function MisFotosPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: clienta } = await supabase
    .from("clientas")
    .select("id, coach_id, comparador_fotos_activo")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!clienta) return null;

  const { data: fotosData } = await supabase
    .from("fotos_progreso")
    .select("id, url, tipo, fecha, notas, subida_en")
    .eq("clienta_id", clienta.id)
    .order("fecha", { ascending: false });

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
    <div>
      <h1 className="text-xl font-semibold mb-1">Fotos de progreso</h1>
      <p className="text-sm text-neutral-400 mb-4">
        Solo tu entrenador y tú podéis ver tus fotos.
      </p>

      <GestorMisFotos
        clientaId={clienta.id}
        coachId={clienta.coach_id}
        comparadorActivo={clienta.comparador_fotos_activo ?? true}
        fotos={fotosConUrl}
      />
    </div>
  );
}
