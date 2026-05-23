"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";

export function BotonCargarDemo() {
  const router = useRouter();
  const [estado, setEstado] = useState<"idle" | "cargando" | "ok" | "error">("idle");
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function cargar() {
    setEstado("cargando");
    setMensaje(null);
    try {
      const r = await fetch("/api/seed/demo", { method: "POST" });
      const data = await r.json();
      if (!data.ok) {
        setEstado("error");
        setMensaje(data.error ?? "Error desconocido");
        return;
      }
      setEstado("ok");
      setMensaje("Datos demo cargados ✓");
      router.refresh();
    } catch (e) {
      setEstado("error");
      setMensaje(e instanceof Error ? e.message : "Error de red");
    }
  }

  async function borrar() {
    if (!confirm("¿Borrar TODOS los datos demo (clientas, programa, ejercicios)?")) return;
    setEstado("cargando");
    try {
      await fetch("/api/seed/demo", { method: "DELETE" });
      setEstado("ok");
      setMensaje("Datos demo borrados");
      router.refresh();
    } catch (e) {
      setEstado("error");
      setMensaje(e instanceof Error ? e.message : "Error de red");
    }
  }

  return (
    <div className="border border-dashed border-neutral-800 rounded-2xl p-6 text-center">
      <div className="text-sm font-medium mb-1">Empezar con datos de demo</div>
      <div className="text-xs text-neutral-500 mb-4 max-w-md mx-auto">
        Carga 3 clientas ficticias con un programa asignado, sesiones, métricas y
        mensajes. Te permite ver todo el flujo de la app sin tener que meter datos.
        Puedes borrarlos en un click cuando quieras.
      </div>
      <div className="flex items-center justify-center gap-2">
        <Boton onClick={cargar} disabled={estado === "cargando"}>
          {estado === "cargando" ? "Cargando..." : "🌱 Cargar clientas de demo"}
        </Boton>
        <button
          onClick={borrar}
          disabled={estado === "cargando"}
          className="text-xs text-neutral-500 hover:text-red-400"
        >
          Borrar demo
        </button>
      </div>
      {mensaje && (
        <div
          className={
            "text-xs mt-3 " +
            (estado === "ok" ? "text-green-400" : estado === "error" ? "text-red-400" : "text-neutral-500")
          }
        >
          {mensaje}
        </div>
      )}
    </div>
  );
}
