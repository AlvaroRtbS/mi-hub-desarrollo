import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config();

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const APPLY = process.argv.includes("--apply");

// Mapeo: tipo libre de la migración TS → tipo canónico que pintan las gráficas
// (web/src/app/(panel)/clientas/[id]/graficas.tsx CONFIG).
const MAPEO: Array<{ de: string; a: string; unidad: string }> = [
  { de: "medida_cintura", a: "perimetro_cintura", unidad: "cm" },
  { de: "medida_brazo", a: "perimetro_brazo", unidad: "cm" },
  // pasos_medios_semanales NO se mapea: no es métrica corporal y las gráficas
  // no cubren pasos. Se deja como está (decisión documentada).
];

async function distribucion(label: string) {
  const { data } = await sb.from("metricas").select("tipo, unidad");
  const m: Record<string, number> = {};
  for (const r of data ?? []) m[`${r.tipo} (${r.unidad})`] = (m[`${r.tipo} (${r.unidad})`] ?? 0) + 1;
  console.log(`\n=== ${label} ===`);
  for (const [k, v] of Object.entries(m).sort()) console.log(`  ${k.padEnd(36)} ${v}`);
}

async function main() {
  await distribucion("ANTES");

  for (const { de, a, unidad } of MAPEO) {
    if (!APPLY) {
      const { count } = await sb.from("metricas").select("*", { count: "exact", head: true }).eq("tipo", de);
      console.log(`\nDRY: ${de} → ${a} (unidad=${unidad})  filas=${count}`);
      continue;
    }
    const { error, count } = await sb
      .from("metricas")
      .update({ tipo: a, unidad }, { count: "exact" })
      .eq("tipo", de);
    console.log(error ? `ERR ${de}: ${error.message}` : `OK  ${de} → ${a}  (${count} filas)`);
  }

  // Unidad de peso: TS exporta "Kg", el canónico es "kg".
  if (!APPLY) {
    const { count } = await sb.from("metricas").select("*", { count: "exact", head: true }).eq("tipo", "peso").eq("unidad", "Kg");
    console.log(`\nDRY: peso unidad "Kg" → "kg"  filas=${count}`);
  } else {
    const { error, count } = await sb.from("metricas").update({ unidad: "kg" }, { count: "exact" }).eq("tipo", "peso").eq("unidad", "Kg");
    console.log(error ? `ERR peso unidad: ${error.message}` : `OK  peso "Kg" → "kg"  (${count} filas)`);
  }

  if (APPLY) await distribucion("DESPUÉS");
  else console.log("\n(dry-run; lanza con --apply para escribir)");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
