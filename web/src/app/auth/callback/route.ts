// Callback de autenticación: intercambia el `code` (PKCE) por una sesión.
// Lo usan el enlace mágico (signInWithOtp) y la recuperación de contraseña
// (resetPasswordForEmail). Luego redirige a `next` (relativo) o a "/" para que
// el middleware enrute por rol.

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next");
  // Solo rutas relativas (evita open-redirect).
  const next = nextParam && nextParam.startsWith("/") ? nextParam : "/";

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
