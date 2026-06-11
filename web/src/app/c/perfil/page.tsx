import Link from "next/link";
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

      <Link
        href="/c/ayuda"
        className="mt-6 flex items-center gap-3 border border-neutral-800 rounded-2xl p-4 hover:bg-neutral-900/50 transition"
      >
        <span className="text-2xl">📖</span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-medium">Guía de la app</span>
          <span className="block text-xs text-neutral-500">
            Cómo usar cada pantalla, paso a paso.
          </span>
        </span>
        <span className="text-neutral-600">→</span>
      </Link>
    </div>
  );
}
