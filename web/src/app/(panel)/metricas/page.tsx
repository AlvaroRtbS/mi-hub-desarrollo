import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { inicialesNombre, formatearFecha } from "@/lib/utilidades";
import { NuevaMetricaBoton } from "./nueva-metrica";

type FilaClienta = {
  id: string;
  nombre: string;
  apellidos: string | null;
  metricas: Array<{
    id: string;
    tipo: string;
    valor: number;
    unidad: string;
    fecha: string;
  }>;
};

type Snapshot = {
  ultimo: number;
  ultimoFecha: string;
  delta: number | null;
  unidad: string;
};

function snapshot(
  metricas: FilaClienta["metricas"],
  tipo: string
): Snapshot | null {
  const filtradas = metricas
    .filter((m) => m.tipo === tipo)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  if (filtradas.length === 0) return null;
  const ultimo = filtradas[0]!;
  const previo = filtradas[1];
  return {
    ultimo: Number(ultimo.valor),
    ultimoFecha: ultimo.fecha,
    delta: previo ? Number(ultimo.valor) - Number(previo.valor) : null,
    unidad: ultimo.unidad,
  };
}

export default async function MetricasPage() {
  const supabase = await createSupabaseServerClient();

  const { data: clientasData } = await supabase
    .from("clientas")
    .select(
      "id, nombre, apellidos, metricas(id, tipo, valor, unidad, fecha)"
    )
    .eq("estado", "activa")
    .order("nombre");

  const clientas = (clientasData ?? []) as unknown as FilaClienta[];

  return (
    <div className="p-4 pt-16 md:p-8 mx-auto max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Métricas</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Peso, perímetros y otras mediciones de tus clientas activas.
          </p>
        </div>
        <NuevaMetricaBoton
          clientas={clientas.map((c) => ({
            id: c.id,
            nombre: c.nombre,
            apellidos: c.apellidos,
          }))}
        />
      </div>

      {clientas.length === 0 ? (
        <div className="border border-dashed border-neutral-800 rounded-2xl p-12 text-center">
          <div className="text-neutral-400">No hay clientas activas.</div>
        </div>
      ) : (
        <div className="border border-neutral-800 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 text-neutral-400">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Clienta</th>
                <th className="text-left px-4 py-3 font-medium">Peso</th>
                <th className="text-left px-4 py-3 font-medium">Cintura</th>
                <th className="text-left px-4 py-3 font-medium">Cadera</th>
                <th className="text-left px-4 py-3 font-medium">% Grasa</th>
                <th className="text-left px-4 py-3 font-medium">Última medida</th>
              </tr>
            </thead>
            <tbody>
              {clientas.map((c) => {
                const peso = snapshot(c.metricas, "peso");
                const cintura = snapshot(c.metricas, "perimetro_cintura");
                const cadera = snapshot(c.metricas, "perimetro_cadera");
                const grasa = snapshot(c.metricas, "porcentaje_grasa");
                const ultimaFecha = c.metricas
                  .map((m) => m.fecha)
                  .sort()
                  .reverse()[0];
                return (
                  <tr
                    key={c.id}
                    className="border-t border-neutral-800 hover:bg-neutral-900/50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/clientas/${c.id}`}
                        className="flex items-center gap-3 hover:text-brand-500"
                      >
                        <span className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-medium text-neutral-300">
                          {inicialesNombre(c.nombre, c.apellidos)}
                        </span>
                        <span>
                          {c.nombre} {c.apellidos ?? ""}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3"><CeldaMetrica s={peso} /></td>
                    <td className="px-4 py-3"><CeldaMetrica s={cintura} /></td>
                    <td className="px-4 py-3"><CeldaMetrica s={cadera} /></td>
                    <td className="px-4 py-3"><CeldaMetrica s={grasa} /></td>
                    <td className="px-4 py-3 text-neutral-500 text-xs">
                      {ultimaFecha ? formatearFecha(ultimaFecha) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-neutral-500 mt-4">
        Solo se muestran las clientas activas. Para ver la evolución completa con
        gráficas y comparador de fotos, entra en la ficha de cada clienta.
      </p>
    </div>
  );
}

function CeldaMetrica({ s }: { s: Snapshot | null }) {
  if (!s) return <span className="text-neutral-700">—</span>;
  const deltaColor =
    s.delta === null
      ? "text-neutral-600"
      : s.delta > 0
      ? "text-amber-400"
      : s.delta < 0
      ? "text-green-400"
      : "text-neutral-500";
  return (
    <div>
      <div className="text-neutral-200">
        {s.ultimo} <span className="text-neutral-500 text-xs">{s.unidad}</span>
      </div>
      {s.delta !== null && (
        <div className={"text-[10px] " + deltaColor}>
          {s.delta > 0 ? "+" : ""}
          {s.delta.toFixed(1)} vs anterior
        </div>
      )}
    </div>
  );
}
