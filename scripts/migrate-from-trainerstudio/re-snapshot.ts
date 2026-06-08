/**
 * Re-snapshotea las asignaciones ACTIVAS de programas de TrainerStudio
 * (con trainerstudio_id) copiando la estructura actual del template a
 * asignaciones.estructura_snapshot. Sirve para propagar los flags de circuito
 * recién importados a las clientas. Seguro: 0 sesiones tienen registros
 * keyed por elemento (verificado), así que no hay orfandad.
 *
 * Uso:  npx tsx re-snapshot.ts          (dry-run)
 *       npx tsx re-snapshot.ts --apply   (escribe)
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
config();

const APPLY = process.argv.includes("--apply");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

function contarCircuitos(est: any): number {
  let n = 0;
  for (const sem of est ?? []) for (const d of sem.dias ?? []) for (const b of d.bloques ?? []) if (b.circuito) n++;
  return n;
}

async function main() {
  const { data: progs } = await sb
    .from("programas")
    .select("id, nombre, estructura, trainerstudio_id")
    .not("trainerstudio_id", "is", null);
  const pmap = new Map((progs ?? []).map((p: any) => [p.id, p]));

  const { data: asigs } = await sb
    .from("asignaciones")
    .select("id, clienta_id, programa_id, activa, estructura_snapshot")
    .eq("activa", true)
    .in("programa_id", [...pmap.keys()]);

  // Nombres de clienta para el log
  const clIds = [...new Set((asigs ?? []).map((a: any) => a.clienta_id))];
  const { data: cls } = await sb.from("clientas").select("id, nombre, apellidos").in("id", clIds);
  const cmap = new Map((cls ?? []).map((c: any) => [c.id, `${c.nombre} ${c.apellidos ?? ""}`.trim()]));

  console.log(`Re-snapshot${APPLY ? "" : " (DRY-RUN)"} — ${asigs?.length ?? 0} asignaciones activas de programas TS\n`);

  let escritas = 0;
  for (const a of asigs ?? []) {
    const prog = pmap.get(a.programa_id);
    if (!prog) continue;
    const antes = contarCircuitos(a.estructura_snapshot);
    const despues = contarCircuitos(prog.estructura);
    const nombre = cmap.get(a.clienta_id) ?? a.clienta_id;
    console.log(`  ${nombre.padEnd(26)} ${prog.nombre.slice(0, 34).padEnd(34)} circuitos snapshot ${antes} → ${despues}`);
    if (!APPLY) continue;
    const { error } = await sb
      .from("asignaciones")
      .update({ estructura_snapshot: prog.estructura })
      .eq("id", a.id);
    if (error) console.log(`    ✗ ${error.message}`);
    else escritas++;
  }

  console.log(`\n${APPLY ? `Escritas: ${escritas}` : "(dry-run; lanza con --apply)"}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
