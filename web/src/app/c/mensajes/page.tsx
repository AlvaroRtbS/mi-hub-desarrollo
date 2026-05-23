import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ChatClienta } from "./chat";

type Mensaje = {
  id: string;
  contenido: string;
  remitente: "coach" | "clienta";
  enviado_en: string;
  leido: boolean;
};

export default async function MensajesClientaPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: clienta } = await supabase
    .from("clientas")
    .select("id, coaches(nombre)")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!clienta) return null;

  const { data: mensajesData } = await supabase
    .from("mensajes")
    .select("id, contenido, remitente, enviado_en, leido")
    .eq("clienta_id", clienta.id)
    .order("enviado_en", { ascending: true });

  const mensajes = (mensajesData ?? []) as Mensaje[];

  // Marca como leídos los mensajes recibidos del coach
  await supabase
    .from("mensajes")
    .update({ leido: true })
    .eq("clienta_id", clienta.id)
    .eq("remitente", "coach")
    .eq("leido", false);

  const coachObj = clienta.coaches as unknown as { nombre: string } | null;
  const coachNombre = coachObj?.nombre ?? "Tu entrenadora";

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Chat con {coachNombre}</h1>
      <ChatClienta clientaId={clienta.id} mensajesIniciales={mensajes} />
    </div>
  );
}
