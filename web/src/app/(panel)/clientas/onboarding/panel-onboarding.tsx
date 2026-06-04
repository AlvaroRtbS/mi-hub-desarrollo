"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Link2, Trash2, Sparkles } from "lucide-react";
import { generarInvitacion, revocarInvitacion } from "../[id]/acciones-invitacion";
import { generarInvitacionesLote } from "./acciones";
import { useToast } from "@/components/ui/toast";

type Fila = {
  id: string;
  nombre: string;
  apellidos: string | null;
  activada: boolean;
  token: string | null;
};

export function PanelOnboarding({ filas: filasIniciales }: { filas: Fila[] }) {
  const router = useRouter();
  const toast = useToast();
  const [filas, setFilas] = useState<Fila[]>(filasIniciales);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [trabajando, startTransition] = useTransition();

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://mi-hub-desarrollo.vercel.app";
  const urlDe = (token: string) => `${origin}/i/${token}`;

  const activadas = filas.filter((f) => f.activada).length;
  const sinInvitar = filas.filter((f) => !f.activada && !f.token);
  const pendientes = filas.filter((f) => !f.activada && f.token);

  async function copiar(texto: string, clave: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(clave);
      setTimeout(() => setCopiado(null), 1500);
    } catch {
      toast.error("No se pudo copiar.");
    }
  }

  function generar(id: string) {
    startTransition(async () => {
      const r = await generarInvitacion(id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setFilas((fs) => fs.map((f) => (f.id === id ? { ...f, token: r.token } : f)));
    });
  }

  function revocar(id: string) {
    if (!confirm("¿Revocar el enlace? Si la clienta no ha entrado aún, no podrá usarlo.")) return;
    startTransition(async () => {
      const r = await revocarInvitacion(id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setFilas((fs) => fs.map((f) => (f.id === id ? { ...f, token: null } : f)));
    });
  }

  function generarFaltantes() {
    const ids = sinInvitar.map((f) => f.id);
    if (ids.length === 0) return;
    startTransition(async () => {
      const r = await generarInvitacionesLote(ids);
      toast.success(`${r.generadas} enlace(s) generados.`);
      router.refresh();
    });
  }

  function copiarTodosPendientes() {
    const conToken = filas.filter((f) => !f.activada && f.token);
    if (conToken.length === 0) return;
    const texto = conToken
      .map((f) => `${f.nombre} ${f.apellidos ?? ""}: ${urlDe(f.token!)}`)
      .join("\n");
    copiar(texto, "todos");
  }

  return (
    <div className="space-y-5">
      {/* Resumen */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm text-neutral-300">
          <strong className="text-neutral-100">{activadas}</strong> de{" "}
          <strong className="text-neutral-100">{filas.length}</strong> clientas activadas
        </div>
        {sinInvitar.length > 0 && (
          <button
            onClick={generarFaltantes}
            disabled={trabajando}
            className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-3 py-2 transition"
          >
            <Sparkles className="size-4" /> Generar enlaces que falten ({sinInvitar.length})
          </button>
        )}
        {pendientes.length > 0 && (
          <button
            onClick={copiarTodosPendientes}
            className="inline-flex items-center gap-1.5 border border-neutral-700 hover:bg-neutral-800 text-sm rounded-lg px-3 py-2 transition"
          >
            {copiado === "todos" ? <Check className="size-4 text-green-400" /> : <Copy className="size-4" />}
            Copiar todos los pendientes
          </button>
        )}
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filas.map((f) => (
          <div
            key={f.id}
            className="flex items-center gap-3 border border-neutral-800 rounded-xl px-4 py-3"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {f.nombre} {f.apellidos ?? ""}
              </div>
              <div className="text-xs mt-0.5">
                {f.activada ? (
                  <span className="text-emerald-400">✓ Cuenta activada</span>
                ) : f.token ? (
                  <span className="text-amber-400">Invitada · sin entrar todavía</span>
                ) : (
                  <span className="text-neutral-500">Sin invitar</span>
                )}
              </div>
            </div>

            {!f.activada && (
              <div className="flex items-center gap-1.5 shrink-0">
                {f.token ? (
                  <>
                    <button
                      onClick={() => copiar(urlDe(f.token!), f.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-neutral-700 px-2.5 py-1.5 text-xs hover:bg-neutral-800"
                    >
                      {copiado === f.id ? (
                        <Check className="size-3.5 text-green-400" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                      Copiar enlace
                    </button>
                    <button
                      onClick={() => revocar(f.id)}
                      disabled={trabajando}
                      className="p-1.5 text-neutral-500 hover:text-red-400"
                      aria-label="Revocar"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => generar(f.id)}
                    disabled={trabajando}
                    className="inline-flex items-center gap-1 rounded-lg border border-neutral-700 px-2.5 py-1.5 text-xs hover:bg-neutral-800 disabled:opacity-50"
                  >
                    <Link2 className="size-3.5" /> Generar enlace
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-neutral-500">
        Comparte el enlace con cada clienta (WhatsApp, email…). Al abrirlo crea su cuenta y
        entra a su portal. El enlace caduca; si pasa mucho, vuelve a generarlo.
      </p>
    </div>
  );
}
