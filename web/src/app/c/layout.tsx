import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  Home,
  ClipboardList,
  Apple,
  Ruler,
  Camera,
  MessageCircle,
} from "lucide-react";
import { TabBar } from "./tab-bar";
import { TourBienvenida } from "./tour-bienvenida";
import { InstallPrompt } from "@/components/pwa/install-prompt";

const TABS = [
  { href: "/c/hoy", Icon: Home, label: "Hoy" },
  { href: "/c/programa", Icon: ClipboardList, label: "Programa" },
  { href: "/c/nutricion", Icon: Apple, label: "Dieta" },
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
    // Usuario autenticado pero su cuenta aún no está enlazada a una ficha de
    // clienta (p. ej. el canje de invitación no llegó a completarse). NO
    // redirigimos a /login para evitar un bucle con el middleware: mostramos
    // un mensaje claro.
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <div className="text-5xl mb-4">⏳</div>
          <h1 className="text-xl font-semibold mb-2">Cuenta aún no activada</h1>
          <p className="text-sm text-neutral-400">
            Tu cuenta existe pero todavía no está vinculada a tu perfil. Pide a
            tu entrenador que te reenvíe el enlace de invitación y ábrelo de
            nuevo para terminar de activarla.
          </p>
        </div>
      </div>
    );
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
      className="min-h-[100dvh] text-neutral-100 flex justify-center md:items-center md:p-6"
      style={{
        ["--brand" as string]: colorMarca,
        ["--brand-hover" as string]: colorHover,
        backgroundColor: "#0a0a0a",
        backgroundImage:
          "radial-gradient(100% 100% at 50% 0%, color-mix(in srgb, var(--brand) 10%, transparent) 0%, transparent 60%)",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Marco tipo móvil: pantalla completa en móvil, tarjeta centrada en desktop */}
      <div
        className="relative flex flex-col w-full h-[100dvh] bg-neutral-950 overflow-hidden md:w-[480px] md:h-[calc(100vh-3rem)] md:max-h-[920px] md:rounded-[2.25rem] md:border md:border-neutral-800/80 md:shadow-2xl"
        style={{
          backgroundImage:
            "radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, var(--brand) 22%, transparent) 0%, transparent 50%)",
        }}
      >
        {/* Cabecera */}
        <header className="shrink-0 border-b border-neutral-800/80 bg-neutral-950/60 backdrop-blur-md z-10">
          <div className="px-4 py-3 flex items-center gap-3">
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

        {/* Contenido (scrollea dentro del marco) */}
        <main className="flex-1 overflow-y-auto px-4 pt-4 pb-4">{children}</main>

        {/* Tab bar pegada al fondo del marco */}
        <TabBar tabs={tabs} colorMarca={colorMarca} />

        {/* Tour de bienvenida (solo primera visita) */}
        <TourBienvenida />

        {/* Banner para instalar la PWA (oculto si ya está instalada) */}
        <InstallPrompt />
      </div>
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
