"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CHECKIN_SEMANAL } from "@/lib/checkin";
import { guardarCheckin } from "./acciones";
import { Confetti } from "@/components/confetti";
import { useToast } from "@/components/ui/toast";

export function CheckinForm({
  semana,
  respuestasIniciales,
  yaHecho,
}: {
  semana: string;
  respuestasIniciales: Record<string, string>;
  yaHecho: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [resp, setResp] = useState<Record<string, string>>(respuestasIniciales);
  const [error, setError] = useState<string | null>(null);
  const [celebrar, setCelebrar] = useState(false);
  const [enviando, startTransition] = useTransition();

  function set(id: string, v: string) {
    setResp((r) => ({ ...r, [id]: v }));
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await guardarCheckin(semana, resp);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setCelebrar(true);
      setTimeout(() => setCelebrar(false), 3000);
      toast.success("Check-in enviado ✓");
      router.refresh();
    });
  }

  return (
    <form onSubmit={enviar} className="space-y-5">
      <Confetti trigger={celebrar} cantidad={40} duracion={2000} />
      {CHECKIN_SEMANAL.preguntas.map((p) => (
        <div key={p.id}>
          <span className="block text-sm font-medium text-neutral-200 mb-1.5">
            {p.label}
          </span>
          {p.tipo === "parrafo" && (
            <textarea
              value={resp[p.id] ?? ""}
              onChange={(e) => set(p.id, e.target.value)}
              placeholder={p.placeholder}
              rows={3}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 resize-y"
            />
          )}
          {p.tipo === "numero" && (
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                value={resp[p.id] ?? ""}
                onChange={(e) => set(p.id, e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
              />
              {p.sufijo && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">
                  {p.sufijo}
                </span>
              )}
            </div>
          )}
          {p.tipo === "escala" && (
            <div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => {
                  const sel = resp[p.id] === String(n);
                  return (
                    <button
                      type="button"
                      key={n}
                      onClick={() => set(p.id, String(n))}
                      className={
                        "flex-1 h-11 rounded-lg border text-sm font-semibold transition " +
                        (sel
                          ? "text-white border-transparent"
                          : "border-neutral-800 text-neutral-300 hover:bg-neutral-900")
                      }
                      style={sel ? { backgroundColor: "var(--brand)" } : undefined}
                      aria-pressed={sel}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
                <span>{p.etiquetaMin}</span>
                <span>{p.etiquetaMax}</span>
              </div>
            </div>
          )}
        </div>
      ))}

      {error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2.5 transition"
      >
        {enviando
          ? "Enviando…"
          : yaHecho
            ? "Actualizar check-in"
            : "Enviar check-in"}
      </button>
    </form>
  );
}
