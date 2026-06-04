"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setCargando(false);
      return;
    }
    setOk(true);
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 1500);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-8 space-y-5"
      >
        <div>
          <h1 className="text-2xl font-semibold">Nueva contraseña</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Elige una contraseña nueva para tu cuenta.
          </p>
        </div>

        <label className="block">
          <span className="text-sm text-neutral-300">Contraseña</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-500"
            placeholder="Mínimo 6 caracteres"
          />
        </label>

        {error && (
          <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        {ok && (
          <div className="text-sm text-green-400 bg-green-950/30 border border-green-900/50 rounded-lg px-3 py-2">
            Contraseña actualizada. Entrando…
          </div>
        )}

        <button
          type="submit"
          disabled={cargando || ok}
          className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2.5 transition"
        >
          {cargando ? "Guardando..." : "Guardar contraseña"}
        </button>
      </form>
    </main>
  );
}
