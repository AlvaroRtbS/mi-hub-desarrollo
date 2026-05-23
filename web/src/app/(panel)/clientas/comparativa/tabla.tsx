"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { inicialesNombre } from "@/lib/utilidades";

type GrupoFila = { id: string; nombre: string; color: string | null };

export type FilaComparativa = {
  id: string;
  nombre: string;
  apellidos: string | null;
  estado: string;
  grupos: GrupoFila[];
  programaNombre: string | null;
  diasEnPrograma: number | null;
  adherencia: number | null;
  rachaActual: number;
  rachaMaxima: number;
  sesionesCompletadas: number;
  diasSinEntrenar: number | null;
  pesoUltimo: number | null;
  deltaPeso: number | null;
  mensajesNoLeidos: number;
  diasSinContactar: number | null;
  xp: number;
  nivel: number;
  nivelNombre: string;
  numLogros: number;
};

type ColumnaOrdenable =
  | "nombre"
  | "adherencia"
  | "racha"
  | "sesiones"
  | "sin_entrenar"
  | "peso"
  | "nivel"
  | "mensajes";

type Direccion = "asc" | "desc";

function compararNullsAlFinal(a: number | null, b: number | null, dir: Direccion) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return dir === "asc" ? a - b : b - a;
}

export function TablaComparativa({ filas }: { filas: FilaComparativa[] }) {
  const [orden, setOrden] = useState<ColumnaOrdenable>("adherencia");
  const [direccion, setDireccion] = useState<Direccion>("desc");

  function cambiarOrden(col: ColumnaOrdenable) {
    if (orden === col) {
      setDireccion(direccion === "asc" ? "desc" : "asc");
    } else {
      setOrden(col);
      setDireccion(col === "nombre" ? "asc" : "desc");
    }
  }

  const filasOrdenadas = useMemo(() => {
    const copia = [...filas];
    copia.sort((a, b) => {
      switch (orden) {
        case "nombre":
          return direccion === "asc"
            ? a.nombre.localeCompare(b.nombre)
            : b.nombre.localeCompare(a.nombre);
        case "adherencia":
          return compararNullsAlFinal(a.adherencia, b.adherencia, direccion);
        case "racha":
          return direccion === "asc"
            ? a.rachaActual - b.rachaActual
            : b.rachaActual - a.rachaActual;
        case "sesiones":
          return direccion === "asc"
            ? a.sesionesCompletadas - b.sesionesCompletadas
            : b.sesionesCompletadas - a.sesionesCompletadas;
        case "sin_entrenar":
          // null = nunca ha entrenado → al final cuando ordenamos desc (peor)
          return compararNullsAlFinal(a.diasSinEntrenar, b.diasSinEntrenar, direccion);
        case "peso":
          return compararNullsAlFinal(a.deltaPeso, b.deltaPeso, direccion);
        case "nivel":
          return direccion === "asc" ? a.xp - b.xp : b.xp - a.xp;
        case "mensajes":
          return direccion === "asc"
            ? a.mensajesNoLeidos - b.mensajesNoLeidos
            : b.mensajesNoLeidos - a.mensajesNoLeidos;
        default:
          return 0;
      }
    });
    return copia;
  }, [filas, orden, direccion]);

  return (
    <div className="border border-neutral-800 rounded-2xl overflow-x-auto bg-neutral-950">
      <table className="w-full text-sm">
        <thead className="bg-neutral-900 text-neutral-400 text-xs uppercase tracking-wide">
          <tr>
            <ThOrdenable label="Clienta" col="nombre" actual={orden} dir={direccion} onClick={cambiarOrden} sticky />
            <ThOrdenable label="Adherencia" col="adherencia" actual={orden} dir={direccion} onClick={cambiarOrden} />
            <ThOrdenable label="Racha" col="racha" actual={orden} dir={direccion} onClick={cambiarOrden} />
            <ThOrdenable label="Sesiones" col="sesiones" actual={orden} dir={direccion} onClick={cambiarOrden} />
            <ThOrdenable label="Sin entrenar" col="sin_entrenar" actual={orden} dir={direccion} onClick={cambiarOrden} />
            <ThOrdenable label="Peso (Δ)" col="peso" actual={orden} dir={direccion} onClick={cambiarOrden} />
            <ThOrdenable label="Nivel" col="nivel" actual={orden} dir={direccion} onClick={cambiarOrden} />
            <ThOrdenable label="Mensajes" col="mensajes" actual={orden} dir={direccion} onClick={cambiarOrden} />
          </tr>
        </thead>
        <tbody>
          {filasOrdenadas.map((f) => (
            <FilaTabla key={f.id} fila={f} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ThOrdenable({
  label,
  col,
  actual,
  dir,
  onClick,
  sticky = false,
}: {
  label: string;
  col: ColumnaOrdenable;
  actual: ColumnaOrdenable;
  dir: Direccion;
  onClick: (col: ColumnaOrdenable) => void;
  sticky?: boolean;
}) {
  const activo = actual === col;
  return (
    <th
      className={
        "text-left px-3 py-3 font-medium " +
        (sticky ? "sticky left-0 bg-neutral-900 z-10 " : "")
      }
    >
      <button
        onClick={() => onClick(col)}
        className={
          "inline-flex items-center gap-1 hover:text-white " +
          (activo ? "text-white" : "")
        }
      >
        {label}
        {activo && <span className="text-[10px]">{dir === "asc" ? "↑" : "↓"}</span>}
      </button>
    </th>
  );
}

function FilaTabla({ fila: f }: { fila: FilaComparativa }) {
  return (
    <tr className="border-t border-neutral-800 hover:bg-neutral-900/30">
      {/* Nombre + grupos */}
      <td className="px-3 py-3 sticky left-0 bg-neutral-950 hover:bg-neutral-900/30 z-10 min-w-[200px]">
        <Link
          href={`/clientas/${f.id}`}
          className="flex items-center gap-2 hover:text-brand-500"
        >
          <span className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-medium text-neutral-300 flex-shrink-0">
            {inicialesNombre(f.nombre, f.apellidos)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm">
              {f.nombre} {f.apellidos ?? ""}
            </span>
            {f.programaNombre && (
              <span className="block text-[10px] text-neutral-500 truncate">
                {f.programaNombre}
                {f.diasEnPrograma !== null && ` · día ${f.diasEnPrograma}`}
              </span>
            )}
            {f.grupos.length > 0 && (
              <span className="flex gap-1 mt-0.5">
                {f.grupos.slice(0, 3).map((g) => (
                  <span
                    key={g.id}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: g.color ?? "#737373" }}
                    title={g.nombre}
                  />
                ))}
              </span>
            )}
          </span>
        </Link>
      </td>

      {/* Adherencia con barra */}
      <td className="px-3 py-3 min-w-[120px]">
        {f.adherencia === null ? (
          <span className="text-xs text-neutral-700">—</span>
        ) : (
          <div>
            <div className="flex items-center gap-2">
              <span
                className={
                  "text-sm font-medium tabular-nums " +
                  (f.adherencia >= 80
                    ? "text-green-400"
                    : f.adherencia >= 50
                    ? "text-amber-400"
                    : "text-red-400")
                }
              >
                {f.adherencia}%
              </span>
            </div>
            <div className="h-1 bg-neutral-900 rounded mt-1 overflow-hidden w-20">
              <div
                className={
                  "h-full " +
                  (f.adherencia >= 80
                    ? "bg-green-500"
                    : f.adherencia >= 50
                    ? "bg-amber-500"
                    : "bg-red-500")
                }
                style={{ width: `${f.adherencia}%` }}
              />
            </div>
          </div>
        )}
      </td>

      {/* Racha */}
      <td className="px-3 py-3">
        {f.rachaActual === 0 ? (
          <span className="text-xs text-neutral-700">—</span>
        ) : (
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium tabular-nums">{f.rachaActual}</span>
            <span>
              {f.rachaActual >= 7 ? "🔥" : f.rachaActual >= 3 ? "💪" : ""}
            </span>
          </div>
        )}
        {f.rachaMaxima > f.rachaActual && (
          <div className="text-[10px] text-neutral-600">max {f.rachaMaxima}</div>
        )}
      </td>

      {/* Sesiones totales */}
      <td className="px-3 py-3">
        <span className="text-sm tabular-nums">{f.sesionesCompletadas}</span>
      </td>

      {/* Sin entrenar */}
      <td className="px-3 py-3">
        {f.diasSinEntrenar === null ? (
          <span className="text-xs text-neutral-700">Nunca</span>
        ) : (
          <span
            className={
              "text-sm tabular-nums " +
              (f.diasSinEntrenar === 0
                ? "text-green-400"
                : f.diasSinEntrenar <= 2
                ? "text-neutral-300"
                : f.diasSinEntrenar <= 5
                ? "text-amber-400"
                : "text-red-400")
            }
          >
            {f.diasSinEntrenar === 0
              ? "hoy"
              : f.diasSinEntrenar === 1
              ? "1 día"
              : `${f.diasSinEntrenar} días`}
            {f.diasSinEntrenar >= 7 && <span className="ml-1">⚠️</span>}
          </span>
        )}
      </td>

      {/* Peso */}
      <td className="px-3 py-3 min-w-[110px]">
        {f.pesoUltimo === null ? (
          <span className="text-xs text-neutral-700">—</span>
        ) : (
          <div>
            <div className="text-sm tabular-nums text-neutral-300">
              {f.pesoUltimo} kg
            </div>
            {f.deltaPeso !== null && (
              <div
                className={
                  "text-[10px] tabular-nums " +
                  (f.deltaPeso < 0
                    ? "text-green-400"
                    : f.deltaPeso > 0
                    ? "text-amber-400"
                    : "text-neutral-500")
                }
              >
                {f.deltaPeso > 0 ? "+" : ""}
                {f.deltaPeso} kg
              </div>
            )}
          </div>
        )}
      </td>

      {/* Nivel */}
      <td className="px-3 py-3 min-w-[110px]">
        <div className="text-sm font-medium">
          Lv {f.nivel}
          <span className="text-xs text-neutral-500 ml-1">·</span>
          <span className="text-xs text-neutral-400 ml-1">{f.xp} XP</span>
        </div>
        <div className="text-[10px] text-neutral-600 truncate">
          {f.nivelNombre} · {f.numLogros} logros
        </div>
      </td>

      {/* Mensajes / comunicación */}
      <td className="px-3 py-3">
        {f.mensajesNoLeidos > 0 ? (
          <Link
            href={`/mensajes/${f.id}`}
            className="inline-flex items-center gap-1 bg-brand-950/40 border border-brand-900/50 text-brand-300 text-xs px-2 py-0.5 rounded-full hover:bg-brand-950/70"
          >
            {f.mensajesNoLeidos} sin leer
          </Link>
        ) : f.diasSinContactar === null ? (
          <span className="text-xs text-neutral-700">—</span>
        ) : (
          <span
            className={
              "text-xs tabular-nums " +
              (f.diasSinContactar <= 3
                ? "text-neutral-500"
                : f.diasSinContactar <= 7
                ? "text-amber-400"
                : "text-red-400")
            }
          >
            {f.diasSinContactar === 0
              ? "hoy"
              : `hace ${f.diasSinContactar}d`}
          </span>
        )}
      </td>
    </tr>
  );
}
