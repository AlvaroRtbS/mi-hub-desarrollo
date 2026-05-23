import { notFound } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AceptarInvitacion } from "./aceptar";

export const dynamic = "force-dynamic";

type InvitacionInfo = {
  clienta_id: string;
  clienta_nombre: string;
  clienta_apellidos: string | null;
  clienta_email: string;
  coach_nombre: string;
  coach_marca_nombre: string | null;
  valida: boolean;
  motivo: string | null;
};

export default async function InvitacionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Llamada sin auth: la función SQL es security definer
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("invitacion_info", { t: token });

  if (error || !data || data.length === 0) {
    notFound();
  }

  const info = data[0] as InvitacionInfo;

  if (!info.valida) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-4">😕</div>
          <h1 className="text-xl font-semibold mb-2">Invitación no válida</h1>
          <p className="text-sm text-neutral-400">
            {info.motivo === "expirada"
              ? "Este link de invitación ha caducado. Pide a tu entrenadora que te envíe uno nuevo."
              : info.motivo === "ya_usada"
              ? "Este link ya se ha usado. Si ya creaste tu cuenta, entra desde la pantalla de login."
              : "El link no es válido o ha caducado."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">
            {info.coach_marca_nombre ?? info.coach_nombre}
          </div>
          <h1 className="text-2xl font-semibold">¡Hola, {info.clienta_nombre}!</h1>
          <p className="text-sm text-neutral-400 mt-2">
            <strong>{info.coach_nombre}</strong> te ha invitado a su app de
            entrenamiento. Crea tu contraseña para empezar.
          </p>
        </div>

        <AceptarInvitacion
          token={token}
          email={info.clienta_email}
          nombre={info.clienta_nombre}
        />
      </div>
    </div>
  );
}
