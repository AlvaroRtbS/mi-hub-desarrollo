/**
 * Empty state ilustrado: SVG sutil + título + descripción opcional + CTA opcional.
 * Sustituye los muchos "border-dashed + texto centrado" que hay en la app.
 */

import type { ReactNode } from "react";

type Props = {
  /** Emoji o icono SVG grande que se muestra arriba. */
  icono?: ReactNode;
  titulo: string;
  descripcion?: string;
  /** CTA opcional: botón o link. */
  accion?: ReactNode;
  className?: string;
};

export function EmptyState({
  icono,
  titulo,
  descripcion,
  accion,
  className,
}: Props) {
  return (
    <div
      className={
        "border border-dashed border-neutral-800 rounded-2xl p-12 text-center flex flex-col items-center " +
        (className ?? "")
      }
    >
      {icono ? (
        <div className="text-4xl mb-3 opacity-60">{icono}</div>
      ) : (
        <div className="text-4xl mb-3 opacity-40">✨</div>
      )}
      <div className="text-base font-medium text-neutral-200">{titulo}</div>
      {descripcion && (
        <div className="text-sm text-neutral-500 mt-1.5 max-w-md">
          {descripcion}
        </div>
      )}
      {accion && <div className="mt-5">{accion}</div>}
    </div>
  );
}
