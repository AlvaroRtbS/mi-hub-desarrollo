import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { obtenerUrlsFirmadas } from "@/lib/supabase/archivos";
import { formatearFecha } from "@/lib/utilidades";
import { EmptyState } from "@/components/ui/empty-state";
import { FormularioMiMetrica } from "./formulario";
import { MiniGrafica } from "./grafica";
import { PasosDiarios } from "./pasos-diarios";
import { ResumenEvolucion } from "./resumen-evolucion";
import { CompartirProgreso } from "./compartir-progreso";

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
    .select("id, pasos_ingest_token, coaches(marca_nombre, marca_logo_url)")
    .eq("user_id", user.id)
    .maybeSingle<{
      id: string;
      pasos_ingest_token: string | null;
      coaches: { marca_nombre: string | null; marca_logo_url: string | null } | null;
    }>();
  if (!clienta) return null;
  const marcaNombre = clienta.coaches?.marca_nombre ?? "Tu entrenador";
  const logoMarca = clienta.coaches?.marca_logo_url ?? null;

  const { data: metricasData } = await supabase
    .from("metricas")
    .select("id, tipo, valor, unidad, fecha, notas")
    .eq("clienta_id", clienta.id)
    .order("fecha", { ascending: false });

  const metricas = (metricasData ?? []) as MetricaFila[];

  const { data: pasosData } = await supabase
    .from("pasos_diarios")
    .select("fecha, pasos, fuente")
    .eq("clienta_id", clienta.id)
    .order("fecha", { ascending: false })
    .limit(14);
  const pasosRecientes = (pasosData ?? []) as Array<{
    fecha: string;
    pasos: number;
    fuente: string | null;
  }>;

  // Agrupar por tipo para gráficas
  const porTipo = new Map<string, MetricaFila[]>();
  metricas.forEach((m) => {
    const lista = porTipo.get(m.tipo) ?? [];
    lista.push(m);
    porTipo.set(m.tipo, lista);
  });

  // ----- Datos para "Tu evolución" -----
  // metricas viene ordenado por fecha DESC (más reciente primero).
  function deltaDesdeInicio(tipo: string): { delta: number | null; unidad: string } {
    const lista = porTipo.get(tipo);
    if (!lista || lista.length < 2) return { delta: null, unidad: lista?.[0]?.unidad ?? "" };
    const actual = Number(lista[0]!.valor);
    const inicial = Number(lista[lista.length - 1]!.valor);
    return { delta: actual - inicial, unidad: lista[0]!.unidad };
  }
  const peso = deltaDesdeInicio("peso");
  const cintura = deltaDesdeInicio("perimetro_cintura");

  const { count: entrenosCount } = await supabase
    .from("sesiones")
    .select("id", { count: "exact", head: true })
    .eq("clienta_id", clienta.id)
    .eq("completada", true);

  // Foto más antigua y más reciente para "antes / ahora"
  const { data: fotosEvol } = await supabase
    .from("fotos_progreso")
    .select("url, fecha")
    .eq("clienta_id", clienta.id)
    .order("fecha", { ascending: true })
    .returns<{ url: string; fecha: string }[]>();
  const listaFotos = fotosEvol ?? [];
  let fotoAntes: { url: string; fecha: string } | null = null;
  let fotoAhora: { url: string; fecha: string } | null = null;
  if (listaFotos.length >= 2) {
    const prim = listaFotos[0]!;
    const ult = listaFotos[listaFotos.length - 1]!;
    const firmadas = await obtenerUrlsFirmadas(
      "fotos-progreso",
      [prim.url, ult.url],
      3600
    );
    const uA = firmadas.get(prim.url);
    const uB = firmadas.get(ult.url);
    if (uA && uB) {
      fotoAntes = { url: uA, fecha: prim.fecha };
      fotoAhora = { url: uB, fecha: ult.fecha };
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1 gap-2">
        <h1 className="text-xl font-semibold">Mi progreso</h1>
        <Link href="/c/fotos" className="text-xs text-brand-500 shrink-0">
          📸 Fotos →
        </Link>
      </div>
      <p className="text-sm text-neutral-400 mb-4">
        Peso, medidas y fotos. Tu entrenador lo revisa para ajustar tu plan.
      </p>

      <ResumenEvolucion
        pesoDelta={peso.delta}
        pesoUnidad={peso.unidad}
        cinturaDelta={cintura.delta}
        cinturaUnidad={cintura.unidad}
        entrenos={entrenosCount ?? 0}
        fotoAntes={fotoAntes}
        fotoAhora={fotoAhora}
      />

      {(peso.delta !== null || entrenosCount || (fotoAntes && fotoAhora)) && (
        <CompartirProgreso
          pesoDelta={peso.delta}
          pesoUnidad={peso.unidad}
          entrenos={entrenosCount ?? 0}
          fotoAntes={fotoAntes}
          fotoAhora={fotoAhora}
          marcaNombre={marcaNombre}
          logoUrl={logoMarca}
        />
      )}

      <PasosDiarios token={clienta.pasos_ingest_token} recientes={pasosRecientes} />

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
