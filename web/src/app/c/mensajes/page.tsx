import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MarcarLeidoAlMontar } from "@/components/marcar-leido";
import { ChatClienta } from "./chat";
import { marcarMisMensajesLeidos } from "./acciones";

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

  const coachObj = clienta.coaches as unknown as { nombre: string } | null;
  const coachNombre = coachObj?.nombre ?? "Tu entrenador";

  return (
    <div>
      <MarcarLeidoAlMontar accion={marcarMisMensajesLeidos} />
      <h1 className="text-xl font-semibold mb-1">Chat con {coachNombre}</h1>
      <ChatClienta clientaId={clienta.id} mensajesIniciales={mensajes} />
    </div>
  );
}
