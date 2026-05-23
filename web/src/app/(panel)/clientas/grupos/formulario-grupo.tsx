"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";
import { crearGrupo } from "./acciones";

const COLORES = [
  { hex: "#22c55e", nombre: "Verde" },
  { hex: "#3b82f6", nombre: "Azul" },
  { hex: "#a855f7", nombre: "Morado" },
  { hex: "#f97316", nombre: "Naranja" },
  { hex: "#ef4444", nombre: "Rojo" },
  { hex: "#eab308", nombre: "Amarillo" },
  { hex: "#06b6d4", nombre: "Cian" },
  { hex: "#737373", nombre: "Gris" },
];

export function FormularioGrupo() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [color, setColor] = useState(COLORES[0]!.hex);
  const [error, setError] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) {
      setError("Pon un nombre");
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set("nombre", nombre);
    fd.set("color", color);
    startTransition(async () => {
      const r = await crearGrupo(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setNombre("");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={guardar}
      className="border border-neutral-800 rounded-2xl p-4 space-y-3"
    >
      <div className="text-sm font-medium">Nuevo grupo</div>
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Online, Presencial, Grupo L/X..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
          />
        </div>
        <Boton type="submit" disabled={enviando} tamano="md">
          {enviando ? "..." : "Crear"}
        </Boton>
      </div>
      <div className="flex gap-1 flex-wrap">
        {COLORES.map((c) => (
          <button
            key={c.hex}
            type="button"
            onClick={() => setColor(c.hex)}
            className={
              "w-6 h-6 rounded-full border-2 " +
              (color === c.hex ? "border-white" : "border-transparent")
            }
            style={{ backgroundColor: c.hex }}
            title={c.nombre}
          />
        ))}
      </div>
      {error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
    </form>
  );
}
