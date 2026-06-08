/**
 * Genera (o reutiliza) invitaciones para las clientas reales y produce los
 * links + mensaje de WhatsApp listos para que Álvaro los envíe MANUALMENTE.
 * NO envía nada. Reutiliza una invitación válida si ya existe (como el panel).
 *
 * Uso:  npx tsx generar-invitaciones.ts          (dry-run)
 *       npx tsx generar-invitaciones.ts --apply   (crea tokens en prod)
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
config();

const APPLY = process.argv.includes("--apply");
const BASE = "https://mi-hub-desarrollo.vercel.app";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

// Las 6 clientas reales activas (por email, para no tocar tests/demo/archivadas).
const EMAILS = [
  "agravalo@gmail.com",
  "inesbotiapaco@gmail.com",
  "irenesolig@gmail.com",
  "montse.gonzalez@me.com",
  "juddjordaa97@gmail.com",
  "nerea.fdez.rguez@gmail.com",
];

function mensajeWhatsApp(nombre: string, url: string): string {
  const n = nombre.split(" ")[0] ?? nombre;
  return `Hola ${n}! Te invito a la app donde llevaremos tu entreno. Crea tu cuenta aquí (es rápido):\n${url}`;
}

async function main() {
  const { data: coach } = await sb.from("coaches").select("id").limit(1).single();
  const coachId = coach!.id as string;

  const { data: cls } = await sb
    .from("clientas")
    .select("id, nombre, apellidos, email, user_id")
    .in("email", EMAILS);

  console.log(`Generar invitaciones${APPLY ? "" : " (DRY-RUN)"} — ${cls?.length ?? 0} clientas\n`);

  for (const c of cls ?? []) {
    const nombre = `${c.nombre} ${c.apellidos ?? ""}`.trim();
    if (c.user_id) { console.log(`— ${nombre}: ya tiene cuenta, se omite.`); continue; }

    // ¿Invitación válida existente?
    const { data: existente } = await sb
      .from("invitaciones_clienta")
      .select("token")
      .eq("clienta_id", c.id)
      .is("usada_en", null)
      .gt("expira_en", new Date().toISOString())
      .maybeSingle();

    let token = existente?.token as string | undefined;

    if (!token) {
      if (!APPLY) {
        console.log(`— ${nombre}: (dry-run) se crearía invitación nueva.`);
        continue;
      }
      const { data, error } = await sb
        .from("invitaciones_clienta")
        .insert({ clienta_id: c.id, coach_id: coachId })
        .select("token")
        .single();
      if (error) { console.log(`✗ ${nombre}: ${error.message}`); continue; }
      token = data.token;
    }

    const url = `${BASE}/i/${token}`;
    console.log(`\n=== ${nombre} ===`);
    console.log(`LINK: ${url}`);
    console.log(`WHATSAPP:\n${mensajeWhatsApp(c.nombre, url)}`);
  }

  if (!APPLY) console.log("\n(dry-run; lanza con --apply para crear los tokens reales)");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
