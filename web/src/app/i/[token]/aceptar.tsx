"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AceptarInvitacion({
  token,
  email,
  nombre,
}: {
  token: string;
  email: string;
  nombre: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aceptar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== passwordRepeat) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setEnviando(true);
    const supabase = createSupabaseBrowserClient();

    // 1. Intentar signup (puede fallar si el email ya existe en auth)
    const { error: errSignup } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre, tipo: "clienta" },
      },
    });

    // Si el email ya existe, intentar login con la contraseña que acaba de poner
    // (caso: la clienta usó tu app antes con esta misma cuenta, o se equivocó)
    if (errSignup) {
      if (
        errSignup.message.toLowerCase().includes("registered") ||
        errSignup.message.toLowerCase().includes("exists")
      ) {
        const { error: errLogin } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (errLogin) {
          setError(
            "Este email ya tiene una cuenta en la app. Si es tuya, prueba a entrar directamente desde la pantalla de login. Si olvidaste la contraseña, pide ayuda a tu entrenadora."
          );
          setEnviando(false);
          return;
        }
      } else {
        setError(errSignup.message);
        setEnviando(false);
        return;
      }
    }

    // 2. Canjear la invitación: enlaza auth.user con clientas.user_id
    const { data, error: errCanje } = await supabase.rpc("canjear_invitacion", {
      t: token,
    });

    if (errCanje) {
      setError(`Error al activar la cuenta: ${errCanje.message}`);
      setEnviando(false);
      return;
    }

    const r = (data as Array<{ ok: boolean; motivo: string | null }>)[0];
    if (!r?.ok) {
      setError(`No se pudo activar la cuenta (${r?.motivo ?? "desconocido"}).`);
      setEnviando(false);
      return;
    }

    // 3. Redirigir a la pantalla principal de clienta
    router.push("/c/hoy");
    router.refresh();
  }

  return (
    <form onSubmit={aceptar} className="space-y-4">
      <div>
        <label className="block text-xs text-neutral-500 mb-1">Email</label>
        <input
          type="email"
          value={email}
          readOnly
          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-400"
        />
        <p className="text-[10px] text-neutral-600 mt-1">
          Se ha fijado al email con el que tu entrenadora te dio de alta.
        </p>
      </div>

      <div>
        <label className="block text-xs text-neutral-500 mb-1">Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres"
          autoFocus
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

      {error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium"
      >
        {enviando ? "Activando cuenta..." : "Crear cuenta y entrar"}
      </button>
    </form>
  );
}
