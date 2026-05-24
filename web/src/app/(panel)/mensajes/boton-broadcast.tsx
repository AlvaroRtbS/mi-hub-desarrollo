"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Boton } from "@/components/ui/boton";
import { Campo, Textarea } from "@/components/ui/campo";
import { useToast } from "@/components/ui/toast";
import { enviarMensajeABroadcast } from "./acciones";
import { Send, Users, Check } from "lucide-react";

type ClientaLite = {
  id: string;
  nombre: string;
  apellidos: string | null;
};

export function BotonBroadcast({
  clientas,
}: {
  clientas: ClientaLite[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [abierto, setAbierto] = useState(false);
  const [contenido, setContenido] = useState("");
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [enviando, startTransition] = useTransition();

  function toggle(id: string) {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function todasONinguna() {
    if (seleccionadas.size === clientas.length) {
      setSeleccionadas(new Set());
    } else {
      setSeleccionadas(new Set(clientas.map((c) => c.id)));
    }
  }

  function cerrar() {
    setAbierto(false);
    setSeleccionadas(new Set());
    setContenido("");
  }

  function enviar() {
    if (!contenido.trim()) {
      toast.error("Escribe el mensaje.");
      return;
    }
    if (seleccionadas.size === 0) {
      toast.error("Selecciona al menos una clienta.");
      return;
    }
    const n = seleccionadas.size;
    if (!confirm(`¿Enviar este mensaje a ${n} clienta${n === 1 ? "" : "s"}?`))
      return;
    startTransition(async () => {
      const r = await enviarMensajeABroadcast(
        Array.from(seleccionadas),
        contenido.trim()
      );
      if (!r.ok) {
        toast.error(r.error ?? "Error al enviar");
        return;
      }
      toast.success(
        `Enviado a ${r.enviados} clienta${r.enviados === 1 ? "" : "s"}`
      );
      cerrar();
      router.refresh();
    });
  }

  const todasMarcadas =
    seleccionadas.size > 0 && seleccionadas.size === clientas.length;

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white px-3 py-1.5 rounded border border-neutral-800 hover:border-neutral-700"
        title="Enviar el mismo mensaje a varias clientas a la vez"
      >
        <Users className="size-3.5" />
        Mensaje a varias
      </button>

      <Modal
        abierto={abierto}
        onCerrar={cerrar}
        titulo="Mensaje a varias clientas"
        tamano="md"
      >
        <div className="space-y-4">
          <Campo
            label="Contenido"
            hint="Se enviará tal cual a cada una. La variable {nombre} no se sustituye en broadcast."
          >
            <Textarea
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              placeholder="Escribe el mensaje para todas…"
              rows={4}
              autoFocus
            />
          </Campo>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-neutral-300">
                Destinatarias{" "}
                <span className="text-neutral-500">
                  ({seleccionadas.size}/{clientas.length})
                </span>
              </span>
              <button
                onClick={todasONinguna}
                className="text-xs text-neutral-400 hover:text-white"
              >
                {todasMarcadas ? "Deseleccionar todas" : "Seleccionar todas"}
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto border border-neutral-800 rounded-lg divide-y divide-neutral-900">
              {clientas.map((c) => {
                const sel = seleccionadas.has(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggle(c.id)}
                    className={
                      "w-full flex items-center gap-3 px-3 py-2 text-left transition " +
                      (sel ? "bg-neutral-900" : "hover:bg-neutral-900/50")
                    }
                  >
                    <div
                      className="size-5 rounded grid place-items-center transition"
                      style={
                        sel
                          ? {
                              backgroundColor: "var(--brand)",
                              borderColor: "var(--brand)",
                            }
                          : { border: "2px solid #404040" }
                      }
                    >
                      {sel && <Check className="size-3.5 text-white" />}
                    </div>
                    <span className="text-sm">
                      {c.nombre} {c.apellidos ?? ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
            <button
              onClick={cerrar}
              className="text-sm text-neutral-400 hover:text-white px-3 py-1.5"
            >
              Cancelar
            </button>
            <Boton onClick={enviar} disabled={enviando}>
              <Send className="size-4 mr-1 inline" />
              {enviando
                ? "Enviando…"
                : seleccionadas.size > 0
                  ? `Enviar a ${seleccionadas.size}`
                  : "Enviar"}
            </Boton>
          </div>
        </div>
      </Modal>
    </>
  );
}
