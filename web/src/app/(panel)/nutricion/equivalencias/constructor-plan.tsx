"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, Plus, Calculator, Save, Sparkles, ShoppingCart, Printer } from "lucide-react";
import {
  type Toma,
  calcularMacros,
  distribucionSugerida,
  totalesDeTomas,
  redondearMedio,
} from "@/lib/nutricion";
import {
  crearPlanEstructurado,
  actualizarPlanEstructurado,
  eliminarPlanEstructurado,
  sugerirMenuLocal,
  generarListaDesdeMenu,
} from "./acciones";
import { useToast } from "@/components/ui/toast";

type Clienta = { id: string; nombre: string; apellidos: string | null };

type Inicial = {
  id?: string;
  nombre: string;
  clientaId: string | null;
  calorias: number | null;
  proteina_g: number | null;
  grasa_g: number | null;
  hc_g: number | null;
  raciones_hc: number | null;
  raciones_p: number | null;
  raciones_g: number | null;
  tomas: Toma[];
  notas: string | null;
};

const claseInput =
  "bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500";

export function ConstructorPlan({
  inicial,
  clientas,
}: {
  inicial: Inicial;
  clientas: Clienta[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [guardando, startGuardar] = useTransition();
  const [sugiriendo, setSugiriendo] = useState(false);
  const [generandoLista, setGenerandoLista] = useState(false);

  const [nombre, setNombre] = useState(inicial.nombre);
  const [clientaId, setClientaId] = useState<string | null>(inicial.clientaId);
  const [notas, setNotas] = useState(inicial.notas ?? "");

  // Calculadora
  const [peso, setPeso] = useState("");
  const [calorias, setCalorias] = useState(inicial.calorias ? String(inicial.calorias) : "");
  const [grasaPct, setGrasaPct] = useState("28");
  const [protKg, setProtKg] = useState("2.0");
  const [nTomas, setNTomas] = useState("5");

  const [macros, setMacros] = useState({
    proteina_g: inicial.proteina_g,
    grasa_g: inicial.grasa_g,
    hc_g: inicial.hc_g,
    raciones_hc: inicial.raciones_hc,
    raciones_p: inicial.raciones_p,
    raciones_g: inicial.raciones_g,
  });
  const [tomas, setTomas] = useState<Toma[]>(inicial.tomas);

  function calcular() {
    const p = parseFloat(peso);
    const cal = parseFloat(calorias);
    if (!p || !cal) {
      toast.error("Mete peso y calorías objetivo para calcular.");
      return;
    }
    const m = calcularMacros(p, cal, parseFloat(grasaPct) || 28, parseFloat(protKg) || 2.0);
    setMacros({
      proteina_g: m.proteina_g,
      grasa_g: m.grasa_g,
      hc_g: m.hc_g,
      raciones_hc: m.raciones_hc,
      raciones_p: m.raciones_p,
      raciones_g: m.raciones_g,
    });
    setTomas(
      distribucionSugerida(
        { hc: m.raciones_hc, p: m.raciones_p, g: m.raciones_g },
        parseInt(nTomas) || 5
      )
    );
    toast.success(`Calculado: ${m.caloriasReales} kcal reales`);
  }

  function setToma(idx: number, campo: keyof Toma, valor: string | number) {
    setTomas((ts) => ts.map((t, i) => (i === idx ? { ...t, [campo]: valor } : t)));
  }

  function ajustar(idx: number, campo: "hc" | "p" | "g" | "v", delta: number) {
    setTomas((ts) =>
      ts.map((t, i) =>
        i === idx ? { ...t, [campo]: Math.max(0, redondearMedio((t[campo] || 0) + delta)) } : t
      )
    );
  }

  function añadirToma() {
    setTomas((ts) => [
      ...ts,
      { id: `t${ts.length + 1}`, nombre: "Toma", hora: "", hc: 0, p: 0, g: 0, v: 0 },
    ]);
  }

  function borrarToma(idx: number) {
    setTomas((ts) => ts.filter((_, i) => i !== idx));
  }

  function setMenuToma(idx: number, texto: string) {
    setTomas((ts) =>
      ts.map((t, i) => (i === idx ? { ...t, menu: texto.split("\n") } : t))
    );
  }

  async function sugerirMenu() {
    if (tomas.length === 0) {
      toast.error("Calcula primero el reparto por tomas.");
      return;
    }
    setSugiriendo(true);
    try {
      const data = await sugerirMenuLocal(tomas, clientaId, notas);
      if (!data.ok) {
        toast.error(data.error || "No se pudo generar el menú.");
        return;
      }
      const porId = new Map<string, string[]>(data.tomas.map((t) => [t.id, t.menu]));
      setTomas((ts) =>
        ts.map((t) => (porId.has(t.id) ? { ...t, menu: porId.get(t.id) } : t))
      );
      toast.success("Menú sugerido ✓ — revísalo y ajusta lo que quieras.");
    } catch {
      toast.error("No se pudo generar el menú.");
    } finally {
      setSugiriendo(false);
    }
  }

  const totales = totalesDeTomas(tomas);
  const objetivo = {
    hc: macros.raciones_hc ?? 0,
    p: macros.raciones_p ?? 0,
    g: macros.raciones_g ?? 0,
  };

  async function generarLista() {
    if (!clientaId) {
      toast.error("Asigna el plan a una clienta primero.");
      return;
    }
    setGenerandoLista(true);
    try {
      const r = await generarListaDesdeMenu(tomas, clientaId, nombre || "Plan");
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Lista de la compra creada ✓ (la verá la clienta en su Dieta).");
    } catch {
      toast.error("No se pudo generar la lista.");
    } finally {
      setGenerandoLista(false);
    }
  }

  function guardar() {
    if (!nombre.trim()) {
      toast.error("El plan necesita un nombre.");
      return;
    }
    // Limpia las líneas de menú vacías; quita `menu` si queda vacío.
    const tomasLimpias = tomas.map((t) => {
      const menu = (t.menu ?? []).map((l) => l.trim()).filter(Boolean);
      const base = {
        id: t.id,
        nombre: t.nombre,
        hora: t.hora,
        hc: t.hc,
        p: t.p,
        g: t.g,
        v: t.v,
      };
      return menu.length > 0 ? { ...base, menu } : base;
    });
    const datos = {
      nombre,
      clientaId,
      calorias: calorias ? parseInt(calorias) : inicial.calorias,
      ...macros,
      tomas: tomasLimpias,
      notas: notas.trim() || null,
    };
    startGuardar(async () => {
      const r = inicial.id
        ? await actualizarPlanEstructurado(inicial.id, datos)
        : await crearPlanEstructurado(datos);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Plan guardado ✓");
      if (!inicial.id && "id" in r) {
        router.push(`/nutricion/equivalencias/${r.id}`);
      } else {
        router.refresh();
      }
    });
  }

  function borrar() {
    if (!inicial.id) return;
    if (!confirm("¿Borrar este plan? No se puede deshacer.")) return;
    startGuardar(async () => {
      const r = await eliminarPlanEstructurado(inicial.id!);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Plan borrado");
      router.push("/nutricion");
    });
  }

  return (
    <div className="space-y-8">
      {/* Cabecera */}
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-sm text-neutral-300 mb-1">Nombre del plan</span>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Plan tonificación 1600 kcal"
            className={`${claseInput} w-full`}
          />
        </label>
        <label className="block">
          <span className="block text-sm text-neutral-300 mb-1">Asignar a clienta</span>
          <select
            value={clientaId ?? ""}
            onChange={(e) => setClientaId(e.target.value || null)}
            className={`${claseInput} w-full`}
          >
            <option value="">Plantilla (sin asignar)</option>
            {clientas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} {c.apellidos ?? ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Calculadora */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-neutral-300 flex items-center gap-2">
          <Calculator className="size-4" /> Calculadora de raciones
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <label className="block">
            <span className="block text-xs text-neutral-500 mb-1">Peso (kg)</span>
            <input value={peso} onChange={(e) => setPeso(e.target.value)} inputMode="decimal" className={`${claseInput} w-full`} />
          </label>
          <label className="block">
            <span className="block text-xs text-neutral-500 mb-1">Calorías</span>
            <input value={calorias} onChange={(e) => setCalorias(e.target.value)} inputMode="numeric" className={`${claseInput} w-full`} />
          </label>
          <label className="block">
            <span className="block text-xs text-neutral-500 mb-1">% grasa</span>
            <input value={grasaPct} onChange={(e) => setGrasaPct(e.target.value)} inputMode="decimal" className={`${claseInput} w-full`} />
          </label>
          <label className="block">
            <span className="block text-xs text-neutral-500 mb-1">Prot. g/kg</span>
            <input value={protKg} onChange={(e) => setProtKg(e.target.value)} inputMode="decimal" className={`${claseInput} w-full`} />
          </label>
          <label className="block">
            <span className="block text-xs text-neutral-500 mb-1">Nº tomas</span>
            <select value={nTomas} onChange={(e) => setNTomas(e.target.value)} className={`${claseInput} w-full`}>
              {[3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
        <button
          onClick={calcular}
          className="inline-flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-sm font-medium rounded-lg px-3 py-2 transition"
        >
          <Calculator className="size-4" /> Calcular reparto
        </button>

        {macros.raciones_hc != null && (
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm pt-1">
            <span className="text-neutral-400">
              Macros: <strong className="text-neutral-100">{macros.proteina_g}g P</strong> · {macros.grasa_g}g G · {macros.hc_g}g HC
            </span>
            <span className="text-neutral-400">
              Raciones objetivo: <strong className="text-amber-400">{objetivo.hc} HC</strong> · <strong className="text-red-400">{objetivo.p} P</strong> · <strong className="text-lime-400">{objetivo.g} G</strong>
            </span>
          </div>
        )}
      </div>

      {/* Reparto por tomas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wide">
            Reparto por tomas
          </h2>
          {tomas.length > 0 && (
            <button
              onClick={sugerirMenu}
              disabled={sugiriendo}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-700 bg-brand-950/40 px-3 py-1.5 text-sm font-medium text-brand-300 hover:bg-brand-950/70 disabled:opacity-50 transition"
            >
              <Sparkles className="size-4" />
              {sugiriendo ? "Generando menú…" : "Sugerir menú"}
            </button>
          )}
        </div>
        {tomas.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Usa la calculadora para generar el reparto, o añade tomas a mano.
          </p>
        ) : (
          <div className="space-y-2">
            {tomas.map((t, idx) => (
              <div key={t.id} className="rounded-xl border border-neutral-800 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    value={t.nombre}
                    onChange={(e) => setToma(idx, "nombre", e.target.value)}
                    placeholder="Toma"
                    className={`${claseInput} flex-1`}
                  />
                  <input
                    value={t.hora}
                    onChange={(e) => setToma(idx, "hora", e.target.value)}
                    placeholder="hora"
                    className={`${claseInput} w-24`}
                  />
                  <button onClick={() => borrarToma(idx)} className="p-1.5 text-neutral-500 hover:text-red-400" aria-label="Borrar toma">
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(["hc", "p", "g", "v"] as const).map((campo) => (
                    <ContadorRacion
                      key={campo}
                      etiqueta={campo === "v" ? "Verdura" : campo.toUpperCase()}
                      valor={t[campo]}
                      onAjustar={(d) => ajustar(idx, campo, d)}
                    />
                  ))}
                </div>
                <div>
                  <span className="block text-xs text-neutral-500 mb-1">
                    Menú (una línea por plato) — lo rellena el generador o tú a mano
                  </span>
                  <textarea
                    value={(t.menu ?? []).join("\n")}
                    onChange={(e) => setMenuToma(idx, e.target.value)}
                    rows={Math.max(2, (t.menu ?? []).length)}
                    placeholder="Ej: 150 g pechuga de pollo a la plancha"
                    className={`${claseInput} w-full resize-y`}
                  />
                </div>
              </div>
            ))}
            <button onClick={añadirToma} className="inline-flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 font-medium">
              <Plus className="size-4" /> Añadir toma
            </button>
          </div>
        )}

        {/* Totales vs objetivo */}
        {tomas.length > 0 && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-3 text-sm flex flex-wrap gap-x-6 gap-y-1">
            <TotalChip etiqueta="HC" valor={totales.hc} objetivo={macros.raciones_hc} />
            <TotalChip etiqueta="P" valor={totales.p} objetivo={macros.raciones_p} />
            <TotalChip etiqueta="G" valor={totales.g} objetivo={macros.raciones_g} />
            <span className="text-neutral-400">Verdura: <strong className="text-green-400">{totales.v}</strong> raciones</span>
          </div>
        )}
      </div>

      {/* Notas / extras */}
      <label className="block">
        <span className="block text-sm text-neutral-300 mb-1">Notas para la clienta (extras, adaptación familiar…)</span>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={3}
          className={`${claseInput} w-full resize-y`}
          placeholder="Opcional: indicaciones, extras del finde, etc."
        />
      </label>

      {/* Acciones */}
      <div className="flex items-center gap-3 border-t border-neutral-800 pt-4">
        <button
          onClick={guardar}
          disabled={guardando}
          className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition"
        >
          <Save className="size-4" /> {guardando ? "Guardando…" : "Guardar plan"}
        </button>
        {inicial.id && (
          <button onClick={borrar} disabled={guardando} className="inline-flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 ml-auto">
            <Trash2 className="size-4" /> Borrar
          </button>
        )}
      </div>

      {/* Acciones secundarias: lista de compra + PDF */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={generarLista}
          disabled={generandoLista}
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800 disabled:opacity-50"
        >
          <ShoppingCart className="size-4" />
          {generandoLista ? "Generando…" : "Generar lista de compra"}
        </button>
        {inicial.id && (
          <Link
            href={`/imprimir/nutricion/${inicial.id}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
          >
            <Printer className="size-4" /> Imprimir / PDF
          </Link>
        )}
        <span className="text-xs text-neutral-500">
          La lista se crea desde el menú; el PDF usa el plan guardado.
        </span>
      </div>
    </div>
  );
}

function ContadorRacion({
  etiqueta,
  valor,
  onAjustar,
}: {
  etiqueta: string;
  valor: number;
  onAjustar: (delta: number) => void;
}) {
  return (
    <div className="rounded-lg border border-neutral-800 px-2 py-1.5 text-center">
      <div className="text-[10px] uppercase tracking-wide text-neutral-500">{etiqueta}</div>
      <div className="flex items-center justify-center gap-1.5 mt-0.5">
        <button onClick={() => onAjustar(-0.5)} className="text-neutral-500 hover:text-neutral-200 w-5">−</button>
        <span className="text-sm font-semibold tabular-nums w-6">{valor}</span>
        <button onClick={() => onAjustar(0.5)} className="text-neutral-500 hover:text-neutral-200 w-5">+</button>
      </div>
    </div>
  );
}

function TotalChip({
  etiqueta,
  valor,
  objetivo,
}: {
  etiqueta: string;
  valor: number;
  objetivo: number | null;
}) {
  const cuadra = objetivo == null || valor === objetivo;
  return (
    <span className="text-neutral-400">
      {etiqueta}:{" "}
      <strong className={cuadra ? "text-emerald-400" : "text-amber-400"}>
        {valor}
        {objetivo != null && ` / ${objetivo}`}
      </strong>
    </span>
  );
}
