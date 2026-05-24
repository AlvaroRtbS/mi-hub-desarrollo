import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/logout-button";
import { BusquedaGlobal } from "@/components/busqueda-global";
import {
  Home,
  Calendar,
  Users,
  ClipboardList,
  Dumbbell,
  Apple,
  LineChart,
  MessageSquare,
  Settings,
} from "lucide-react";

const enlaces = [
  { href: "/inicio", label: "Inicio", Icon: Home },
  { href: "/calendario", label: "Calendario", Icon: Calendar },
  { href: "/clientas", label: "Clientas", Icon: Users },
  { href: "/programas", label: "Programas", Icon: ClipboardList },
  { href: "/ejercicios", label: "Ejercicios", Icon: Dumbbell },
  { href: "/nutricion", label: "Nutrición", Icon: Apple },
  { href: "/metricas", label: "Métricas", Icon: LineChart },
  { href: "/mensajes", label: "Mensajes", Icon: MessageSquare },
];

const enlaceAjustes = { href: "/ajustes", label: "Ajustes", Icon: Settings };

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
    .select("nombre, email, marca_color_primario")
    .eq("user_id", user.id)
    .maybeSingle();

  const colorMarca = (coach?.marca_color_primario as string | null) ?? "#16a34a";
  const colorHover = oscurecerHex(colorMarca, 12);

  return (
    <div
      className="min-h-screen flex"
      style={{
        ["--brand" as string]: colorMarca,
        ["--brand-hover" as string]: colorHover,
      }}
    >
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
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-neutral-300 hover:bg-neutral-900 hover:text-white"
            >
              <e.Icon size={16} className="text-neutral-500" />
              <span>{e.label}</span>
            </Link>
          ))}
        </nav>
        <div className="px-3 pb-2">
          <Link
            href={enlaceAjustes.href}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-neutral-300 hover:bg-neutral-900 hover:text-white"
          >
            <enlaceAjustes.Icon size={16} className="text-neutral-500" />
            <span>{enlaceAjustes.label}</span>
          </Link>
        </div>
        <div className="p-3 border-t border-neutral-800">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

// Devuelve el hex de entrada oscurecido un % de luminosidad (sin alpha).
// Útil para derivar el color de hover a partir del color primario del coach.
function oscurecerHex(hex: string, porcentaje: number): string {
  const m = hex.replace("#", "").match(/^([0-9a-f]{6})$/i);
  if (!m) return hex;
  const factor = Math.max(0, 1 - porcentaje / 100);
  const r = Math.round(parseInt(m[1].slice(0, 2), 16) * factor);
  const g = Math.round(parseInt(m[1].slice(2, 4), 16) * factor);
  const b = Math.round(parseInt(m[1].slice(4, 6), 16) * factor);
  return (
    "#" +
    [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")
  );
}
