import Link from "next/link";
import manualClienta from "@/contenido/manual-clienta.md";
import { VisorManual } from "@/components/visor-manual";

export const metadata = { title: "Guía de la app" };

export default function AyudaClientaPage() {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-4 gap-2">
        <h1 className="text-xl font-semibold">Guía de la app</h1>
        <Link href="/c/perfil" className="text-xs text-neutral-400 shrink-0">
          ← Volver
        </Link>
      </div>
      <VisorManual texto={manualClienta} />
    </div>
  );
}
