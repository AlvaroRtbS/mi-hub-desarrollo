import { Check } from "lucide-react";

export type ItemChecklist = {
  clave: string;
  label: string;
  icono: string;
  /** true = hecho, false = pendiente, null = informativo (sin estado). */
  hecho: boolean | null;
  href?: string;
};

/**
 * #6 — Checklist diario "qué hago hoy". Solo muestra lo que aplica al día
 * (entreno si toca, pasos/foto si el plan los pide, comidas si hay plan).
 * La guía sin que tenga que pensar qué hacer.
 */
export function ChecklistHoy({ items }: { items: ItemChecklist[] }) {
  const visibles = items.filter(Boolean);
  if (visibles.length === 0) return null;

  const pendientes = visibles.filter((i) => i.hecho === false).length;

  return (
    <div className="border border-neutral-800 rounded-2xl p-4 bg-neutral-950 mb-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-medium">Qué hago hoy</h2>
        <span className="text-xs text-neutral-500">
          {pendientes === 0 ? "¡todo hecho! 🎉" : `${pendientes} pendiente${pendientes === 1 ? "" : "s"}`}
        </span>
      </div>
      <ul className="space-y-1.5">
        {visibles.map((it) => {
          const contenido = (
            <>
              <span
                className={
                  "size-5 rounded-full border flex items-center justify-center shrink-0 " +
                  (it.hecho === true
                    ? "border-transparent text-white"
                    : it.hecho === false
                      ? "border-neutral-700 text-transparent"
                      : "border-neutral-800 text-neutral-600")
                }
                style={it.hecho === true ? { backgroundColor: "var(--brand)" } : undefined}
              >
                {it.hecho === true ? <Check className="size-3.5" /> : it.hecho === null ? "·" : ""}
              </span>
              <span className="text-lg leading-none">{it.icono}</span>
              <span
                className={
                  "text-sm flex-1 " +
                  (it.hecho === true ? "text-neutral-500 line-through" : "text-neutral-100")
                }
              >
                {it.label}
              </span>
              {it.href && it.hecho !== true && (
                <span className="text-xs text-neutral-600">→</span>
              )}
            </>
          );
          const clase =
            "flex items-center gap-2.5 px-2 py-1.5 -mx-2 rounded-lg" +
            (it.href ? " hover:bg-neutral-900/60 transition" : "");
          return (
            <li key={it.clave}>
              {it.href ? (
                <a href={it.href} className={clase}>
                  {contenido}
                </a>
              ) : (
                <div className={clase}>{contenido}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
