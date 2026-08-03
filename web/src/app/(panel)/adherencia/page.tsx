import { obtenerAdherenciaTS, semaforoDe, type Semaforo } from "@/lib/trainerstudio";
import { BotonCopiarMensaje } from "./boton-copiar";

export const dynamic = "force-dynamic";

const ESTILO: Record<
  Semaforo,
  { punto: string; barra: string; etiqueta: string }
> = {
  rojo: { punto: "bg-red-500", barra: "bg-red-500", etiqueta: "En riesgo" },
  ambar: { punto: "bg-amber-400", barra: "bg-amber-400", etiqueta: "A vigilar" },
  verde: { punto: "bg-emerald-500", barra: "bg-emerald-500", etiqueta: "Bien" },
};

function Barra({ valor, color }: { valor: number | null; color: string }) {
  const v = Math.max(0, Math.min(100, valor ?? 0));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full rounded-full bg-neutral-800 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${v}%` }} />
      </div>
      <span className="text-xs tabular-nums text-neutral-400 w-9 text-right">
        {valor ?? "—"}%
      </span>
    </div>
  );
}

export default async function AdherenciaPage() {
  const clientas = await obtenerAdherenciaTS();

  if (clientas === null) {
    return (
      <div className="p-4 pt-16 md:p-8 mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold">Adherencia</h1>
        <div className="mt-6 rounded-xl border border-amber-900/50 bg-amber-950/30 p-5 text-sm text-amber-200">
          No se pudo consultar Trainer Studio. Si es la primera vez que ves esto,
          probablemente falta la variable <code className="font-mono">TS_API_KEY</code>{" "}
          en Vercel (Settings → Environment Variables) o la API key fue revocada.
        </div>
      </div>
    );
  }

  const enRiesgo = clientas.filter((c) => semaforoDe(c.adherencia30d) === "rojo");
  const resumen: Record<Semaforo, number> = { rojo: 0, ambar: 0, verde: 0 };
  clientas.forEach((c) => resumen[semaforoDe(c.adherencia30d)]++);

  return (
    <div className="p-4 pt-16 md:p-8 mx-auto max-w-4xl">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Adherencia</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Cumplimiento de entrenos en Trainer Studio (últimos 30 días manda).
            Datos con hasta 30 min de retardo.
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> {resumen.rojo}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> {resumen.ambar}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> {resumen.verde}
          </span>
        </div>
      </div>

      {enRiesgo.length > 0 && (
        <div className="mt-5 rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-200">
          🚨 {enRiesgo.length}{" "}
          {enRiesgo.length === 1 ? "clienta necesita" : "clientas necesitan"} un
          mensaje de rescate: {enRiesgo.map((c) => c.nombre.split(" ")[0]).join(", ")}.
        </div>
      )}

      {/* overflow-x-auto y no overflow-hidden: con 5 columnas de ancho fijo la
          tabla no cabe en un móvil, y "hidden" recortaba las columnas de 30 y
          90 días sin dejar forma de verlas. min-w fuerza el scroll en vez de
          apelotonar el texto. */}
      <div className="mt-6 rounded-xl border border-neutral-800 overflow-x-auto">
        <table className="w-full min-w-[38rem] text-sm">
          <thead>
            <tr className="bg-neutral-900/60 text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-4 py-2.5 font-medium">Clienta</th>
              <th className="px-4 py-2.5 font-medium w-32">7 días</th>
              <th className="px-4 py-2.5 font-medium w-32">30 días</th>
              <th className="px-4 py-2.5 font-medium w-32">90 días</th>
              <th className="px-4 py-2.5 font-medium w-28"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/70">
            {clientas.map((c) => {
              const sem = semaforoDe(c.adherencia30d);
              const st = ESTILO[sem];
              return (
                <tr key={c.id} className="hover:bg-neutral-900/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${st.punto}`}
                        title={st.etiqueta}
                      />
                      <span className="text-neutral-100 font-medium">{c.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Barra valor={c.adherencia7d} color={st.barra} />
                  </td>
                  <td className="px-4 py-3">
                    <Barra valor={c.adherencia30d} color={st.barra} />
                  </td>
                  <td className="px-4 py-3">
                    <Barra valor={c.adherencia90d} color={st.barra} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {sem !== "verde" && (
                      <BotonCopiarMensaje nombre={c.nombre.split(" ")[0]} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-neutral-600">
        Fuente: API de Trainer Studio. Umbrales: rojo &lt;40 %, ámbar 40-74 %,
        verde ≥75 % (sobre 30 días). El botón «Mensaje» copia un borrador de
        rescate listo para pegar en WhatsApp.
      </p>
    </div>
  );
}
