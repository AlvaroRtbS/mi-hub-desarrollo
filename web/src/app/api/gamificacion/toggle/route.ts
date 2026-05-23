import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "No autenticada." }, { status: 401 });
  }

  const body = (await request.json()) as { clientaId?: string; activo?: boolean };
  if (!body.clientaId) {
    return NextResponse.json({ ok: false, error: "Falta clientaId." }, { status: 400 });
  }

  const { error } = await supabase
    .from("clientas")
    .update({ gamificacion_activa: !!body.activo })
    .eq("id", body.clientaId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
