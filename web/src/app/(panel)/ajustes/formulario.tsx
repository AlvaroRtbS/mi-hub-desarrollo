"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Boton } from "@/components/ui/boton";
import { Campo, Input, Textarea } from "@/components/ui/campo";
import { useToast } from "@/components/ui/toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { Check } from "lucide-react";

type CoachData = {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  bio: string;
  foto_url: string | null;
  marca_nombre: string;
  marca_color_primario: string;
  marca_logo_url: string | null;
};

const COLORES_PRESET = [
  { name: "Verde (defecto)", value: "#16a34a" },
  { name: "Esmeralda", value: "#10b981" },
  { name: "Azul", value: "#3b82f6" },
  { name: "Índigo", value: "#6366f1" },
  { name: "Violeta", value: "#8b5cf6" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Coral", value: "#f43f5e" },
  { name: "Naranja", value: "#f97316" },
  { name: "Ámbar", value: "#f59e0b" },
  { name: "Cian", value: "#06b6d4" },
];

export function FormularioAjustes({ coach }: { coach: CoachData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  const supabase = createSupabaseBrowserClient();

  const [nombre, setNombre] = useState(coach.nombre);
  const [telefono, setTelefono] = useState(coach.telefono);
  const [bio, setBio] = useState(coach.bio);
  const [marcaNombre, setMarcaNombre] = useState(coach.marca_nombre);
  const [color, setColor] = useState(coach.marca_color_primario);
  const [logoUrl, setLogoUrl] = useState<string | null>(coach.marca_logo_url);
  const [subiendoLogo, setSubiendoLogo] = useState(false);

  async function subirLogo(file: File) {
    setSubiendoLogo(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${coach.id}/marca_logo_${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("coach-avatares")
        .upload(path, file, { upsert: true });
      if (error) {
        toast.error(`Error subiendo logo: ${error.message}`);
        return;
      }
      const { data: pub } = supabase.storage
        .from("coach-avatares")
        .getPublicUrl(path);
      setLogoUrl(pub.publicUrl);
      toast.success("Logo subido");
    } finally {
      setSubiendoLogo(false);
    }
  }

  function guardar() {
    startTransition(async () => {
      const { error } = await supabase
        .from("coaches")
        .update({
          nombre: nombre.trim(),
          telefono: telefono.trim() || null,
          bio: bio.trim() || null,
          marca_nombre: marcaNombre.trim() || null,
          marca_color_primario: color || null,
          marca_logo_url: logoUrl,
        })
        .eq("id", coach.id);
      if (error) {
        toast.error(`No se pudo guardar: ${error.message}`);
        return;
      }
      toast.success("Ajustes guardados");
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      {/* PERFIL */}
      <section className="bg-neutral-900/40 border border-neutral-800 rounded-lg p-5 space-y-4">
        <h2 className="font-semibold">Tu perfil</h2>

        <Campo label="Email">
          <Input value={coach.email} disabled className="opacity-60" />
        </Campo>

        <Campo label="Nombre completo">
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre"
          />
        </Campo>

        <Campo label="Teléfono" hint="Opcional. No se muestra públicamente.">
          <Input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="+34 ..."
          />
        </Campo>

        <Campo
          label="Bio"
          hint="Aparece en tu página pública de invitación a clientas."
        >
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Soy entrenador especializado en…"
            rows={3}
          />
        </Campo>
      </section>

      {/* MARCA */}
      <section className="bg-neutral-900/40 border border-neutral-800 rounded-lg p-5 space-y-4">
        <div>
          <h2 className="font-semibold">Marca</h2>
          <p className="text-xs text-neutral-500 mt-1">
            Personaliza cómo te ven tus clientas en la app y en los PDFs/enlaces que les envíes.
          </p>
        </div>

        <Campo
          label="Nombre de la marca"
          hint="Si lo dejas vacío, se usa tu nombre."
        >
          <Input
            value={marcaNombre}
            onChange={(e) => setMarcaNombre(e.target.value)}
            placeholder="p. ej. Strong Mom Coaching"
          />
        </Campo>

        <Campo
          label="Logo"
          hint="Imagen cuadrada, máx 5 MB. Se muestra en la cabecera de los PDFs y en la app de clientas."
        >
          <div className="flex items-center gap-4">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Logo"
                className="size-16 rounded object-cover bg-white border border-neutral-800"
              />
            ) : (
              <div className="size-16 rounded border border-dashed border-neutral-700 grid place-items-center text-xs text-neutral-500">
                Sin logo
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label className="inline-flex items-center text-xs px-3 py-1.5 rounded border border-neutral-700 hover:bg-neutral-900 cursor-pointer">
                {subiendoLogo
                  ? "Subiendo…"
                  : logoUrl
                    ? "Cambiar logo"
                    : "Subir logo"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={subiendoLogo}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) subirLogo(f);
                    e.target.value = "";
                  }}
                />
              </label>
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => setLogoUrl(null)}
                  className="text-xs text-neutral-500 hover:text-red-400 text-left"
                >
                  Quitar
                </button>
              )}
            </div>
          </div>
        </Campo>

        <Campo
          label="Color principal"
          hint="Se usa en cabeceras, botones y elementos destacados en vistas públicas y PDFs."
        >
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {COLORES_PRESET.map((c) => {
                const seleccionado = color.toLowerCase() === c.value.toLowerCase();
                return (
                  <button
                    type="button"
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    title={c.name}
                    aria-label={`Color ${c.name}`}
                    className={
                      "size-8 rounded-full border-2 transition flex items-center justify-center " +
                      (seleccionado
                        ? "border-white scale-110"
                        : "border-neutral-700 hover:border-neutral-500")
                    }
                    style={{ backgroundColor: c.value }}
                  >
                    {seleccionado && <Check className="size-4 text-white" />}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="size-9 rounded cursor-pointer border border-neutral-800 bg-neutral-950"
                aria-label="Selector de color personalizado"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#16a34a"
                className="w-32 font-mono text-xs uppercase"
              />
              <div
                className="px-3 py-1 rounded text-white text-xs"
                style={{ backgroundColor: color }}
              >
                Vista previa
              </div>
            </div>
          </div>
        </Campo>
      </section>

      {/* APARIENCIA */}
      <section className="bg-neutral-900/40 border border-neutral-800 rounded-lg p-5 space-y-4">
        <div>
          <h2 className="font-semibold">Apariencia</h2>
          <p className="text-xs text-neutral-500 mt-1">
            Cambia el tema de tu panel. Se guarda en este dispositivo.
          </p>
        </div>
        <ThemeToggle />
      </section>

      <div className="flex items-center justify-end gap-2 sticky bottom-4 bg-neutral-950/80 backdrop-blur border border-neutral-800 rounded-lg p-3">
        <Boton onClick={guardar} disabled={isPending}>
          {isPending ? "Guardando…" : "Guardar cambios"}
        </Boton>
      </div>
    </div>
  );
}
