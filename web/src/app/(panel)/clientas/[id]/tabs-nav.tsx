import Link from "next/link";

export type TabClienta =
  | "resumen"
  | "adherencia"
  | "metricas"
  | "objetivos"
  | "notas";

const TABS: Array<{ valor: TabClienta; label: string }> = [
  { valor: "resumen", label: "Resumen" },
  { valor: "adherencia", label: "Adherencia" },
  { valor: "metricas", label: "Métricas" },
  { valor: "objetivos", label: "Objetivos" },
  { valor: "notas", label: "Notas" },
];

export function TabsNav({
  clientaId,
  tabActiva,
}: {
  clientaId: string;
  tabActiva: TabClienta;
}) {
  return (
    <nav className="border-b border-neutral-800 flex gap-1 overflow-x-auto">
      {TABS.map((t) => {
        const activa = t.valor === tabActiva;
        const href =
          t.valor === "resumen"
            ? `/clientas/${clientaId}`
            : `/clientas/${clientaId}?tab=${t.valor}`;
        return (
          <Link
            key={t.valor}
            href={href}
            scroll={false}
            className={
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition " +
              (activa
                ? "border-brand-500 text-white"
                : "border-transparent text-neutral-400 hover:text-neutral-200")
            }
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
