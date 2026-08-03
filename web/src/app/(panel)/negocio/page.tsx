import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AutoRefresh } from "../cockpit/acciones-ui";

export const dynamic = "force-dynamic";

type SnapshotNegocio = {
  mrr_eur?: number;
  stripe_mes_eur?: number;
  stripe_mes_n?: number;
  riesgo_eur?: number;
  riesgo_n?: number;
  proximos_auto?: { clienta: string; eur: number; fecha: string }[];
  alertas?: { nivel: string; texto: string }[];
  fuente?: string;
};

function eur(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " €";
}

function Card({
  etiqueta,
  valor,
  detalle,
  tono,
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
  tono?: "bien" | "aviso" | "mal";
}) {
  const color =
    tono === "mal"
      ? "text-red-400"
      : tono === "aviso"
        ? "text-amber-400"
        : tono === "bien"
          ? "text-emerald-400"
          : "";
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{etiqueta}</div>
      <div className={`mt-1 text-2xl font-semibold ${color}`}>{valor}</div>
      {detalle && <div className="mt-1 text-xs text-neutral-500">{detalle}</div>}
    </div>
  );
}

export default async function NegocioPage() {
  const supabase = await createSupabaseServerClient();
  const hoy = new Date();
  const mesInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString();
  const en30d = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);
  const en45d = new Date(Date.now() + 45 * 86400_000).toISOString().slice(0, 10);

  const [{ data: snapRow }, { data: pagadosMes }, { data: pendientes }, { data: renovaciones }] =
    await Promise.all([
      supabase.from("negocio_snapshot").select("data, updated_at").eq("id", "current").maybeSingle(),
      supabase
        .from("pagos")
        .select("importe, origen")
        .eq("estado", "pagado")
        .gte("pagado_en", mesInicio),
      supabase
        .from("pagos")
        .select("importe, fecha_vencimiento, concepto, clienta_id, clientas(nombre)")
        .eq("estado", "pendiente")
        .order("fecha_vencimiento", { ascending: true }),
      supabase
        .from("inscripciones")
        .select("renovacion_fecha, clienta_id, clientas(nombre)")
        .eq("estado", "activa")
        .not("renovacion_fecha", "is", null)
        .lte("renovacion_fecha", en45d)
        .order("renovacion_fecha", { ascending: true }),
    ]);

  const snap = ((snapRow?.data ?? {}) as SnapshotNegocio) ?? {};
  const haySnapshot = snap.mrr_eur !== undefined;

  const hoyIso = hoy.toISOString().slice(0, 10);
  const ingresosMes = (pagadosMes ?? []).reduce((s, p) => s + Number(p.importe || 0), 0);
  const ingresosStripeCRM = (pagadosMes ?? [])
    .filter((p) => p.origen === "stripe")
    .reduce((s, p) => s + Number(p.importe || 0), 0);
  const pendienteTotal = (pendientes ?? []).reduce((s, p) => s + Number(p.importe || 0), 0);
  const vencidos = (pendientes ?? []).filter(
    (p) => p.fecha_vencimiento && p.fecha_vencimiento < hoyIso
  );
  const vencidosTotal = vencidos.reduce((s, p) => s + Number(p.importe || 0), 0);

  const deltaStripe = haySnapshot ? (snap.stripe_mes_eur ?? 0) - ingresosStripeCRM : 0;

  // Próximos cobros fusionados: manuales (mi-hub) + automáticos (Stripe)
  const proximosManuales = (pendientes ?? [])
    .filter((p) => p.fecha_vencimiento && p.fecha_vencimiento <= en30d)
    .map((p) => ({
      clienta:
        ((p.clientas as { nombre?: string } | null)?.nombre ?? "—").split(" ")[0],
      eur: Number(p.importe || 0),
      fecha: p.fecha_vencimiento as string,
      tipo: "manual" as const,
    }));
  const proximosAuto = (snap.proximos_auto ?? []).map((p) => ({ ...p, tipo: "auto" as const }));
  const proximos = [...proximosManuales, ...proximosAuto].sort((a, b) =>
    a.fecha.localeCompare(b.fecha)
  );

  return (
    <div className="p-4 pt-16 md:p-8 mx-auto max-w-5xl">
      <AutoRefresh />
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Negocio</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Tu CRM (mi-hub) + Stripe en una sola vista.
            {snapRow?.updated_at &&
              ` Stripe sincronizado ${new Date(snapRow.updated_at as string).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}.`}
          </p>
        </div>
        <Link href="/pagos" className="text-sm text-neutral-400 underline underline-offset-4 hover:text-neutral-200">
          Ir a Pagos →
        </Link>
      </div>

      {!haySnapshot && (
        <div className="mt-5 rounded-xl border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
          Sin datos de Stripe todavía: lanza «Sincronizar negocio» desde el{" "}
          <Link href="/cockpit" className="underline">Cockpit</Link> (o espera al ciclo automático de 5 min).
        </div>
      )}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card etiqueta="Ingresos del mes (CRM)" valor={eur(ingresosMes)} detalle={`${(pagadosMes ?? []).length} cobros registrados`} tono="bien" />
        <Card etiqueta="MRR Stripe" valor={haySnapshot ? eur(snap.mrr_eur ?? 0) : "—"} detalle="suscripciones activas" />
        <Card
          etiqueta="Pendiente de cobro"
          valor={eur(pendienteTotal)}
          detalle={vencidos.length > 0 ? `${vencidos.length} vencidos: ${eur(vencidosTotal)}` : "nada vencido"}
          tono={vencidos.length > 0 ? "mal" : undefined}
        />
        <Card
          etiqueta="En riesgo (Stripe)"
          valor={haySnapshot ? eur(snap.riesgo_eur ?? 0) : "—"}
          detalle={haySnapshot ? `${snap.riesgo_n ?? 0} facturas vencidas` : undefined}
          tono={(snap.riesgo_eur ?? 0) > 0 ? "mal" : undefined}
        />
      </section>

      {/* Reconciliación CRM ↔ Stripe */}
      {haySnapshot && (
        <section className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900/30 px-4 py-3 text-sm">
          <span className="text-neutral-400">Reconciliación del mes: </span>
          Stripe ha cobrado <strong>{eur(snap.stripe_mes_eur ?? 0)}</strong> ({snap.stripe_mes_n ?? 0} facturas);
          en el CRM tienes registrado <strong>{eur(ingresosStripeCRM)}</strong> con origen Stripe.
          {Math.abs(deltaStripe) < 0.01 ? (
            <span className="text-emerald-400"> Cuadra ✓</span>
          ) : (
            <span className="text-amber-400">
              {" "}Descuadre de {eur(Math.abs(deltaStripe))} — {deltaStripe > 0 ? "te falta registrar cobros en el CRM" : "hay cobros en el CRM que Stripe no refleja"}.
            </span>
          )}
        </section>
      )}

      {/* Alertas Stripe */}
      {(snap.alertas ?? []).length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Alertas de cobro
          </h2>
          <div className="mt-3 space-y-2">
            {(snap.alertas ?? []).map((a, i) => (
              <div
                key={i}
                className={
                  "rounded-xl border px-4 py-2.5 text-sm " +
                  (a.nivel === "crit"
                    ? "border-red-900/60 bg-red-950/20 text-red-200"
                    : "border-amber-900/50 bg-amber-950/20 text-amber-200")
                }
              >
                {a.texto}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Próximos cobros fusionados */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Próximos cobros (30 días)
        </h2>
        {proximos.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">Nada previsto en 30 días.</p>
        ) : (
          <div className="mt-3 rounded-xl border border-neutral-800 overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-neutral-800/70">
                {proximos.map((p, i) => (
                  <tr key={i} className={p.fecha < hoyIso ? "bg-red-950/20" : ""}>
                    <td className="px-4 py-2.5 font-mono text-xs text-neutral-400">{p.fecha}</td>
                    <td className="px-4 py-2.5 text-neutral-200">{p.clienta}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{eur(p.eur)}</td>
                    <td className="px-4 py-2.5 text-xs">
                      {p.tipo === "auto" ? (
                        <span className="text-violet-400">🟣 auto (Stripe)</span>
                      ) : (
                        <span className="text-amber-400">🟠 manual</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Renovaciones */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Renovaciones (45 días)
        </h2>
        {(renovaciones ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">Sin renovaciones próximas.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {(renovaciones ?? []).map((r, i) => (
              <Link
                key={i}
                href={`/clientas/${r.clienta_id}`}
                className="flex items-center justify-between rounded-xl border border-neutral-800 px-4 py-2.5 text-sm hover:border-neutral-700"
              >
                <span>{((r.clientas as { nombre?: string } | null)?.nombre ?? "—")}</span>
                <span className="font-mono text-xs text-neutral-400">{r.renovacion_fecha}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <p className="mt-6 text-xs text-neutral-600">
        CRM en vivo (tablas de mi-hub) · Stripe vía snapshot del worker
        {snap.fuente ? ` — ${snap.fuente}` : ""}. Los cobros manuales se gestionan
        en la ficha de cada clienta.
      </p>
    </div>
  );
}
