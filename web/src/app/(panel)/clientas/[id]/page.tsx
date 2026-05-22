import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Boton } from "@/components/ui/boton";
import { EtiquetaEstado } from "@/components/ui/etiqueta-estado";
import { formatearFecha, inicialesNombre } from "@/lib/utilidades";
import type { Clienta } from "@/lib/supabase/tipos";
import { AccionesEstado } from "./acciones-estado";

export default async function ClientaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: clienta } = await supabase
    .from("clientas")
    .select("*")
    .eq("id", id)
    .maybeSingle<Clienta>();

  if (!clienta) notFound();

  return (
    <div className="p-8 max-w-5xl">
      <Link href="/clientas" className="text-sm text-neutral-400 hover:text-neutral-200">
        ← Volver
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center text-xl font-semibold text-neutral-300">
            {inicialesNombre(clienta.nombre, clienta.apellidos)}
          </div>
          <div>
            <h1 className="text-2xl font-semibold">
              {clienta.nombre} {clienta.apellidos ?? ""}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <EtiquetaEstado estado={clienta.estado} />
              <span className="text-sm text-neutral-500">{clienta.email}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Boton variante="secundario" href={`/clientas/${clienta.id}/editar`}>
            Editar
          </Boton>
          <AccionesEstado clientaId={clienta.id} estado={clienta.estado} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-8">
        <Tarjeta titulo="Teléfono" valor={clienta.telefono ?? "—"} />
        <Tarjeta titulo="Fecha nacimiento" valor={formatearFecha(clienta.fecha_nacimiento)} />
        <Tarjeta titulo="Alta" valor={formatearFecha(clienta.creada_en)} />
      </div>

      {clienta.notas_publicas && (
        <div className="mt-6 border border-neutral-800 rounded-2xl p-5">
          <div className="text-xs uppercase tracking-wide text-neutral-500 mb-2">
            Notas visibles para la clienta
          </div>
          <div className="text-sm whitespace-pre-wrap">{clienta.notas_publicas}</div>
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4">
        <SeccionFutura titulo="Programa asignado" />
        <SeccionFutura titulo="Últimas métricas" />
        <SeccionFutura titulo="Últimas sesiones" />
        <SeccionFutura titulo="Fotos de progreso" />
      </div>
    </div>
  );
}

function Tarjeta({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="border border-neutral-800 rounded-2xl p-4">
      <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1">
        {titulo}
      </div>
      <div className="text-sm">{valor}</div>
    </div>
  );
}

function SeccionFutura({ titulo }: { titulo: string }) {
  return (
    <div className="border border-dashed border-neutral-800 rounded-2xl p-5 text-sm text-neutral-500">
      <div className="font-medium text-neutral-400 mb-1">{titulo}</div>
      <div>Disponible en los próximos sprints.</div>
    </div>
  );
}
