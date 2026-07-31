"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";

export type Receta = {
  id: string;
  nombre: string;
  categoria: string | null;
  descripcion: string | null;
  icono: string | null;
  sabor: string | null;
  momentos: string[];
  alergenos: string[];
  por_racion: { kcal?: number; hc?: number; prot?: number; gra?: number };
  racion_g: number | null;
  ingredientes: { cantidad?: string; item?: string }[];
  pasos: string[];
  consejos: string | null;
  tiempo_min: number | null;
};

const MOMENTOS: { id: string; label: string }[] = [
  { id: "desayuno", label: "Desayuno" },
  { id: "snack", label: "Snack" },
  { id: "principal", label: "Principal" },
];

function ChipFiltro({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "px-3 py-1.5 rounded-full text-xs border transition " +
        (activo
          ? "border-transparent text-white"
          : "border-neutral-700 text-neutral-400 hover:text-neutral-200")
      }
      style={activo ? { backgroundColor: "var(--brand)" } : undefined}
    >
      {children}
    </button>
  );
}

function DetalleReceta({
  receta,
  conflicto,
  onCerrar,
}: {
  receta: Receta;
  conflicto: string[];
  onCerrar: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-end md:items-center justify-center"
      onClick={onCerrar}
    >
      <div
        className="bg-neutral-950 border border-neutral-800 rounded-t-3xl md:rounded-3xl w-full md:w-[440px] max-h-[85vh] overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 className="text-lg font-semibold">
            {receta.icono ? `${receta.icono} ` : ""}
            {receta.nombre}
          </h2>
          <button onClick={onCerrar} className="p-1 text-neutral-500" aria-label="Cerrar">
            <X className="size-5" />
          </button>
        </div>
        {receta.descripcion && (
          <p className="text-sm text-neutral-400 mb-3">{receta.descripcion}</p>
        )}

        <div className="grid grid-cols-4 gap-2 mb-4 text-center">
          {[
            ["kcal", receta.por_racion?.kcal],
            ["HC", receta.por_racion?.hc],
            ["Prot", receta.por_racion?.prot],
            ["Grasa", receta.por_racion?.gra],
          ].map(([label, v]) => (
            <div key={label as string} className="border border-neutral-800 rounded-xl py-2">
              <div className="text-sm font-semibold">{v ?? "—"}</div>
              <div className="text-[10px] text-neutral-500 uppercase">{label}</div>
            </div>
          ))}
        </div>
        {receta.racion_g && (
          <p className="text-xs text-neutral-500 mb-4">
            Valores por ración (~{receta.racion_g} g).
          </p>
        )}

        {conflicto.length > 0 && (
          <div className="mb-4 rounded-xl border border-amber-900 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">
            ⚠ Contiene {conflicto.join(", ")} — marcado en tus restricciones.
          </div>
        )}

        {receta.ingredientes.length > 0 && (
          <div className="mb-4">
            <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1.5">
              Ingredientes
            </div>
            <ul className="text-sm text-neutral-200 space-y-1">
              {receta.ingredientes.map((ing, i) => (
                <li key={i}>
                  {ing.cantidad ? `${ing.cantidad} ` : ""}
                  {ing.item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {receta.pasos.length > 0 && (
          <div className="mb-4">
            <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1.5">
              Preparación
            </div>
            <ol className="text-sm text-neutral-200 space-y-1.5 list-decimal list-inside">
              {receta.pasos.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ol>
          </div>
        )}

        {receta.consejos && (
          <p className="text-xs text-neutral-400">💡 {receta.consejos}</p>
        )}
      </div>
    </div>
  );
}

export function ListaRecetas({
  recetas,
  misAlergenos,
}: {
  recetas: Receta[];
  misAlergenos: string[];
}) {
  const [busqueda, setBusqueda] = useState("");
  const [momento, setMomento] = useState<string | null>(null);
  const [ocultarMias, setOcultarMias] = useState(false);
  const [abierta, setAbierta] = useState<Receta | null>(null);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return recetas.filter((r) => {
      if (momento && !r.momentos.includes(momento)) return false;
      if (
        ocultarMias &&
        r.alergenos.some((a) => misAlergenos.includes(a))
      )
        return false;
      if (!q) return true;
      const texto = (
        r.nombre +
        " " +
        (r.categoria ?? "") +
        " " +
        r.ingredientes.map((i) => i.item ?? "").join(" ")
      ).toLowerCase();
      return texto.includes(q);
    });
  }, [recetas, busqueda, momento, ocultarMias, misAlergenos]);

  return (
    <div>
      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar receta o ingrediente…"
        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:border-neutral-600"
      />
      <div className="flex flex-wrap gap-2 mb-4">
        {MOMENTOS.map((m) => (
          <ChipFiltro
            key={m.id}
            activo={momento === m.id}
            onClick={() => setMomento(momento === m.id ? null : m.id)}
          >
            {m.label}
          </ChipFiltro>
        ))}
        {misAlergenos.length > 0 && (
          <ChipFiltro activo={ocultarMias} onClick={() => setOcultarMias(!ocultarMias)}>
            Sin mis alérgenos
          </ChipFiltro>
        )}
      </div>

      {filtradas.length === 0 ? (
        <p className="text-sm text-neutral-500 py-8 text-center">
          Ninguna receta coincide con el filtro.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtradas.map((r) => {
            const conflicto = r.alergenos.filter((a) => misAlergenos.includes(a));
            return (
              <button
                key={r.id}
                onClick={() => setAbierta(r)}
                className="text-left border border-neutral-800 rounded-2xl p-4 bg-neutral-950 hover:border-neutral-700 transition"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">
                    {r.icono ? `${r.icono} ` : ""}
                    {r.nombre}
                  </span>
                  <span className="text-xs text-neutral-500 shrink-0">
                    {r.por_racion?.kcal != null ? `${r.por_racion.kcal} kcal` : ""}
                  </span>
                </div>
                <div className="mt-1 text-xs text-neutral-500 flex flex-wrap gap-x-3">
                  {r.categoria && <span>{r.categoria}</span>}
                  {r.por_racion?.prot != null && <span>P {r.por_racion.prot} g</span>}
                  {r.por_racion?.hc != null && <span>HC {r.por_racion.hc} g</span>}
                  {r.por_racion?.gra != null && <span>G {r.por_racion.gra} g</span>}
                  {conflicto.length > 0 && (
                    <span className="text-amber-400">⚠ {conflicto.join(", ")}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {abierta && (
        <DetalleReceta
          receta={abierta}
          conflicto={abierta.alergenos.filter((a) => misAlergenos.includes(a))}
          onCerrar={() => setAbierta(null)}
        />
      )}
    </div>
  );
}
