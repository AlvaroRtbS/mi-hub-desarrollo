import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/logout-button";
import { BusquedaGlobal } from "@/components/busqueda-global";

const enlaces = [
  { href: "/inicio", label: "Inicio" },
  { href: "/calendario", label: "Calendario" },
  { href: "/clientas", label: "Clientas" },
  { href: "/programas", label: "Programas" },
  { href: "/ejercicios", label: "Ejercicios" },
  { href: "/nutricion", label: "Nutrición" },
  { href: "/metricas", label: "Métricas" },
  { href: "/mensajes", label: "Mensajes" },
];

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: coach } = await supabase
    .from("coaches")
    .select("nombre, email")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r border-neutral-800 bg-neutral-950 flex flex-col">
        <div className="px-5 py-5 border-b border-neutral-800">
          <div className="text-lg font-semibold">mi-hub</div>
          <div className="text-xs text-neutral-500 mt-0.5 truncate">
            {coach?.nombre ?? user.email}
          </div>
        </div>
        <div className="px-3 pt-4 pb-2">
          <BusquedaGlobal />
        </div>
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {enlaces.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              className="block px-3 py-2 rounded-lg text-sm text-neutral-300 hover:bg-neutral-900 hover:text-white"
            >
              {e.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-neutral-800">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
