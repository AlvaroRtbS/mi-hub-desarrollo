import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Keep-alive del proyecto de Supabase (plan Free): el cron de Vercel llama
// aquí a diario y la consulta cuenta como actividad, evitando la pausa por
// los 7 días de inactividad. No expone datos: RLS aplica (cliente anónimo).
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { error } = await supabase
    .from("coaches")
    .select("id", { count: "exact", head: true });

  return NextResponse.json({
    ok: !error,
    ts: new Date().toISOString(),
  });
}
