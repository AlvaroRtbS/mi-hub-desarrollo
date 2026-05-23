import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  Home,
  ClipboardList,
  Ruler,
  Camera,
  MessageCircle,
} from "lucide-react";

const TABS = [
  { href: "/c/hoy", Icon: Home, label: "Hoy" },
  { href: "/c/programa", Icon: ClipboardList, label: "Programa" },
  { href: "/c/metricas", Icon: Ruler, label: "Medidas" },
  { href: "/c/fotos", Icon: Camera, label: "Fotos" },
  { href: "/c/mensajes", Icon: MessageCircle, label: "Chat" },
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
          <Link
            href="/c/perfil"
            className="w-9 h-9 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-sm"
            aria-label="Perfil"
          >
            👤
          </Link>
        </div>
      </header>

      {/* Contenido */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 pb-24 pt-4">
        {children}
      </main>

      {/* Tab bar móvil pegada abajo */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-neutral-800 bg-neutral-950 z-10 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto grid grid-cols-5">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="flex flex-col items-center py-2 text-[10px] text-neutral-400 hover:text-white transition"
            >
              <t.Icon size={20} strokeWidth={1.75} />
              <span className="mt-0.5">{t.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
