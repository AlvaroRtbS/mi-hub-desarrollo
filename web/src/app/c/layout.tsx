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
import { TabBar } from "./tab-bar";
import { TourBienvenida } from "./tour-bienvenida";

const TABS = [
  { href: "/c/hoy", Icon: Home, label: "Hoy" },
  { href: "/c/programa", Icon: ClipboardList, label: "Programa" },
  { href: "/c/metricas", Icon: Ruler, label: "Medidas" },
  { href: "/c/fotos", Icon: Camera, label: "Fotos" },
  { href: "/c/mensajes", Icon: MessageCircle, label: "Chat" },
] as const;

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
    .select(
      "id, nombre, apellidos, coaches(nombre, marca_nombre, marca_color_primario, marca_logo_url)"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!clienta) {
    redirect("/login");
  }

  const coachObj = clienta.coaches as unknown as {
    nombre: string;
    marca_nombre: string | null;
    marca_color_primario: string | null;
    marca_logo_url: string | null;
  } | null;

  const colorMarca = coachObj?.marca_color_primario ?? "#16a34a";
  const colorHover = oscurecerHex(colorMarca, 12);
  const logoUrl = coachObj?.marca_logo_url ?? null;
  const tituloMarca = coachObj?.marca_nombre ?? coachObj?.nombre ?? "";

  // Cuenta mensajes del coach no leídos para mostrar badge en la tab "Chat"
  const { count: mensajesNoLeidos } = await supabase
    .from("mensajes")
    .select("id", { count: "exact", head: true })
    .eq("clienta_id", clienta.id)
    .eq("remitente", "coach")
    .eq("leido", false);

  // Lista plana de tabs para el cliente
  const tabs = TABS.map((t) => ({
    href: t.href,
    label: t.label,
    badge: t.href === "/c/mensajes" ? (mensajesNoLeidos ?? 0) : 0,
  }));

  return (
    <div
      className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col"
      style={{
        ["--brand" as string]: colorMarca,
        ["--brand-hover" as string]: colorHover,
      }}
    >

      {/* Cabecera */}
      <header className="border-b border-neutral-800 bg-neutral-950 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={tituloMarca}
              className="size-9 rounded object-cover bg-white"
            />
          ) : null}
          <div className="flex-1 min-w-0">
            <div
              className="text-xs uppercase tracking-wide truncate"
              style={{ color: colorMarca }}
            >
              {tituloMarca}
            </div>
            <div className="text-sm font-medium truncate">{clienta.nombre}</div>
          </div>
          <Link
            href="/c/perfil"
            className="size-9 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-sm shrink-0"
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
      <TabBar tabs={tabs} colorMarca={colorMarca} />

      {/* Tour de bienvenida (solo primera visita) */}
      <TourBienvenida />
    </div>
  );
}

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
