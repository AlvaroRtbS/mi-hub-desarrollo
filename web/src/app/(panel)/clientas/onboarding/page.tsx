import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PanelOnboarding } from "./panel-onboarding";

export default async function OnboardingClientasPage() {
  const supabase = await createSupabaseServerClient();

  const { data: clientasData } = await supabase
    .from("clientas")
    .select("id, nombre, apellidos, user_id")
    .neq("estado", "archivada")
    .order("nombre")
    .returns<
      { id: string; nombre: string; apellidos: string | null; user_id: string | null }[]
    >();
  const clientas = clientasData ?? [];

  // Invitaciones válidas (no usadas, no caducadas) por clienta.
  const { data: invs } = await supabase
    .from("invitaciones_clienta")
    .select("clienta_id, token")
    .is("usada_en", null)
    .gt("expira_en", new Date().toISOString())
    .returns<{ clienta_id: string; token: string }[]>();
  const tokenPorClienta = new Map((invs ?? []).map((i) => [i.clienta_id, i.token]));

  const filas = clientas.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    apellidos: c.apellidos,
    activada: !!c.user_id,
    token: tokenPorClienta.get(c.id) ?? null,
  }));

  return (
    <div className="p-8 mx-auto max-w-3xl">
      <Link
        href="/clientas"
        className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-200 mb-3"
      >
        <ChevronLeft className="size-4" /> Clientas
      </Link>
      <h1 className="text-2xl font-semibold mb-1">Activación de clientas</h1>
      <p className="text-sm text-neutral-400 mb-6">
        Genera y comparte el enlace para que cada clienta cree su cuenta y entre a su portal.
      </p>

      <PanelOnboarding filas={filas} />
    </div>
  );
}
