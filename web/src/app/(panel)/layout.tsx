import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Sidebar } from "./sidebar";
import { AtajosGlobales } from "@/components/atajos-globales";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: coach, error: errorCoach } = await supabase
    .from("coaches")
    .select("nombre, email, marca_color_primario")
    .eq("user_id", user.id)
    .maybeSingle();

  // Gate del panel: solo el coach entra aquí. Si la cuenta no es coach (p. ej.
  // una clienta logueada), fuera al portal. Solo redirigimos cuando estamos
  // SEGUROS de que no hay coach (sin error de consulta), para no expulsar a un
  // coach legítimo por un fallo transitorio de red/BD.
  if (!errorCoach && !coach) redirect("/c/hoy");

  const colorMarca =
    (coach?.marca_color_primario as string | null) ?? "#16a34a";
  const colorHover = oscurecerHex(colorMarca, 12);
  const coachLabel = (coach?.nombre as string | null) ?? user.email ?? "";

  // Contar mensajes entrantes no leídos para el badge del sidebar
  const { count: mensajesNoLeidos } = await supabase
    .from("mensajes")
    .select("id", { count: "exact", head: true })
    .eq("leido", false)
    .eq("remitente", "clienta");

  return (
    <div
      className="min-h-screen flex"
      style={{
        ["--brand" as string]: colorMarca,
        ["--brand-hover" as string]: colorHover,
      }}
    >
      <Sidebar coachLabel={coachLabel} badgeMensajes={mensajesNoLeidos ?? 0} />
      <main className="flex-1 overflow-auto min-w-0">{children}</main>
      <AtajosGlobales />
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
    "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")
  );
}
