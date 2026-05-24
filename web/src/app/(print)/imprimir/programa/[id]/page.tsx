import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  EstructuraPrograma,
  Semana,
  Dia,
  Bloque,
  Elemento,
} from "@/lib/supabase/tipos";
import { BotonImprimir } from "./boton-imprimir";

export const metadata = {
  title: "Imprimir programa",
};

export default async function ImprimirProgramaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: programa } = await supabase
    .from("programas")
    .select("id, nombre, descripcion, num_semanas, estructura, coach_id")
    .eq("id", id)
    .maybeSingle();

  if (!programa) notFound();

  const { data: coach } = await supabase
    .from("coaches")
    .select("nombre, marca_nombre, marca_logo_url, marca_color_primario")
    .eq("id", programa.coach_id)
    .maybeSingle();

  const { data: ejerciciosData } = await supabase
    .from("ejercicios")
    .select("id, nombre, instrucciones");
  const ejerciciosMap = new Map<
    string,
    { nombre: string; instrucciones: string | null }
  >();
  for (const e of (ejerciciosData ?? []) as Array<{
    id: string;
    nombre: string;
    instrucciones: string | null;
  }>) {
    ejerciciosMap.set(e.id, {
      nombre: e.nombre,
      instrucciones: e.instrucciones,
    });
  }

  const estructura = (programa.estructura ?? []) as EstructuraPrograma;
  const tituloEntrenador =
    (coach?.marca_nombre as string | null) ??
    (coach?.nombre as string | null) ??
    "Coach";
  const colorMarca = (coach?.marca_color_primario as string | null) ?? "#16a34a";
  const logoUrl = (coach?.marca_logo_url as string | null) ?? null;

  return (
    <div>
      <BotonImprimir />

      <div className="max-w-4xl mx-auto px-8 py-10 print:px-0 print:py-0">
        <header
          className="flex items-start gap-4 border-b-4 pb-4 mb-6"
          style={{ borderColor: colorMarca }}
        >
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={tituloEntrenador}
              className="h-14 w-14 rounded object-cover"
            />
          )}
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wider text-neutral-500">
              Programa de entrenamiento — {tituloEntrenador}
            </p>
            <h1
              className="text-3xl font-bold mt-1"
              style={{ color: colorMarca }}
            >
              {programa.nombre}
            </h1>
            {programa.descripcion && (
              <p className="text-neutral-700 mt-2 whitespace-pre-line">
                {programa.descripcion}
              </p>
            )}
          </div>
          <div className="text-right text-xs text-neutral-500">
            <p>{programa.num_semanas} semanas</p>
            <p>{contarBloques(estructura)} bloques</p>
            <p>{contarElementos(estructura)} elementos</p>
          </div>
        </header>

        {estructura.length === 0 ? (
          <div className="text-center py-20 text-neutral-500">
            <p>Este programa no tiene contenido todavía.</p>
          </div>
        ) : (
          estructura.map((semana) => (
            <SemanaImpresion
              key={semana.semana}
              semana={semana}
              ejerciciosMap={ejerciciosMap}
              colorMarca={colorMarca}
            />
          ))
        )}

        <footer className="mt-10 pt-4 border-t border-neutral-200 text-xs text-neutral-400 text-center">
          {tituloEntrenador} · Generado el{" "}
          {new Date().toLocaleDateString("es-ES", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </footer>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 1cm; }
          .no-print { display: none !important; }
          body { background: white !important; }
          .semana-impresion { page-break-inside: avoid; }
          .dia-impresion { page-break-inside: avoid; }
          .bloque-impresion { page-break-inside: avoid; }
          a { color: inherit; text-decoration: none; }
        }
      `}</style>
    </div>
  );
}

function SemanaImpresion({
  semana,
  ejerciciosMap,
  colorMarca,
}: {
  semana: Semana;
  ejerciciosMap: Map<string, { nombre: string; instrucciones: string | null }>;
  colorMarca: string;
}) {
  const diasConContenido = semana.dias.filter(
    (d) => d.bloques.length > 0 || d.descanso
  );
  if (diasConContenido.length === 0) return null;

  return (
    <section className="semana-impresion mb-8">
      <h2
        className="text-xl font-bold py-2 px-3 mb-3 rounded"
        style={{ backgroundColor: `${colorMarca}15`, color: colorMarca }}
      >
        Semana {semana.semana}
        {semana.titulo && (
          <span className="font-normal text-neutral-600 ml-2">
            — {semana.titulo}
          </span>
        )}
      </h2>

      <div className="space-y-4">
        {diasConContenido.map((dia) => (
          <DiaImpresion
            key={dia.dia}
            dia={dia}
            ejerciciosMap={ejerciciosMap}
            colorMarca={colorMarca}
          />
        ))}
      </div>
    </section>
  );
}

function DiaImpresion({
  dia,
  ejerciciosMap,
  colorMarca,
}: {
  dia: Dia;
  ejerciciosMap: Map<string, { nombre: string; instrucciones: string | null }>;
  colorMarca: string;
}) {
  return (
    <div className="dia-impresion border border-neutral-200 rounded p-4">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-semibold text-base">
          {dia.titulo}
          {dia.descanso && (
            <span className="ml-2 text-xs font-normal text-neutral-500">
              · Descanso
            </span>
          )}
        </h3>
      </div>

      {dia.bloques.length === 0 ? (
        <p className="text-sm text-neutral-500 italic">
          {dia.descanso ? "Día de descanso" : "Sin contenido"}
        </p>
      ) : (
        <div className="space-y-3">
          {dia.bloques.map((bloque) => (
            <BloqueImpresion
              key={bloque.id}
              bloque={bloque}
              ejerciciosMap={ejerciciosMap}
              colorMarca={colorMarca}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BloqueImpresion({
  bloque,
  ejerciciosMap,
  colorMarca,
}: {
  bloque: Bloque;
  ejerciciosMap: Map<string, { nombre: string; instrucciones: string | null }>;
  colorMarca: string;
}) {
  return (
    <div className="bloque-impresion">
      <h4 className="font-semibold text-sm mb-1.5" style={{ color: colorMarca }}>
        {bloque.titulo || "Bloque"}
      </h4>
      {bloque.indicaciones && (
        <p className="text-xs text-neutral-600 mb-2 italic">
          {bloque.indicaciones}
        </p>
      )}
      <ol className="space-y-2 ml-4 list-decimal text-sm">
        {bloque.elementos.map((el) => (
          <li key={el.id}>
            <ElementoImpresion elemento={el} ejerciciosMap={ejerciciosMap} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function ElementoImpresion({
  elemento,
  ejerciciosMap,
}: {
  elemento: Elemento;
  ejerciciosMap: Map<string, { nombre: string; instrucciones: string | null }>;
}) {
  switch (elemento.tipo) {
    case "ejercicio": {
      const nombre =
        ejerciciosMap.get(elemento.ejercicio_id)?.nombre ??
        elemento.ejercicio_nombre ??
        "Ejercicio (sin nombre)";
      return (
        <div>
          <div className="font-medium">{nombre}</div>
          {elemento.series.length > 0 && (
            <table className="w-full mt-1 text-xs border-collapse">
              <thead>
                <tr className="text-neutral-500 text-left">
                  <th className="font-normal px-2 py-0.5 w-12">Serie</th>
                  <th className="font-normal px-2 py-0.5">Reps</th>
                  <th className="font-normal px-2 py-0.5">Peso</th>
                  <th className="font-normal px-2 py-0.5">RIR</th>
                  <th className="font-normal px-2 py-0.5">Descanso</th>
                  <th className="font-normal px-2 py-0.5">Tempo</th>
                </tr>
              </thead>
              <tbody>
                {elemento.series.map((s, i) => (
                  <tr key={i} className="border-t border-neutral-100">
                    <td className="px-2 py-0.5">{i + 1}</td>
                    <td className="px-2 py-0.5">{s.reps || "—"}</td>
                    <td className="px-2 py-0.5">{s.peso || "—"}</td>
                    <td className="px-2 py-0.5">{s.rir || "—"}</td>
                    <td className="px-2 py-0.5">{s.descanso || "—"}</td>
                    <td className="px-2 py-0.5">{s.tempo || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {elemento.notas && (
            <p className="text-xs text-neutral-600 mt-1 italic">
              {elemento.notas}
            </p>
          )}
        </div>
      );
    }
    case "contenido":
      return (
        <div>
          <div className="font-medium">{elemento.titulo}</div>
          <div className="text-xs text-neutral-700 whitespace-pre-line">
            {elemento.markdown}
          </div>
        </div>
      );
    case "metrica_prompt":
      return (
        <div>
          <span className="font-medium">Registrar métrica:</span>{" "}
          {elemento.metrica_tipo}
        </div>
      );
    case "foto_progreso_prompt":
      return <div className="font-medium">Subir foto de progreso</div>;
    case "pasos_prompt":
      return <div className="font-medium">Registrar pasos del día</div>;
    case "recordatorio":
      return (
        <div>
          <span className="font-medium">Recordatorio ({elemento.hora}):</span>{" "}
          {elemento.mensaje}
        </div>
      );
    case "pdf":
      return (
        <div>
          <span className="font-medium">PDF adjunto:</span> {elemento.titulo}
          {elemento.nombre_archivo && (
            <span className="text-xs text-neutral-500 ml-1">
              ({elemento.nombre_archivo})
            </span>
          )}
        </div>
      );
    case "video":
      return (
        <div>
          <span className="font-medium">Vídeo:</span> {elemento.titulo}
        </div>
      );
    case "video_externo":
      return (
        <div>
          <span className="font-medium">Vídeo {elemento.proveedor}:</span>{" "}
          {elemento.titulo}
        </div>
      );
    case "enlace":
      return (
        <div>
          <span className="font-medium">Enlace:</span> {elemento.titulo}
          {elemento.descripcion && (
            <div className="text-xs text-neutral-600">
              {elemento.descripcion}
            </div>
          )}
        </div>
      );
    default:
      return null;
  }
}

function contarBloques(estructura: EstructuraPrograma): number {
  let n = 0;
  for (const s of estructura) for (const d of s.dias) n += d.bloques.length;
  return n;
}

function contarElementos(estructura: EstructuraPrograma): number {
  let n = 0;
  for (const s of estructura)
    for (const d of s.dias)
      for (const b of d.bloques) n += b.elementos.length;
  return n;
}
