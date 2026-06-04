import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { inicialesNombre } from "@/lib/utilidades";
import { BotonBroadcast } from "./boton-broadcast";

type ConversacionFila = {
  clienta_id: string;
  ultimo_contenido: string;
  ultimo_enviado_en: string;
  ultimo_remitente: "coach" | "clienta";
  no_leidos: number;
  clienta: {
    id: string;
    nombre: string;
    apellidos: string | null;
    estado: string;
  };
};

function relativo(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  const dias = Math.floor(h / 24);
  if (dias < 7) return `${dias} d`;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

export default async function MensajesPage() {
  const supabase = await createSupabaseServerClient();

  const { data: clientasData } = await supabase
    .from("clientas")
    .select("id, nombre, apellidos, estado")
    .in("estado", ["activa", "invitada"])
    .order("nombre");

  const clientas = clientasData ?? [];

  if (clientas.length === 0) {
    return (
      <div className="p-8 mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold mb-1">Mensajes</h1>
        <p className="text-sm text-neutral-400 mb-6">
          Chat directo con tus clientas.
        </p>
        <div className="border border-dashed border-neutral-800 rounded-2xl p-12 text-center">
          <div className="text-neutral-400">Aún no tienes clientas.</div>
          <div className="text-sm text-neutral-500 mt-2">
            Crea una en{" "}
            <Link href="/clientas/nueva" className="text-brand-500">
              Clientas → Añadir
            </Link>
            .
          </div>
        </div>
      </div>
    );
  }

  // Último mensaje por clienta + recuento de no leídos
  const ids = clientas.map((c) => c.id);
  const { data: mensajesData } = await supabase
    .from("mensajes")
    .select("clienta_id, contenido, enviado_en, remitente, leido")
    .in("clienta_id", ids)
    .order("enviado_en", { ascending: false });

  const ultimoPorClienta = new Map<
    string,
    { contenido: string; enviado_en: string; remitente: "coach" | "clienta" }
  >();
  const noLeidosPorClienta = new Map<string, number>();
  (mensajesData ?? []).forEach((m) => {
    if (!ultimoPorClienta.has(m.clienta_id)) {
      ultimoPorClienta.set(m.clienta_id, {
        contenido: m.contenido,
        enviado_en: m.enviado_en,
        remitente: m.remitente as "coach" | "clienta",
      });
    }
    if (!m.leido && m.remitente === "clienta") {
      noLeidosPorClienta.set(
        m.clienta_id,
        (noLeidosPorClienta.get(m.clienta_id) ?? 0) + 1
      );
    }
  });

  const filas: ConversacionFila[] = clientas
    .map((c) => {
      const u = ultimoPorClienta.get(c.id);
      return {
        clienta_id: c.id,
        ultimo_contenido: u?.contenido ?? "",
        ultimo_enviado_en: u?.enviado_en ?? "",
        ultimo_remitente: (u?.remitente ?? "coach") as "coach" | "clienta",
        no_leidos: noLeidosPorClienta.get(c.id) ?? 0,
        clienta: c,
      };
    })
    .sort((a, b) => {
      // No leídos primero, luego por fecha desc
      if (a.no_leidos !== b.no_leidos) return b.no_leidos - a.no_leidos;
      return b.ultimo_enviado_en.localeCompare(a.ultimo_enviado_en);
    });

  return (
    <div className="p-8 mx-auto max-w-5xl">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Mensajes</h1>
          <p className="text-sm text-neutral-400">
            Chat con tus clientas. Selecciona una conversación.
          </p>
        </div>
        <BotonBroadcast
          clientas={clientas.map((c) => ({
            id: c.id as string,
            nombre: c.nombre as string,
            apellidos: (c.apellidos as string | null) ?? null,
          }))}
        />
      </div>

      <div className="border border-neutral-800 rounded-2xl divide-y divide-neutral-800 bg-neutral-950">
        {filas.map((f) => {
          const c = f.clienta;
          const hayMensaje = f.ultimo_enviado_en !== "";
          return (
            <Link
              key={f.clienta_id}
              href={`/mensajes/${f.clienta_id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-900/50"
            >
              <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-medium text-neutral-300 flex-shrink-0">
                {inicialesNombre(c.nombre, c.apellidos)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">
                    {c.nombre} {c.apellidos ?? ""}
                  </span>
                  {hayMensaje && (
                    <span className="text-xs text-neutral-500 flex-shrink-0">
                      {relativo(f.ultimo_enviado_en)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-xs text-neutral-500 truncate">
                    {hayMensaje ? (
                      <>
                        {f.ultimo_remitente === "coach" && (
                          <span className="text-neutral-600">Tú: </span>
                        )}
                        {f.ultimo_contenido}
                      </>
                    ) : (
                      <span className="text-neutral-700 italic">
                        Sin mensajes — pulsa para escribir
                      </span>
                    )}
                  </span>
                  {f.no_leidos > 0 && (
                    <span className="text-[10px] bg-brand-600 text-white rounded-full px-2 py-0.5 flex-shrink-0">
                      {f.no_leidos}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
