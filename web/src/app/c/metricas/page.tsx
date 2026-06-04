import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatearFecha } from "@/lib/utilidades";
import { EmptyState } from "@/components/ui/empty-state";
import { FormularioMiMetrica } from "./formulario";
import { MiniGrafica } from "./grafica";

type MetricaFila = {
  id: string;
  tipo: string;
  valor: number;
  unidad: string;
  fecha: string;
  notas: string | null;
};

const ETIQUETAS: Record<string, string> = {
  peso: "Peso",
  perimetro_cintura: "Cintura",
  perimetro_cadera: "Cadera",
  perimetro_brazo: "Brazo",
  porcentaje_grasa: "% grasa",
  masa_muscular: "Masa muscular",
};

export default async function MetricasClientaPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: clienta } = await supabase
    .from("clientas")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!clienta) return null;

  const { data: metricasData } = await supabase
    .from("metricas")
    .select("id, tipo, valor, unidad, fecha, notas")
    .eq("clienta_id", clienta.id)
    .order("fecha", { ascending: false });

  const metricas = (metricasData ?? []) as MetricaFila[];

  // Agrupar por tipo para gráficas
  const porTipo = new Map<string, MetricaFila[]>();
  metricas.forEach((m) => {
    const lista = porTipo.get(m.tipo) ?? [];
    lista.push(m);
    porTipo.set(m.tipo, lista);
  });

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Mis métricas</h1>
      <p className="text-sm text-neutral-400 mb-4">
        Registra tu evolución para que tu entrenador la vea.
      </p>

      <FormularioMiMetrica />

      {porTipo.size === 0 ? (
        <EmptyState
          icono="📏"
          titulo="Aún no has registrado ninguna medida"
          descripcion="Usa el botón de arriba para registrar tu primera."
          className="mt-6"
        />
      ) : (
        <div className="mt-6 space-y-4">
          {Array.from(porTipo.entries()).map(([tipo, lista]) => {
            const puntos = [...lista]
              .reverse()
              .map((m) => ({ fecha: m.fecha, valor: Number(m.valor) }));
            const ultimo = lista[0]!;
            const primero = lista[lista.length - 1]!;
            const delta =
              lista.length >= 2
                ? Number(ultimo.valor) - Number(primero.valor)
                : null;

            return (
              <div
                key={tipo}
                className="border border-neutral-800 rounded-2xl p-4 bg-neutral-950"
              >
                <div className="flex items-baseline justify-between mb-1">
                  <div className="text-sm font-medium">
                    {ETIQUETAS[tipo] ?? tipo.replace(/_/g, " ")}
                  </div>
                  <div className="text-2xl font-semibold">
                    {ultimo.valor}
                    <span className="text-sm text-neutral-500 ml-1">
                      {ultimo.unidad}
                    </span>
                  </div>
                </div>
                {delta !== null && (
                  <div
                    className={
                      "text-xs " +
                      (delta < 0
                        ? "text-green-400"
                        : delta > 0
                        ? "text-amber-400"
                        : "text-neutral-500")
                    }
                  >
                    {delta > 0 ? "+" : ""}
                    {delta.toFixed(1)} {ultimo.unidad} desde el inicio
                  </div>
                )}
                <div className="mt-3">
                  <MiniGrafica puntos={puntos} />
                </div>
                <div className="text-[10px] text-neutral-600 mt-2">
                  {lista.length} {lista.length === 1 ? "medida" : "medidas"} ·
                  última {formatearFecha(ultimo.fecha)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
