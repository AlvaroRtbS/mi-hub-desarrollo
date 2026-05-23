import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/logout-button";

const TABS = [
  { href: "/c/hoy", icono: "🏠", label: "Hoy" },
  { href: "/c/programa", icono: "📋", label: "Programa" },
  { href: "/c/metricas", icono: "📊", label: "Métricas" },
  { href: "/c/mensajes", icono: "💬", label: "Mensajes" },
  { href: "/c/perfil", icono: "👤", label: "Perfil" },
];

export default async function ClientaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: clienta } = await supabase
    .from("clientas")
    .select("id, nombre, apellidos, coaches(nombre, marca_nombre)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!clienta) {
    // Logueado pero NO es clienta (ni coach, lo habría capturado el middleware)
    redirect("/login");
  }

  const coachObj = clienta.coaches as unknown as {
    nombre: string;
    marca_nombre: string | null;
  } | null;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Cabecera */}
      <header className="border-b border-neutral-800 bg-neutral-950 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-xs text-neutral-500 uppercase tracking-wide">
              {coachObj?.marca_nombre ?? coachObj?.nombre ?? ""}
            </div>
            <div className="text-sm font-medium">{clienta.nombre}</div>
          </div>
          <LogoutButton />
        </div>
      </header>

      {/* Contenido */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 pb-24 pt-4">
        {children}
      </main>

      {/* Tab bar móvil pegada abajo */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-neutral-800 bg-neutral-950 z-10">
        <div className="max-w-md mx-auto grid grid-cols-5">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="flex flex-col items-center py-2 text-[10px] text-neutral-400 hover:text-white"
            >
              <span className="text-xl">{t.icono}</span>
              <span>{t.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
