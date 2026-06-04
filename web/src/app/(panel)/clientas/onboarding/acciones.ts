"use server";

import { revalidatePath } from "next/cache";
import { generarInvitacion } from "../[id]/acciones-invitacion";

export type ResultadoLote = {
  ok: boolean;
  generadas: number;
  error?: string;
};

/** Genera invitación para varias clientas (las que aún no tienen una válida). */
export async function generarInvitacionesLote(
  clientaIds: string[]
): Promise<ResultadoLote> {
  let generadas = 0;
  for (const id of clientaIds) {
    const r = await generarInvitacion(id);
    if (r.ok) generadas++;
  }
  revalidatePath("/clientas/onboarding");
  return { ok: true, generadas };
}
