import manualCoach from "@/contenido/manual-administrador.md";
import manualClienta from "@/contenido/manual-clienta.md";
import { VisorTutoriales } from "./visor-tutoriales";

export const metadata = { title: "Tutoriales — mi-hub" };

export default function TutorialesPage() {
  return (
    <div className="p-8 mx-auto max-w-3xl">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Tutoriales</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Cómo usar el panel paso a paso, y la guía que ven tus clientas.
        </p>
      </div>
      <VisorTutoriales manualCoach={manualCoach} manualClienta={manualClienta} />
    </div>
  );
}
