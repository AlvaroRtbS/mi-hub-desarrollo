"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  asignarClientaAGrupo,
  quitarClientaDeGrupo,
} from "../grupos/acciones";

type Grupo = { id: string; nombre: string; color: string | null };

export function GruposClienta({
  clientaId,
  asignados,
  todos,
}: {
  clientaId: string;
  asignados: Grupo[];
  todos: Grupo[];
}) {
  const router = useRouter();
  const [eligiendo, setEligiendo] = useState(false);
  const [, startTransition] = useTransition();

  const asignadosIds = new Set(asignados.map((g) => g.id));
  const disponibles = todos.filter((g) => !asignadosIds.has(g.id));

  function añadir(grupoId: string) {
    startTransition(async () => {
      await asignarClientaAGrupo(clientaId, grupoId);
      router.refresh();
    });
    setEligiendo(false);
  }

  function quitar(grupoId: string) {
    startTransition(async () => {
      await quitarClientaDeGrupo(clientaId, grupoId);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {asignados.map((g) => (
        <span
          key={g.id}
          className="inline-flex items-center gap-1 text-xs bg-neutral-900 border border-neutral-800 rounded-full pl-2 pr-1 py-0.5 group"
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: g.color ?? "#737373" }}
          />
          <span className="text-neutral-300">{g.nombre}</span>
          <button
            onClick={() => quitar(g.id)}
            className="text-neutral-600 hover:text-red-400 ml-1"
            title="Quitar de este grupo"
          >
            ✕
          </button>
        </span>
      ))}

      <div className="relative">
        <button
          onClick={() => setEligiendo((v) => !v)}
          className="text-xs text-neutral-500 hover:text-neutral-300 border border-dashed border-neutral-700 rounded-full px-2 py-0.5"
        >
          + Grupo
        </button>
        {eligiendo && (
          <>
            <button
              onClick={() => setEligiendo(false)}
              className="fixed inset-0 z-10 cursor-default"
              aria-label="Cerrar"
            />
            <div className="absolute z-20 mt-1 left-0 bg-neutral-950 border border-neutral-800 rounded-lg shadow-xl py-1 min-w-[180px]">
              {disponibles.length === 0 ? (
                <div className="px-3 py-2 text-xs text-neutral-500">
                  {todos.length === 0 ? (
                    <>
                      No tienes grupos.{" "}
                      <Link href="/clientas/grupos" className="text-brand-500">
                        Crear uno
                      </Link>
                    </>
                  ) : (
                    "Ya está en todos los grupos."
                  )}
                </div>
              ) : (
                disponibles.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => añadir(g.id)}
                    className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm hover:bg-neutral-900"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: g.color ?? "#737373" }}
                    />
                    <span className="text-neutral-200">{g.nombre}</span>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
