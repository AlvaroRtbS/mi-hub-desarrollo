"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";
import { Campo, Input, Textarea } from "@/components/ui/campo";
import { ChipsMultiseleccion } from "@/components/ui/chips-multiseleccion";
import { SubirArchivo } from "@/components/ui/subir-archivo";
import { GRUPOS_MUSCULARES, MATERIAL, type Ejercicio } from "@/lib/supabase/tipos";
import type { ResultadoAccion } from "./acciones";

type Props = {
  ejercicio?: Ejercicio;
  coachId: string;
  accion: (formData: FormData) => Promise<ResultadoAccion>;
  textoBoton: string;
};

export function FormularioEjercicio({ ejercicio, coachId, accion, textoBoton }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setEnviando(true);

    const formData = new FormData(e.currentTarget);
    const r = await accion(formData);
    setEnviando(false);

    if (!r.ok) {
      setError(r.error);
      return;
    }
    router.push("/ejercicios");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-3xl">
      <Campo label="Nombre">
        <Input
          name="nombre"
          required
          defaultValue={ejercicio?.nombre ?? ""}
          placeholder='Ej: (Peso corporal) Sentadilla al aire'
        />
      </Campo>

      <Campo label="Descripción corta" hint="Una línea que se vea en la lista.">
        <Input
          name="descripcion"
          defaultValue={ejercicio?.descripcion ?? ""}
          placeholder="Sentadilla básica sin peso"
        />
      </Campo>

      <Campo label="Instrucciones de técnica">
        <Textarea
          name="instrucciones"
          rows={5}
          defaultValue={ejercicio?.instrucciones ?? ""}
          placeholder="Pies anchura de cadera, peso en talones, baja como sentándote en una silla..."
        />
      </Campo>

      <Campo label="Grupos musculares">
        <ChipsMultiseleccion
          nombre="grupos_musculares"
          opciones={GRUPOS_MUSCULARES}
          valorInicial={ejercicio?.grupos_musculares ?? []}
        />
      </Campo>

      <Campo label="Material">
        <ChipsMultiseleccion
          nombre="material"
          opciones={MATERIAL}
          valorInicial={ejercicio?.material ?? []}
        />
      </Campo>

      <Campo label="Vídeo demostrativo" hint="MP4 o WebM, hasta 100 MB.">
        <SubirArchivo
          bucket="ejercicios-videos"
          accept="video/mp4,video/webm,video/quicktime"
          coachId={coachId}
          nombre="video_url"
          valorInicial={ejercicio?.video_url ?? null}
          descripcion="Se subirá a tu almacenamiento privado en Supabase."
        />
      </Campo>

      <Campo label="Imagen / thumbnail" hint="JPG, PNG o WebP, hasta 10 MB.">
        <SubirArchivo
          bucket="ejercicios-imagenes"
          accept="image/jpeg,image/png,image/webp"
          coachId={coachId}
          nombre="imagen_url"
          valorInicial={ejercicio?.imagen_url ?? null}
          descripcion="Se mostrará en la lista de ejercicios."
        />
      </Campo>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Boton type="submit" disabled={enviando}>
          {enviando ? "Guardando..." : textoBoton}
        </Boton>
        <Boton variante="secundario" href="/ejercicios">
          Cancelar
        </Boton>
      </div>
    </form>
  );
}
