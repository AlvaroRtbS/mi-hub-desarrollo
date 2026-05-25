import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BotonVistaClienta } from "@/components/boton-vista-clienta";

/**
 * Layout para /clientas/[id]/* — añade el botón flotante "Vista clienta"
 * persistente en todas las páginas relacionadas con UNA clienta (ficha,
 * plan personalizado, fotos, ejercicios, etc.).
 *
 * El botón se auto-oculta cuando ya estás en /vista-clienta (usa
 * usePathname en cliente).
 */
export default async function ClientaIdLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: clienta } = await supabase
    .from("clientas")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle<{ id: string; user_id: string | null }>();

  return (
    <>
      {children}
      {clienta && (
        <BotonVistaClienta
          clientaId={clienta.id}
          yaEnlazada={!!clienta.user_id}
        />
      )}
    </>
  );
}
