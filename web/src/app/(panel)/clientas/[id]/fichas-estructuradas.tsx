"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";
import { guardarFicha, TIPOS_FICHA, type TipoFicha } from "./acciones-fichas";

type Ficha = {
  tipo: TipoFicha;
  contenido: string;
  actualizada_en: string | null;
};

export function FichasEstructuradas({
  clientaId,
  fichas,
}: {
  clientaId: string;
  fichas: Ficha[];
}) {
  const porTipo = new Map(fichas.map((f) => [f.tipo, f]));

  return (
    <div className="space-y-3">
      {TIPOS_FICHA.map((t) => (
        <FichaBloque
          key={t.id}
          clientaId={clientaId}
          tipo={t.id}
          label={t.label}
          emoji={t.emoji}
          ficha={porTipo.get(t.id) ?? null}
        />
      ))}
    </div>
  );
}

function FichaBloque({
  clientaId,
  tipo,
  label,
  emoji,
  ficha,
}: {
  clientaId: string;
  tipo: TipoFicha;
  label: string;
  emoji: string;
  ficha: Ficha | null;
}) {
  const router = useRouter();
  const tieneContenido = !!ficha?.contenido.trim();
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState(false);
  const [contenido, setContenido] = useState(ficha?.contenido ?? "");
  const [error, setError] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();

  function guardar() {
    setError(null);
    startTransition(async () => {
      const r = await guardarFicha(clientaId, tipo, contenido);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setEditando(false);
      router.refresh();
    });
  }

  function cancelar() {
    setContenido(ficha?.contenido ?? "");
    setEditando(false);
    setError(null);
  }

  return (
    <div className="border border-neutral-800 rounded-xl bg-neutral-950 overflow-hidden">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-900/50 transition text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg leading-none">{emoji}</span>
          <span className="text-sm font-medium">{label}</span>
          {!tieneContenido && (
            <span className="text-[10px] text-neutral-600 uppercase tracking-wide">
              Vacío
            </span>
          )}
        </div>
        <span className="text-neutral-500 text-xs">{abierto ? "▾" : "▸"}</span>
      </button>

      {abierto && (
        <div className="px-4 pb-4 pt-1 border-t border-neutral-900">
          {!editando ? (
            <>
              {tieneContenido ? (
                <div className="text-sm whitespace-pre-wrap text-neutral-200 mb-2">
                  {ficha!.contenido}
                </div>
              ) : (
                <div className="text-xs text-neutral-600 italic mb-2">
                  Aún no has rellenado este apartado.
                </div>
              )}
              <button
                onClick={() => setEditando(true)}
                className="text-xs text-brand-500 hover:text-brand-400"
              >
                {tieneContenido ? "Editar" : "Rellenar"}
              </button>
            </>
          ) : (
            <>
              <textarea
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
                rows={6}
                placeholder={placeholderPorTipo(tipo)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 resize-y"
                autoFocus
              />
              {error && (
                <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2 mt-2">
                  {error}
                </div>
              )}
              <div className="flex gap-2 justify-end mt-2">
                <Boton
                  tamano="sm"
                  variante="secundario"
                  onClick={cancelar}
                  disabled={enviando}
                >
                  Cancelar
                </Boton>
                <Boton tamano="sm" onClick={guardar} disabled={enviando}>
                  {enviando ? "Guardando..." : "Guardar"}
                </Boton>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function placeholderPorTipo(tipo: TipoFicha): string {
  switch (tipo) {
    case "anamnesis":
      return "Edad, condiciones médicas, embarazos, cirugías, medicación, antecedentes familiares...";
    case "lesiones":
      return "Lesiones activas o crónicas, dolores, restricciones de movimiento, recomendaciones del fisio...";
    case "preferencias_alimentarias":
      return "Alergias, intolerancias, dieta (omnívora/vegetariana/vegana), comidas favoritas, las que detesta...";
    case "historial_deportivo":
      return "Deportes practicados, nivel inicial, experiencia en gimnasio, cuánto tiempo lleva sin entrenar...";
    case "disponibilidad":
      return "Días y franjas horarias en que puede entrenar, días que prefiere descanso, viajes habituales...";
  }
}
