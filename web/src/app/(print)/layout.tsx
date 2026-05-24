import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Layout minimalista para vistas de impresión:
// - Sin sidebar del panel
// - Fondo blanco
// - Solo el contenido
// Sigue requiriendo sesión de coach.
export default async function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <div className="bg-white text-neutral-900 min-h-screen">{children}</div>;
}
