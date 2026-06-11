"use client";

import { useState } from "react";
import { Markdown } from "@/components/markdown";

type Pestana = "coach" | "clienta";

export function VisorTutoriales({
  manualCoach,
  manualClienta,
}: {
  manualCoach: string;
  manualClienta: string;
}) {
  const [pestana, setPestana] = useState<Pestana>("coach");

  const tabCls = (activa: boolean) =>
    "px-4 py-2 rounded-lg text-sm font-medium border " +
    (activa
      ? "bg-neutral-800 border-neutral-700 text-white"
      : "border-transparent text-neutral-400 hover:text-white hover:bg-neutral-900");

  return (
    <div>
      <div className="flex gap-1 mb-6 sticky top-0 bg-neutral-950/90 backdrop-blur py-2 z-10">
        <button onClick={() => setPestana("coach")} className={tabCls(pestana === "coach")}>
          🧑‍🏫 Manual del coach
        </button>
        <button onClick={() => setPestana("clienta")} className={tabCls(pestana === "clienta")}>
          📱 Manual de la clienta
        </button>
      </div>
      {pestana === "clienta" && (
        <p className="text-xs text-neutral-500 mb-4">
          Esto es exactamente lo que ve una clienta en su apartado de ayuda.
          Útil para resolverle dudas o para reenviárselo.
        </p>
      )}
      <Markdown texto={pestana === "coach" ? manualCoach : manualClienta} />
    </div>
  );
}
