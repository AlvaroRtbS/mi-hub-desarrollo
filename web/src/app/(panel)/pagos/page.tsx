import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hoyISO } from "@/lib/utilidades";

const eur = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const fmtEur = (n: number) => eur.format(n);
function fmtFecha(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso.slice(0, 10) + "T00:00:00Z").toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type ClientaMin = { nombre: string; apellidos: string | null } | null;
type InscRow = {
  id: string;
  clienta_id: string;
  concepto: string;
  importe_total: number | null;
  tipo_pago: string;
  renovacion_fecha: string | null;
  clientas: ClientaMin;
};
type PagoRow = {
  id: string;
  clienta_id: string;
  importe: number;
  fecha_vencimiento: string | null;
  numero_cuota: number | null;
  concepto: string | null;
  clientas: ClientaMin;
};

function nombreDe(c: ClientaMin): string {
  if (!c) return "Clienta";
  return `${c.nombre}${c.apellidos ? " " + c.apellidos : ""}`;
}

export default async function PagosPage() {
  const supabase = await createSupabaseServerClient();

  const hoy = hoyISO();
  const primerDiaMes = hoy.slice(0, 8) + "01";
  const en45 = (() => {
    const d = new Date(hoy + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + 45);
    return d.toISOString().slice(0, 10);
  })();

  const [{ data: inscData }, { data: pendData }, { data: mesData }] =
    await Promise.all([
      supabase
        .from("inscripciones")
        .select(
          "id, clienta_id, concepto, importe_total, tipo_pago, renovacion_fecha, clientas(nombre, apellidos)"
        )
        .eq("estado", "activa")
        .not("renovacion_fecha", "is", null)
        .lte("renovacion_fecha", en45)
        .order("renovacion_fecha", { ascending: true })
        .returns<InscRow[]>(),
      supabase
        .from("pagos")
        .select(
          "id, clienta_id, importe, fecha_vencimiento, numero_cuota, concepto, clientas(nombre, apellidos)"
        )
        .eq("estado", "pendiente")
        .order("fecha_vencimiento", { ascending: true, nullsFirst: false })
        .returns<PagoRow[]>(),
      supabase
        .from("pagos")
        .select("importe")
        .eq("estado", "pagado")
        .gte("pagado_en", primerDiaMes)
        .returns<{ importe: number }[]>(),
    ]);

  const renovaciones = inscData ?? [];
  const pendientes = pendData ?? [];
  const ingresosMes = (mesData ?? []).reduce((a, p) => a + Number(p.importe), 0);
  const totalPendiente = pendientes.reduce((a, p) => a + Number(p.importe), 0);
  const vencidos = pendientes.filter(
    (p) => p.fecha_vencimiento && p.fecha_vencimiento < hoy
  );

  const KPIS = [
    { label: "Ingresos este mes", valor: fmtEur(ingresosMes), clase: "text-green-400" },
    { label: "Pendiente de cobro", valor: fmtEur(totalPendiente), clase: "text-amber-400" },
    { label: "Pagos vencidos", valor: String(vencidos.length), clase: vencidos.length ? "text-red-400" : "text-neutral-200" },
    { label: "Renovaciones ≤45 d", valor: String(renovaciones.length), clase: "text-neutral-200" },
  ];

  return (
    <div className="p-8 mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Pagos</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Cobros, renovaciones próximas y clientas con pagos pendientes.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {KPIS.map((k) => (
          <div key={k.label} className="border border-neutral-800 rounded-2xl p-4">
            <div className="text-xs text-neutral-500">{k.label}</div>
            <div className={"text-2xl font-semibold mt-1 " + k.clase}>{k.valor}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Próximas renovaciones */}
        <section className="border border-neutral-800 rounded-2xl p-5">
          <h2 className="font-semibold mb-3">Próximas renovaciones</h2>
          {renovaciones.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Ninguna inscripción activa renueva en los próximos 45 días.
            </p>
          ) : (
            <div className="divide-y divide-neutral-800">
              {renovaciones.map((i) => {
                const vencida = i.renovacion_fecha! < hoy;
                return (
                  <Link
                    key={i.id}
                    href={`/clientas/${i.clienta_id}`}
                    className="flex items-center justify-between gap-3 py-2.5 hover:text-brand-500"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{nombreDe(i.clientas)}</div>
                      <div className="text-xs text-neutral-500 truncate">
                        {i.concepto} · {i.importe_total != null ? fmtEur(Number(i.importe_total)) : "—"}
                      </div>
                    </div>
                    <span className={"text-sm shrink-0 " + (vencida ? "text-red-400 font-medium" : "text-neutral-400")}>
                      {fmtFecha(i.renovacion_fecha)}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Pagos pendientes */}
        <section className="border border-neutral-800 rounded-2xl p-5">
          <h2 className="font-semibold mb-3">Pagos pendientes</h2>
          {pendientes.length === 0 ? (
            <p className="text-sm text-neutral-500">No hay pagos pendientes. 🎉</p>
          ) : (
            <div className="divide-y divide-neutral-800">
              {pendientes.map((p) => {
                const vencido = p.fecha_vencimiento && p.fecha_vencimiento < hoy;
                return (
                  <Link
                    key={p.id}
                    href={`/clientas/${p.clienta_id}`}
                    className="flex items-center justify-between gap-3 py-2.5 hover:text-brand-500"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{nombreDe(p.clientas)}</div>
                      <div className="text-xs text-neutral-500 truncate">
                        {fmtEur(Number(p.importe))}
                        {p.numero_cuota ? ` · cuota ${p.numero_cuota}` : ""}
                        {p.concepto ? ` · ${p.concepto}` : ""}
                      </div>
                    </div>
                    <span className={"text-sm shrink-0 " + (vencido ? "text-red-400 font-medium" : "text-neutral-400")}>
                      {vencido ? "vencido " : "vence "}
                      {fmtFecha(p.fecha_vencimiento)}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
