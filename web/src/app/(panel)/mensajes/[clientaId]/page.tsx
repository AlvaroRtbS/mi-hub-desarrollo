import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { inicialesNombre } from "@/lib/utilidades";
import { marcarConversacionLeida } from "../acciones";
import { Conversacion } from "./conversacion";

type Mensaje = {
  id: string;
  contenido: string;
  remitente: "coach" | "clienta";
  enviado_en: string;
  leido: boolean;
};

export default async function ConversacionPage({
  params,
}: {
  params: Promise<{ clientaId: string }>;
}) {
  const { clientaId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: clienta } = await supabase
    .from("clientas")
    .select("id, nombre, apellidos, email, estado")
    .eq("id", clientaId)
    .maybeSingle();

  if (!clienta) notFound();

  const { data: mensajesData } = await supabase
    .from("mensajes")
    .select("id, contenido, remitente, enviado_en, leido")
    .eq("clienta_id", clientaId)
    .order("enviado_en", { ascending: true });

  const mensajes = (mensajesData ?? []) as Mensaje[];

  // Marca como leídos los entrantes
  await marcarConversacionLeida(clientaId);

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <Link
        href="/mensajes"
        className="text-sm text-neutral-400 hover:text-neutral-200"
      >
        ← Volver a mensajes
      </Link>

      <div className="mt-4 flex items-center gap-3 pb-4 border-b border-neutral-800">
        <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center text-sm font-medium text-neutral-300">
          {inicialesNombre(clienta.nombre, clienta.apellidos)}
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/clientas/${clienta.id}`}
            className="text-base font-medium hover:text-brand-500"
          >
            {clienta.nombre} {clienta.apellidos ?? ""}
          </Link>
          <div className="text-xs text-neutral-500">{clienta.email}</div>
        </div>
      </div>

      <Conversacion clientaId={clienta.id} mensajesIniciales={mensajes} />
    </div>
  );
}
