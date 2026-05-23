"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  LOGROS,
  calcularNivel,
  type TipoLogro,
  type DefinicionLogro,
} from "@/lib/gamificacion";

type LogroDesbloqueado = {
  tipo: TipoLogro;
  conseguido_en: string;
};

const CATEGORIAS: Array<{
  id: DefinicionLogro["categoria"];
  label: string;
}> = [
  { id: "adherencia", label: "Adherencia" },
  { id: "racha", label: "Racha" },
  { id: "progreso", label: "Progreso" },
  { id: "compromiso", label: "Compromiso" },
];

export function PanelLogros({
  clientaId,
  desbloqueados,
  xpTotal,
  gamificacionActiva,
}: {
  clientaId: string;
  desbloqueados: LogroDesbloqueado[];
  xpTotal: number;
  gamificacionActiva: boolean;
}) {
  const router = useRouter();
  const [recalculando, startTransition] = useTransition();
  const [nuevos, setNuevos] = useState<number | null>(null);

  const desbloqueadosSet = new Set(desbloqueados.map((d) => d.tipo));
  const nivel = calcularNivel(xpTotal);

  function recalcular() {
    setNuevos(null);
    startTransition(async () => {
      const r = await fetch("/api/gamificacion/recalcular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientaId }),
      });
      const data = await r.json();
      if (data.ok) {
        setNuevos(data.total ?? 0);
        router.refresh();
      }
    });
  }

  async function alternarGamificacion() {
    await fetch("/api/gamificacion/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientaId, activo: !gamificacionActiva }),
    });
    router.refresh();
  }

  if (!gamificacionActiva) {
    return (
      <div className="border border-neutral-800 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Logros y niveles</h3>
            <p className="text-xs text-neutral-500 mt-1">
              Gamificación desactivada para esta clienta.
            </p>
          </div>
          <button
            onClick={alternarGamificacion}
            className="text-xs text-brand-500 hover:text-brand-400"
          >
            Activar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-neutral-800 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="font-medium">🎮 Logros y nivel</h3>
          <p className="text-xs text-neutral-500 mt-1">
            {desbloqueados.length} de {Object.keys(LOGROS).length} desbloqueados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={recalcular}
            disabled={recalculando}
            className="text-xs text-brand-500 hover:text-brand-400 disabled:opacity-50"
          >
            {recalculando
              ? "Recalculando..."
              : nuevos !== null
              ? `${nuevos} nuevos ✓`
              : "Recalcular"}
          </button>
          <button
            onClick={alternarGamificacion}
            className="text-[10px] text-neutral-500 hover:text-neutral-300"
          >
            Desactivar
          </button>
        </div>
      </div>

      {/* Barra de nivel */}
      <div className="bg-gradient-to-r from-brand-950/40 to-neutral-900 border border-brand-900/30 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xs uppercase tracking-wide text-brand-400">
              Nivel {nivel.nivel}
            </div>
            <div className="text-lg font-semibold text-neutral-100">
              {nivel.nombre}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-brand-400">{xpTotal}</div>
            <div className="text-[10px] text-neutral-500 uppercase">XP total</div>
          </div>
        </div>
        <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-600 to-brand-400"
            style={{ width: `${nivel.porcentaje}%` }}
          />
        </div>
        <div className="text-[10px] text-neutral-500 mt-1.5">
          {nivel.xpEnNivel} / {nivel.xpParaSiguiente} XP para el siguiente nivel
        </div>
      </div>

      {/* Logros por categoría */}
      <div className="space-y-4">
        {CATEGORIAS.map((cat) => {
          const logros = Object.values(LOGROS).filter((l) => l.categoria === cat.id);
          return (
            <div key={cat.id}>
              <div className="text-[10px] uppercase tracking-wide text-neutral-500 mb-2">
                {cat.label}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {logros.map((l) => {
                  const ganado = desbloqueadosSet.has(l.tipo);
                  return (
                    <div
                      key={l.tipo}
                      className={
                        "border rounded-xl p-2 text-center transition " +
                        (ganado
                          ? "border-brand-900/50 bg-brand-950/20"
                          : "border-neutral-900 bg-neutral-950 opacity-40")
                      }
                      title={`${l.nombre} — ${l.descripcion} (+${l.xp} XP)`}
                    >
                      <div className={"text-2xl mb-1 " + (ganado ? "" : "grayscale")}>
                        {l.emoji}
                      </div>
                      <div className="text-[10px] font-medium text-neutral-200 truncate">
                        {l.nombre}
                      </div>
                      <div className="text-[9px] text-neutral-600">+{l.xp}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
