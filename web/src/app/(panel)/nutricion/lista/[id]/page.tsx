import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatearFecha } from "@/lib/utilidades";
import { Boton } from "@/components/ui/boton";
import { CheckListaInteractiva } from "./check-lista";
import { BotonEliminarLista } from "./boton-eliminar";

export default async function ListaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: lista } = await supabase
    .from("listas_compra")
    .select(
      "id, nombre, items, creada_en, clientas(id, nombre, apellidos)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!lista) notFound();

  const clientaObj = lista.clientas as unknown as
    | { id: string; nombre: string; apellidos: string | null }
    | null;

  return (
    <div className="p-8 mx-auto max-w-2xl">
      <Link
        href="/nutricion"
        className="text-sm text-neutral-400 hover:text-neutral-200"
      >
        ← Volver
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{lista.nombre}</h1>
          <div className="text-xs text-neutral-500 mt-1">
            {clientaObj && (
              <Link
                href={`/clientas/${clientaObj.id}`}
                className="hover:text-brand-500"
              >
                {clientaObj.nombre} {clientaObj.apellidos ?? ""}
              </Link>
            )}{" "}
            · {formatearFecha(lista.creada_en)}
          </div>
        </div>
        <BotonEliminarLista id={lista.id} />
      </div>

      <div className="mt-6 border border-neutral-800 rounded-2xl p-5">
        <CheckListaInteractiva
          listaId={lista.id}
          items={lista.items as Array<{ id: string; nombre: string; comprado: boolean }>}
        />
      </div>

      <p className="text-xs text-neutral-500 mt-4">
        Cuando la clienta tenga app móvil, podrá marcar productos desde ahí y se
        sincronizará aquí.
      </p>
    </div>
  );
}
