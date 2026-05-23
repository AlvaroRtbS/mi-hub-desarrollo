import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function PerfilClientaPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: clienta } = await supabase
    .from("clientas")
    .select("nombre, apellidos, email, fecha_nacimiento, telefono")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!clienta) return null;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Mi perfil</h1>
      <div className="space-y-3">
        <Campo label="Nombre" valor={`${clienta.nombre} ${clienta.apellidos ?? ""}`} />
        <Campo label="Email" valor={clienta.email} />
        <Campo label="Teléfono" valor={clienta.telefono ?? "—"} />
        <Campo label="Fecha de nacimiento" valor={clienta.fecha_nacimiento ?? "—"} />
      </div>
      <p className="text-xs text-neutral-500 mt-6">
        Próximamente: cambiar contraseña, actualizar datos.
      </p>
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="border border-neutral-800 rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="text-sm mt-0.5">{valor}</div>
    </div>
  );
}
