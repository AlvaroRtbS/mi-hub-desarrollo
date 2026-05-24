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

  const { data: coach } = await supabase
    .from("coaches")
    .select("nombre, email, marca_color_primario")
    .eq("user_id", user.id)
    .maybeSingle();

  const colorMarca =
    (coach?.marca_color_primario as string | null) ?? "#16a34a";
  const colorHover = oscurecerHex(colorMarca, 12);
  const coachLabel = (coach?.nombre as string | null) ?? user.email ?? "";

  return (
    <div
      className="min-h-screen flex"
      style={{
        ["--brand" as string]: colorMarca,
        ["--brand-hover" as string]: colorHover,
      }}
    >
      <Sidebar coachLabel={coachLabel} />
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
