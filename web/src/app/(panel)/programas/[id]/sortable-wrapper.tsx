"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

/**
 * Envuelve un item sortable (bloque o elemento) y expone un `handle` que es
 * el único punto donde se activa el drag. El resto del contenido sigue siendo
 * libre (inputs, botones), por lo que se puede teclear sin interferencias.
 *
 * Patrón render-prop para que el componente padre coloque el handle donde
 * mejor le venga visualmente.
 */
export function SortableWrapper({
  id,
  children,
  className,
}: {
  id: string;
  className?: string;
  children: (handle: React.ReactNode) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: isDragging ? "relative" : undefined,
  };

  const handle = (
    <button
      ref={setActivatorNodeRef}
      {...listeners}
      {...attributes}
      type="button"
      tabIndex={-1}
      className="cursor-grab active:cursor-grabbing text-neutral-600 hover:text-neutral-300 px-1 -ml-1 touch-none select-none"
      aria-label="Arrastrar para reordenar"
      title="Arrastrar para reordenar"
    >
      <GripVertical size={14} />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        (className ?? "") +
        (isDragging
          ? " opacity-60 ring-2 ring-brand-500/40 rounded-2xl shadow-lg"
          : "")
      }
    >
      {children(handle)}
    </div>
  );
}
