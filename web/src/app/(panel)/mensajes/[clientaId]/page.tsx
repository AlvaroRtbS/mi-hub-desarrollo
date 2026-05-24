import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { inicialesNombre } from "@/lib/utilidades";
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

  // Datos para rellenar variables de plantillas (peso actual, adherencia, racha…)
  const datosPlantilla = await calcularDatosPlantilla(supabase, clientaId);

  // Marca como leídos los entrantes (inline, sin revalidatePath durante render).
  // El badge de la lista se actualizará en la próxima navegación a /mensajes.
  await supabase
    .from("mensajes")
    .update({ leido: true })
    .eq("clienta_id", clientaId)
    .eq("remitente", "clienta")
    .eq("leido", false);

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

      <Conversacion
        clientaId={clienta.id}
        clientaNombre={clienta.nombre}
        mensajesIniciales={mensajes}
        datosPlantilla={datosPlantilla}
      />
    </div>
  );
}

type Sb = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function calcularDatosPlantilla(
  supabase: Sb,
  clientaId: string
): Promise<{
  ultimoPesoKg: number | null;
  pesoInicialKg: number | null;
  racha: number;
  adherencia30d: number | null;
  diasSinEntrenar: number | null;
}> {
  const hoy = new Date();
  const hace30 = new Date(hoy);
  hace30.setDate(hace30.getDate() - 30);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const [pesoRes, sesionesRes] = await Promise.all([
    supabase
      .from("metricas")
      .select("valor, fecha")
      .eq("clienta_id", clientaId)
      .eq("tipo", "peso")
      .order("fecha", { ascending: true }),
    supabase
      .from("sesiones")
      .select("fecha, completada")
      .eq("clienta_id", clientaId)
      .order("fecha", { ascending: false }),
  ]);

  const pesos = (pesoRes.data ?? []) as Array<{ valor: number; fecha: string }>;
  const pesoInicialKg = pesos.length > 0 ? pesos[0]!.valor : null;
  const ultimoPesoKg = pesos.length > 0 ? pesos[pesos.length - 1]!.valor : null;

  const sesiones = (sesionesRes.data ?? []) as Array<{
    fecha: string;
    completada: boolean;
  }>;

  const sesiones30d = sesiones.filter((s) => s.fecha >= iso(hace30));
  const completadas30d = sesiones30d.filter((s) => s.completada).length;
  const adherencia30d =
    sesiones30d.length > 0
      ? Math.round((completadas30d / sesiones30d.length) * 100)
      : null;

  let racha = 0;
  for (const s of sesiones) {
    if (s.completada) racha++;
    else break;
  }

  let diasSinEntrenar: number | null = null;
  const ultimaCompletada = sesiones.find((s) => s.completada);
  if (ultimaCompletada) {
    const d = new Date(ultimaCompletada.fecha + "T00:00:00Z");
    diasSinEntrenar = Math.floor(
      (Date.now() - d.getTime()) / 86400000
    );
  }

  return {
    ultimoPesoKg,
    pesoInicialKg,
    racha,
    adherencia30d,
    diasSinEntrenar,
  };
}
