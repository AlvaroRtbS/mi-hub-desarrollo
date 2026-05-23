"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };

export async function actualizarMisDatos(
  formData: FormData
): Promise<ResultadoAccion> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticada." };

  const telefono = String(formData.get("telefono") ?? "").trim() || null;
  const fechaNacimiento =
    String(formData.get("fecha_nacimiento") ?? "").trim() || null;

  const { error } = await supabase
    .from("clientas")
    .update({
      telefono,
      fecha_nacimiento: fechaNacimiento,
    })
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/c/perfil");
  return { ok: true };
}
