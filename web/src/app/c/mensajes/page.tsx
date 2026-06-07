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
    .select("id, coaches(nombre, telefono)")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!clienta) return null;

  const { data: mensajesData } = await supabase
    .from("mensajes")
    .select("id, contenido, remitente, enviado_en, leido")
    .eq("clienta_id", clienta.id)
    .order("enviado_en", { ascending: true });
  const mensajes = (mensajesData ?? []) as Mensaje[];

  const coachObj = clienta.coaches as unknown as {
    nombre: string;
    telefono: string | null;
  } | null;
  const coachNombre = coachObj?.nombre ?? "tu entrenador";
  const waNumero = (coachObj?.telefono ?? "").replace(/\D/g, "");
  const waHref = waNumero
    ? `https://wa.me/${waNumero}?text=${encodeURIComponent(`¡Hola ${coachNombre}!`)}`
    : null;

  return (
    <div>
      <MarcarLeidoAlMontar accion={marcarMisMensajesLeidos} />
      <h1 className="text-xl font-semibold mb-1">Hablar con {coachNombre}</h1>
      <p className="text-sm text-neutral-400 mb-4">
        La forma más rápida de hablar conmigo es por WhatsApp. Te respondo en
        cuanto pueda 💬
      </p>

      {waHref ? (
        <a
          href={waHref}
          target="_blank"
          rel="noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl py-3 font-medium"
        >
          💬 Escríbeme por WhatsApp
        </a>
      ) : (
        <div className="text-sm text-neutral-500 border border-neutral-800 rounded-xl px-3 py-2.5">
          Tu entrenador aún no ha configurado su WhatsApp. Escríbele cuando lo
          active.
        </div>
      )}

      {mensajes.length > 0 && (
        <>
          <div className="text-xs uppercase tracking-wide text-neutral-500 mt-6 mb-1">
            Tu conversación
          </div>
          <ChatClienta
            clientaId={clienta.id}
            mensajesIniciales={mensajes}
            soloLectura
          />
        </>
      )}
    </div>
  );
}
