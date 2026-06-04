import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FormularioPerfilClienta } from "./formulario";
import { NotificacionesToggle } from "./notificaciones-toggle";

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
      <FormularioPerfilClienta
        nombre={clienta.nombre}
        apellidos={clienta.apellidos}
        email={clienta.email}
        telefono={clienta.telefono}
        fechaNacimiento={clienta.fecha_nacimiento}
      />

      <div className="mt-6">
        <NotificacionesToggle />
      </div>
    </div>
  );
}
