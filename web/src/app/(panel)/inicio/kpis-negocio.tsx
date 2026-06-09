import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hoyISO } from "@/lib/utilidades";

const eur = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

/**
 * KPIs comerciales en la home, leídos de pagos/inscripciones (CRM Fase 3).
 * Si las tablas aún no existen (migración sin aplicar), degrada a ceros.
 */
export async function KpisNegocio() {
  const supabase = await createSupabaseServerClient();

  const hoy = hoyISO();
  const primerDiaMes = hoy.slice(0, 8) + "01";
  const en30 = (() => {
    const d = new Date(hoy + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + 30);
    return d.toISOString().slice(0, 10);
  })();

  const [{ data: mes }, { data: pend }, { count: renovaciones }] =
    await Promise.all([
      supabase
        .from("pagos")
        .select("importe")
        .eq("estado", "pagado")
        .gte("pagado_en", primerDiaMes)
        .returns<{ importe: number }[]>(),
      supabase
        .from("pagos")
        .select("importe")
        .eq("estado", "pendiente")
        .returns<{ importe: number }[]>(),
      supabase
        .from("inscripciones")
        .select("id", { count: "exact", head: true })
        .eq("estado", "activa")
        .not("renovacion_fecha", "is", null)
        .gte("renovacion_fecha", hoy)
        .lte("renovacion_fecha", en30),
    ]);

  const ingresosMes = (mes ?? []).reduce((a, p) => a + Number(p.importe), 0);
  const pendiente = (pend ?? []).reduce((a, p) => a + Number(p.importe), 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
      <KpiNegocio label="Ingresos del mes" valor={eur.format(ingresosMes)} clase="text-green-400" />
      <KpiNegocio label="Pendiente de cobro" valor={eur.format(pendiente)} clase={pendiente > 0 ? "text-amber-400" : undefined} />
      <KpiNegocio label="Renovaciones ≤30 d" valor={String(renovaciones ?? 0)} />
    </div>
  );
}

function KpiNegocio({
  label,
  valor,
  clase,
}: {
  label: string;
  valor: string;
  clase?: string;
}) {
  return (
    <Link
      href="/pagos"
      className="block border border-neutral-800 rounded-2xl p-4 hover:bg-neutral-900/50 transition"
    >
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div className={"text-2xl font-semibold mt-1 " + (clase ?? "")}>{valor}</div>
    </Link>
  );
}
