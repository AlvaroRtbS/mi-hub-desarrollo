// Tarjeta motivadora "Tu evolución": junta los titulares del progreso de la
// clienta (kg, cintura, entrenos) + foto antes/ahora. Componente de servidor
// (sin estado); los datos se calculan en la página de Medidas.

import Link from "next/link";

type Props = {
  pesoDelta: number | null;
  pesoUnidad: string;
  cinturaDelta: number | null;
  cinturaUnidad: string;
  entrenos: number;
  fotoAntes: { url: string; fecha: string } | null;
  fotoAhora: { url: string; fecha: string } | null;
};

export function ResumenEvolucion({
  pesoDelta,
  pesoUnidad,
  cinturaDelta,
  cinturaUnidad,
  entrenos,
  fotoAntes,
  fotoAhora,
}: Props) {
  const hayFotos = !!(fotoAntes && fotoAhora && fotoAntes.url !== fotoAhora.url);
  const hayAlgo = pesoDelta !== null || cinturaDelta !== null || entrenos > 0 || hayFotos;
  if (!hayAlgo) {
    return (
      <div
        className="rounded-2xl border border-brand-900/40 p-4 mb-5"
        style={{
          backgroundImage:
            "radial-gradient(120% 100% at 0% 0%, color-mix(in srgb, var(--brand) 18%, transparent) 0%, transparent 60%)",
          backgroundColor: "#0a0a0a",
        }}
      >
        <div className="text-xs uppercase tracking-wide text-brand-400 mb-1">
          Tu evolución 📈
        </div>
        <p className="text-sm text-neutral-400">
          Registra tu peso o sube una foto y aquí verás tu progreso: cuánto has
          avanzado desde que empezaste. 💜
        </p>
      </div>
    );
  }

  const bajoPeso = pesoDelta !== null && pesoDelta < 0;

  return (
    <div
      className="rounded-2xl border border-brand-900/40 p-4 mb-5"
      style={{
        backgroundImage:
          "radial-gradient(120% 100% at 0% 0%, color-mix(in srgb, var(--brand) 18%, transparent) 0%, transparent 60%)",
        backgroundColor: "#0a0a0a",
      }}
    >
      <div className="text-xs uppercase tracking-wide text-brand-400 mb-2">
        Tu evolución 📈
      </div>

      {/* Titular: peso */}
      {pesoDelta !== null && (
        <div className="mb-3">
          <div
            className={`text-3xl font-bold ${bajoPeso ? "text-green-400" : "text-neutral-100"}`}
          >
            {pesoDelta > 0 ? "+" : ""}
            {pesoDelta.toFixed(1)} {pesoUnidad}
          </div>
          <div className="text-xs text-neutral-400">
            {bajoPeso ? "menos desde que empezaste 🎉" : "de cambio desde que empezaste"}
          </div>
        </div>
      )}

      {/* Mini-stats */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {cinturaDelta !== null && (
          <span className="text-neutral-300">
            Cintura{" "}
            <strong className={cinturaDelta < 0 ? "text-green-400" : "text-neutral-200"}>
              {cinturaDelta > 0 ? "+" : ""}
              {cinturaDelta.toFixed(1)} {cinturaUnidad}
            </strong>
          </span>
        )}
        {entrenos > 0 && (
          <span className="text-neutral-300">
            <strong className="text-neutral-100">{entrenos}</strong>{" "}
            {entrenos === 1 ? "entreno completado" : "entrenos completados"}
          </span>
        )}
      </div>

      {/* Foto antes / ahora */}
      {hayFotos && (
        <div className="mt-4">
          <div className="grid grid-cols-2 gap-2">
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fotoAntes!.url}
                alt="Antes"
                className="w-full aspect-[3/4] object-cover rounded-lg border border-neutral-800"
              />
              <figcaption className="text-[10px] text-neutral-500 mt-1 text-center">Antes</figcaption>
            </figure>
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fotoAhora!.url}
                alt="Ahora"
                className="w-full aspect-[3/4] object-cover rounded-lg border border-neutral-800"
              />
              <figcaption className="text-[10px] text-neutral-500 mt-1 text-center">Ahora</figcaption>
            </figure>
          </div>
          <Link href="/c/fotos" className="block text-center text-xs text-brand-500 mt-2">
            Ver todas tus fotos →
          </Link>
        </div>
      )}
    </div>
  );
}
