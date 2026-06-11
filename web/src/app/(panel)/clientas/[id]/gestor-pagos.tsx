"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { hoyISO } from "@/lib/utilidades";
import {
  crearInscripcion,
  registrarPago,
  cambiarEstadoPago,
  cambiarEstadoInscripcion,
  eliminarPago,
} from "./acciones-pagos";
import type {
  Inscripcion,
  Pago,
  EstadoPago,
  OrigenPago,
  TipoPago,
} from "@/lib/supabase/tipos";

const eur = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
function fmtEur(n: number | null | undefined): string {
  return eur.format(Number(n ?? 0));
}
function fmtFecha(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso + (iso.length === 10 ? "T00:00:00Z" : "")).toLocaleDateString(
    "es-ES",
    { day: "2-digit", month: "short", year: "numeric" }
  );
}
function sumarMeses(iso: string, meses: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + meses);
  return d.toISOString().slice(0, 10);
}

const ESTADO_PAGO: Record<EstadoPago, { label: string; clase: string }> = {
  pendiente: { label: "Pendiente", clase: "bg-amber-950/50 text-amber-400 border-amber-900/50" },
  pagado: { label: "Pagado", clase: "bg-green-950/50 text-green-400 border-green-900/50" },
  fallido: { label: "Fallido", clase: "bg-red-950/50 text-red-400 border-red-900/50" },
  reembolsado: { label: "Reembolsado", clase: "bg-neutral-900 text-neutral-400 border-neutral-800" },
};

const ORIGENES: OrigenPago[] = ["sepa", "stripe", "bizum", "transferencia", "efectivo", "otro"];

