import { createSupabaseServerClient } from "@/lib/supabase/server";

function diaCorto(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export async function PasosRecientes({ clientaId }: { clientaId: string }) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("pasos_diarios")
    .select("fecha, pasos, fuente")
    .eq("clienta_id", clientaId)
    .order("fecha", { ascending: false })
    .limit(14);

  const dias = (data ?? []) as Array<{
    fecha: string;
    pasos: number;
    fuente: string | null;
  }>;

  if (dias.length === 0) return null;

  const ult7 = dias.slice(0, 7);
  const media = Math.round(ult7.reduce((a, d) => a + d.pasos, 0) / ult7.length);
  const max = Math.max(1, ...ult7.map((d) => d.pasos));

  return (
    <div className="border border-neutral-800 rounded-2xl p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-medium">👣 Pasos diarios</h3>
        <div className="text-sm text-neutral-400">
          media 7 días:{" "}
          <strong className="text-neutral-200">
            {media.toLocaleString("es-ES")}
          </strong>
        </div>
      </div>

      <div className="flex items-end justify-between gap-1.5 h-24">
        {[...ult7].reverse().map((d) => (
          <div key={d.fecha} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] text-neutral-500">
              {(d.pasos / 1000).toFixed(1)}k
            </span>
            <div
              className="w-full rounded-t bg-brand-600/60"
              style={{ height: `${Math.max(4, (d.pasos / max) * 64)}px` }}
              title={`${d.pasos.toLocaleString("es-ES")} pasos`}
            />
            <span className="text-[9px] text-neutral-600 text-center leading-tight">
              {diaCorto(d.fecha).split(" ").slice(0, 2).join(" ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
