"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";
import { actualizarMisDatos } from "./acciones";

export function FormularioPerfilClienta({
  nombre,
  apellidos,
  email,
  telefono,
  fechaNacimiento,
}: {
  nombre: string;
  apellidos: string | null;
  email: string;
  telefono: string | null;
  fechaNacimiento: string | null;
}) {
  const router = useRouter();
  const [okDatos, setOkDatos] = useState(false);
  const [errorDatos, setErrorDatos] = useState<string | null>(null);
  const [enviandoDatos, startTransition] = useTransition();

  // Cambio de password
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [okPwd, setOkPwd] = useState(false);
  const [errorPwd, setErrorPwd] = useState<string | null>(null);
  const [cambiandoPwd, setCambiandoPwd] = useState(false);

  function guardarDatos(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setOkDatos(false);
    setErrorDatos(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await actualizarMisDatos(fd);
      if (!r.ok) {
        setErrorDatos(r.error);
        return;
      }
      setOkDatos(true);
      setTimeout(() => setOkDatos(false), 2000);
      router.refresh();
    });
  }

  async function cambiarPassword(e: React.FormEvent) {
    e.preventDefault();
    setOkPwd(false);
    setErrorPwd(null);

    if (passwordNueva.length < 8) {
      setErrorPwd("Mínimo 8 caracteres");
      return;
    }
    if (passwordNueva !== passwordRepeat) {
      setErrorPwd("Las contraseñas no coinciden");
      return;
    }
    setCambiandoPwd(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password: passwordNueva });
    setCambiandoPwd(false);
    if (error) {
      setErrorPwd(error.message);
      return;
    }
    setOkPwd(true);
    setPasswordNueva("");
    setPasswordRepeat("");
    setTimeout(() => setOkPwd(false), 3000);
  }

  async function cerrarSesion() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Datos básicos */}
      <form
        onSubmit={guardarDatos}
        className="border border-neutral-800 rounded-2xl p-4 space-y-3 bg-neutral-950"
      >
        <h2 className="text-sm font-medium">Mis datos</h2>

        <Campo label="Nombre" valor={`${nombre} ${apellidos ?? ""}`} />
        <div className="text-[10px] text-neutral-600 -mt-1.5">
          El nombre solo lo puede cambiar tu entrenadora.
        </div>

        <Campo label="Email" valor={email} />

        <div>
          <label className="block text-xs text-neutral-500 mb-1">Teléfono</label>
          <input
            name="telefono"
            defaultValue={telefono ?? ""}
            placeholder="+34 600 000 000"
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
          />
        </div>

        <div>
          <label className="block text-xs text-neutral-500 mb-1">
            Fecha de nacimiento
          </label>
          <input
            type="date"
            name="fecha_nacimiento"
            defaultValue={fechaNacimiento ?? ""}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
          />
        </div>

        {errorDatos && (
          <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
            {errorDatos}
          </div>
        )}
        {okDatos && (
          <div className="text-sm text-green-400 bg-green-950/30 border border-green-900/50 rounded-lg px-3 py-2">
            Guardado ✓
          </div>
        )}

        <button
          type="submit"
          disabled={enviandoDatos}
          className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium"
        >
          {enviandoDatos ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>

      {/* Cambiar contraseña */}
      <form
        onSubmit={cambiarPassword}
        className="border border-neutral-800 rounded-2xl p-4 space-y-3 bg-neutral-950"
      >
        <h2 className="text-sm font-medium">Cambiar contraseña</h2>

        <div>
          <label className="block text-xs text-neutral-500 mb-1">
            Nueva contraseña
          </label>
          <input
            type="password"
            value={passwordNueva}
            onChange={(e) => setPasswordNueva(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
          />
        </div>

        <div>
          <label className="block text-xs text-neutral-500 mb-1">
            Repite la contraseña
          </label>
          <input
            type="password"
            value={passwordRepeat}
            onChange={(e) => setPasswordRepeat(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
          />
        </div>

        {errorPwd && (
          <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
            {errorPwd}
          </div>
        )}
        {okPwd && (
          <div className="text-sm text-green-400 bg-green-950/30 border border-green-900/50 rounded-lg px-3 py-2">
            Contraseña cambiada ✓
          </div>
        )}

        <button
          type="submit"
          disabled={cambiandoPwd || !passwordNueva}
          className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium"
        >
          {cambiandoPwd ? "Cambiando..." : "Cambiar contraseña"}
        </button>
      </form>

      {/* Cerrar sesión */}
      <div className="pt-4 border-t border-neutral-800">
        <div className="text-xs uppercase tracking-wide text-neutral-500 mb-2">
          Apariencia
        </div>
        <ThemeToggle />
      </div>

      <button
        onClick={cerrarSesion}
        className="w-full border border-neutral-800 hover:bg-neutral-900 rounded-lg py-2.5 text-sm text-neutral-300"
      >
        Cerrar sesión
      </button>
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <label className="block text-xs text-neutral-500 mb-1">{label}</label>
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-400">
        {valor}
      </div>
    </div>
  );
}