export function GestorInscripcionPagos({
  clientaId,
  inscripcion,
  pagos,
}: {
  clientaId: string;
  inscripcion: Inscripcion | null;
  pagos: Pago[];
}) {
  const router = useRouter();
  const [guardando, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [verFormInsc, setVerFormInsc] = useState(false);
  const [verFormPago, setVerFormPago] = useState(false);

  // ----- Form inscripción -----
  const [concepto, setConcepto] = useState("Programa 1-a-1 (3 meses)");
  const [fechaInicio, setFechaInicio] = useState(hoyISO());
  const [importeTotal, setImporteTotal] = useState("397");
  const [tipoPago, setTipoPago] = useState<TipoPago>("unico");
  const [cuotasTotal, setCuotasTotal] = useState("1");
  const [renovacion, setRenovacion] = useState(sumarMeses(hoyISO(), 3));
  const [origenCuotas, setOrigenCuotas] = useState<OrigenPago>("sepa");
  const [generarCuotas, setGenerarCuotas] = useState(true);

  // ----- Form pago suelto -----
  const [pImporte, setPImporte] = useState("");
  const [pConcepto, setPConcepto] = useState("");
  const [pVenc, setPVenc] = useState(hoyISO());
  const [pOrigen, setPOrigen] = useState<OrigenPago>("sepa");
  const [pEstado, setPEstado] = useState<EstadoPago>("pagado");

  function aplicarPreset(tipo: "unico" | "fraccionado") {
    if (tipo === "unico") {
      setConcepto("Programa 1-a-1 (3 meses)");
      setImporteTotal("397");
      setTipoPago("unico");
      setCuotasTotal("1");
    } else {
      setConcepto("Programa 1-a-1 (3 meses)");
      setImporteTotal("480");
      setTipoPago("fraccionado");
      setCuotasTotal("3");
    }
    setRenovacion(sumarMeses(fechaInicio, 3));
  }

  function onCrearInscripcion() {
    setError(null);
    iniciar(async () => {
      const r = await crearInscripcion({
        clientaId,
        concepto,
        fechaInicio,
        importeTotal: parseFloat(importeTotal),
        tipoPago,
        cuotasTotal: parseInt(cuotasTotal, 10) || 1,
        renovacionFecha: renovacion || null,
        generarCuotas,
        origenCuotas: generarCuotas ? origenCuotas : null,
      });
      if (!r.ok) return setError(r.error);
      setVerFormInsc(false);
      router.refresh();
    });
  }

  function onRegistrarPago() {
    setError(null);
    iniciar(async () => {
      const r = await registrarPago({
        clientaId,
        inscripcionId: inscripcion?.id ?? null,
        importe: parseFloat(pImporte),
        concepto: pConcepto || null,
        fechaVencimiento: pVenc || null,
        origen: pOrigen,
        estado: pEstado,
      });
      if (!r.ok) return setError(r.error);
      setVerFormPago(false);
      setPImporte("");
      setPConcepto("");
      router.refresh();
    });
  }

  function accionPago(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    iniciar(async () => {
      const r = await fn();
      if (!r.ok) return setError(r.error ?? "Error.");
      router.refresh();
    });
  }

  const totalPagado = pagos
    .filter((p) => p.estado === "pagado")
    .reduce((a, p) => a + Number(p.importe), 0);
  const totalPendiente = pagos
    .filter((p) => p.estado === "pendiente")
    .reduce((a, p) => a + Number(p.importe), 0);

  const inputCls =
    "w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500";

  return (
    <div className="border border-neutral-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Inscripción y pagos</h2>
        <div className="flex gap-2 text-xs">
          {inscripcion?.estado !== "activa" && (
            <button
              onClick={() => setVerFormInsc((v) => !v)}
              className="px-2.5 py-1 rounded-lg border border-neutral-700 text-neutral-300 hover:border-neutral-500"
            >
              + Inscripción
            </button>
          )}
          <button
            onClick={() => setVerFormPago((v) => !v)}
            className="px-2.5 py-1 rounded-lg border border-neutral-700 text-neutral-300 hover:border-neutral-500"
          >
            + Pago
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2 mb-3">
          {error}
        </div>
      )}

      {/* Inscripción activa */}
      {inscripcion ? (
        <div className="border border-neutral-800 rounded-xl p-4 mb-4 bg-neutral-950">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">{inscripcion.concepto}</div>
              <div className="text-sm text-neutral-400 mt-1">
                {fmtEur(inscripcion.importe_total)} ·{" "}
                {inscripcion.tipo_pago === "fraccionado"
                  ? `${inscripcion.cuotas_total} cuotas`
                  : "pago único"}{" "}
                · inicio {fmtFecha(inscripcion.fecha_inicio)}
              </div>
              <div className="text-sm text-neutral-400">
                Renovación: <strong className="text-neutral-200">{fmtFecha(inscripcion.renovacion_fecha)}</strong>
              </div>
            </div>
            <span
              className={
                "text-xs px-2 py-0.5 rounded-full border shrink-0 " +
                (inscripcion.estado === "activa"
                  ? "bg-green-950/50 text-green-400 border-green-900/50"
                  : inscripcion.estado === "finalizada"
                    ? "bg-neutral-900 text-neutral-400 border-neutral-800"
                    : "bg-red-950/50 text-red-400 border-red-900/50")
              }
            >
              {inscripcion.estado}
            </span>
          </div>
          {inscripcion.estado === "activa" && (
            <div className="flex gap-2 mt-3 text-xs">
              <button
                disabled={guardando}
                onClick={() => {
                  if (!confirm("¿Marcar la inscripción como finalizada?")) return;
                  accionPago(() =>
                    cambiarEstadoInscripcion(inscripcion.id, clientaId, "finalizada")
                  );
                }}
                className="px-2.5 py-1 rounded-lg border border-neutral-700 text-neutral-300 hover:border-neutral-500"
              >
                Marcar finalizada
              </button>
              <button
                disabled={guardando}
                onClick={() => {
                  if (!confirm("¿Cancelar esta inscripción?")) return;
                  accionPago(() =>
                    cambiarEstadoInscripcion(inscripcion.id, clientaId, "cancelada")
                  );
                }}
                className="px-2.5 py-1 rounded-lg border border-neutral-700 text-neutral-400 hover:border-red-700 hover:text-red-400"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      ) : (
        !verFormInsc && (
          <p className="text-sm text-neutral-500 mb-4">
            Sin inscripción registrada. Pulsa “+ Inscripción” para darla de alta.
          </p>
        )
      )}

      {/* Formulario nueva inscripción */}
      {verFormInsc && (
        <div className="border border-neutral-800 rounded-xl p-4 mb-4 space-y-3 bg-neutral-950">
          <div className="flex gap-2">
            <button
              onClick={() => aplicarPreset("unico")}
              className="text-xs px-2.5 py-1 rounded-lg border border-neutral-700 hover:border-brand-500"
            >
              Pago único 397 €
            </button>
            <button
              onClick={() => aplicarPreset("fraccionado")}
              className="text-xs px-2.5 py-1 rounded-lg border border-neutral-700 hover:border-brand-500"
            >
              Fraccionado 480 € (3×160)
            </button>
          </div>
          <input className={inputCls} value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Concepto" />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-neutral-500">
              Inicio
              <input type="date" className={inputCls} value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </label>
            <label className="text-xs text-neutral-500">
              Renovación
              <input type="date" className={inputCls} value={renovacion} onChange={(e) => setRenovacion(e.target.value)} />
            </label>
            <label className="text-xs text-neutral-500">
              Importe total (€)
              <input type="number" min="0" step="0.01" className={inputCls} value={importeTotal} onChange={(e) => setImporteTotal(e.target.value)} />
            </label>
            <label className="text-xs text-neutral-500">
              Tipo
              <select className={inputCls} value={tipoPago} onChange={(e) => setTipoPago(e.target.value as TipoPago)}>
                <option value="unico">Pago único</option>
                <option value="fraccionado">Fraccionado</option>
              </select>
            </label>
            <label className="text-xs text-neutral-500">
              Nº cuotas
              <input type="number" min="1" className={inputCls} value={cuotasTotal} onChange={(e) => setCuotasTotal(e.target.value)} />
            </label>
            <label className="text-xs text-neutral-500">
              Origen de cobro
              <select className={inputCls} value={origenCuotas} onChange={(e) => setOrigenCuotas(e.target.value as OrigenPago)}>
                {ORIGENES.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-300">
            <input type="checkbox" checked={generarCuotas} onChange={(e) => setGenerarCuotas(e.target.checked)} className="size-4 accent-[var(--brand)]" />
            Generar las cuotas como pagos pendientes (mensuales)
          </label>
          <div className="flex gap-2">
            <button
              disabled={guardando}
              onClick={onCrearInscripcion}
              className="text-sm font-medium text-white rounded-lg px-4 py-2 disabled:opacity-50"
              style={{ backgroundColor: "var(--brand)" }}
            >
              {guardando ? "Guardando…" : "Crear inscripción"}
            </button>
            <button onClick={() => setVerFormInsc(false)} className="text-sm text-neutral-400 px-3">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Formulario pago suelto */}
      {verFormPago && (
        <div className="border border-neutral-800 rounded-xl p-4 mb-4 space-y-3 bg-neutral-950">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-neutral-500">
              Importe (€)
              <input type="number" min="0" step="0.01" className={inputCls} value={pImporte} onChange={(e) => setPImporte(e.target.value)} placeholder="160" />
            </label>
            <label className="text-xs text-neutral-500">
              Vencimiento
              <input type="date" className={inputCls} value={pVenc} onChange={(e) => setPVenc(e.target.value)} />
            </label>
            <label className="text-xs text-neutral-500">
              Origen
              <select className={inputCls} value={pOrigen} onChange={(e) => setPOrigen(e.target.value as OrigenPago)}>
                {ORIGENES.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-neutral-500">
              Estado
              <select className={inputCls} value={pEstado} onChange={(e) => setPEstado(e.target.value as EstadoPago)}>
                <option value="pagado">Pagado</option>
                <option value="pendiente">Pendiente</option>
              </select>
            </label>
          </div>
          <input className={inputCls} value={pConcepto} onChange={(e) => setPConcepto(e.target.value)} placeholder="Concepto (opcional)" />
          <div className="flex gap-2">
            <button
              disabled={guardando}
              onClick={onRegistrarPago}
              className="text-sm font-medium text-white rounded-lg px-4 py-2 disabled:opacity-50"
              style={{ backgroundColor: "var(--brand)" }}
            >
              {guardando ? "Guardando…" : "Registrar pago"}
            </button>
            <button onClick={() => setVerFormPago(false)} className="text-sm text-neutral-400 px-3">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de pagos */}
      {pagos.length > 0 ? (
        <>
          <div className="flex gap-4 text-sm mb-2">
            <span className="text-neutral-400">Pagado: <strong className="text-green-400">{fmtEur(totalPagado)}</strong></span>
            <span className="text-neutral-400">Pendiente: <strong className="text-amber-400">{fmtEur(totalPendiente)}</strong></span>
          </div>
          <div className="divide-y divide-neutral-800 border border-neutral-800 rounded-xl overflow-hidden">
            {pagos.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{fmtEur(p.importe)}</span>
                    {p.numero_cuota && (
                      <span className="text-xs text-neutral-500">cuota {p.numero_cuota}</span>
                    )}
                    {p.origen && (
                      <span className="text-xs text-neutral-500">· {p.origen}</span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-500 truncate">
                    {p.estado === "pagado" && p.pagado_en
                      ? `pagado ${fmtFecha(p.pagado_en.slice(0, 10))}`
                      : `vence ${fmtFecha(p.fecha_vencimiento)}`}
                    {p.concepto ? ` · ${p.concepto}` : ""}
                  </div>
                </div>
                <span className={"text-xs px-2 py-0.5 rounded-full border shrink-0 " + ESTADO_PAGO[p.estado].clase}>
                  {ESTADO_PAGO[p.estado].label}
                </span>
                <div className="flex gap-1 shrink-0">
                  {p.estado !== "pagado" && (
                    <button
                      disabled={guardando}
                      title="Marcar pagado"
                      onClick={() => accionPago(() => cambiarEstadoPago(p.id, clientaId, "pagado"))}
                      className="text-xs px-2 py-1 rounded-lg border border-neutral-700 hover:border-green-700 hover:text-green-400"
                    >
                      ✓
                    </button>
                  )}
                  {p.estado === "pagado" && (
                    <button
                      disabled={guardando}
                      title="Marcar pendiente"
                      onClick={() => accionPago(() => cambiarEstadoPago(p.id, clientaId, "pendiente"))}
                      className="text-xs px-2 py-1 rounded-lg border border-neutral-700 hover:border-amber-700 hover:text-amber-400"
                    >
                      ↺
                    </button>
                  )}
                  <button
                    disabled={guardando}
                    title="Eliminar"
                    onClick={() => {
                      if (!confirm(`¿Eliminar este pago de ${fmtEur(p.importe)}?`)) return;
                      accionPago(() => eliminarPago(p.id, clientaId));
                    }}
                    className="text-xs px-2 py-1 rounded-lg border border-neutral-700 hover:border-red-700 hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        !verFormPago && <p className="text-sm text-neutral-500">Sin pagos registrados.</p>
      )}
    </div>
  );
}
