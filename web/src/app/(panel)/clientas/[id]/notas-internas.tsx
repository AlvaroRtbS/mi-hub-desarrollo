"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";
import { crearNotaInterna, eliminarNotaInterna } from "./acciones-notas";

type Nota = {
  id: string;
  contenido: string;
  creada_en: string;
};

function formatearRelativo(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

export function NotasInternas({
  clientaId,
  notasIniciales,
}: {
  clientaId: string;
  notasIniciales: Nota[];
}) {
  const router = useRouter();
  const [borrador, setBorrador] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();

  function añadir(e: React.FormEvent) {
    e.preventDefault();
    if (!borrador.trim()) return;
    setError(null);
    const texto = borrador;
    setBorrador("");
    startTransition(async () => {
      const r = await crearNotaInterna(clientaId, texto);
      if (!r.ok) {
        setError(r.error);
        setBorrador(texto);
        return;
      }
      router.refresh();
    });
  }

  function quitar(id: string) {
    if (!confirm("¿Eliminar esta nota?")) return;
    startTransition(async () => {
      await eliminarNotaInterna(id, clientaId);
      router.refresh();
    });
  }

  return (
    <div>
      <form onSubmit={añadir} className="mb-3">
        <textarea
          value={borrador}
          onChange={(e) => setBorrador(e.target.value)}
          placeholder="Anota algo sobre esta clienta (solo tú lo verás)..."
          rows={2}
          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 resize-y"
        />
        <div className="flex justify-end mt-2">
          <Boton type="submit" tamano="sm" disabled={enviando || !borrador.trim()}>
            {enviando ? "..." : "Añadir nota"}
          </Boton>
        </div>
      </form>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2 mb-3">
          {error}
        </div>
      )}

      {notasIniciales.length === 0 ? (
        <div className="text-xs text-neutral-600 italic">Sin notas internas aún.</div>
      ) : (
        <ul className="space-y-2">
          {notasIniciales.map((n) => (
            <li
              key={n.id}
              className="bg-neutral-900/50 border border-neutral-800 rounded-lg px-3 py-2 group"
            >
              <div className="text-sm text-neutral-200 whitespace-pre-wrap">
                {n.contenido}
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <div className="text-[10px] text-neutral-600">
                  {formatearRelativo(n.creada_en)}
                </div>
                <button
                  onClick={() => quitar(n.id)}
                  className="text-[10px] text-neutral-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
