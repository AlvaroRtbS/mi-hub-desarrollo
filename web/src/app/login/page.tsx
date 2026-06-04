"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Modo = "login" | "registro" | "recuperar";

export default function LoginPage() {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  function cambiarModo(nuevo: Modo) {
    setModo(nuevo);
    setError(null);
    setMensaje(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    setCargando(true);

    const supabase = createSupabaseBrowserClient();

    if (modo === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        router.push("/");
        router.refresh();
      }
    } else if (modo === "registro") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nombre } },
      });
      if (error) {
        setError(error.message);
      } else {
        setMensaje("Cuenta creada. Si tu Supabase pide confirmación por email, revisa tu bandeja.");
      }
    } else if (modo === "recuperar") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) {
        setError(error.message);
      } else {
        setMensaje("Te hemos enviado un email para restablecer tu contraseña. Revisa tu bandeja (y spam).");
      }
    }

    setCargando(false);
  }

  async function entrarConEnlace() {
    if (!email) {
      setError("Escribe tu email primero.");
      return;
    }
    setError(null);
    setMensaje(null);
    setCargando(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
    } else {
      setMensaje("Te hemos enviado un enlace para entrar sin contraseña. Ábrelo desde este móvil.");
    }
    setCargando(false);
  }

  const titulo =
    modo === "login" ? "Entrar" : modo === "registro" ? "Crear cuenta" : "Recuperar contraseña";
  const subtitulo =
    modo === "login"
      ? "Accede a tu cuenta."
      : modo === "registro"
        ? "Regístrate para crear tu panel."
        : "Te enviaremos un email para crear una contraseña nueva.";

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-8 space-y-5"
      >
        <div>
          <h1 className="text-2xl font-semibold">{titulo}</h1>
          <p className="text-sm text-neutral-400 mt-1">{subtitulo}</p>
        </div>

        {modo === "registro" && (
          <label className="block">
            <span className="text-sm text-neutral-300">Nombre</span>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="mt-1 w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-500"
              placeholder="Tu nombre"
            />
          </label>
        )}

        <label className="block">
          <span className="text-sm text-neutral-300">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-500"
            placeholder="tu@email.com"
          />
        </label>

        {modo !== "recuperar" && (
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
        )}

        {modo === "login" && (
          <button
            type="button"
            onClick={() => cambiarModo("recuperar")}
            className="text-xs text-neutral-400 hover:text-neutral-200"
          >
            ¿Olvidaste tu contraseña?
          </button>
        )}

        {error && (
          <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        {mensaje && (
          <div className="text-sm text-green-400 bg-green-950/30 border border-green-900/50 rounded-lg px-3 py-2">
            {mensaje}
          </div>
        )}

        <button
          type="submit"
          disabled={cargando}
          className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2.5 transition"
        >
          {cargando
            ? "Cargando..."
            : modo === "login"
              ? "Entrar"
              : modo === "registro"
                ? "Crear cuenta"
                : "Enviar email de recuperación"}
        </button>

        {modo === "login" && (
          <button
            type="button"
            onClick={entrarConEnlace}
            disabled={cargando}
            className="w-full border border-neutral-700 hover:bg-neutral-800 disabled:opacity-50 text-neutral-200 text-sm font-medium rounded-lg px-4 py-2.5 transition"
          >
            ✉️ Entrar con enlace por email
          </button>
        )}

        <button
          type="button"
          onClick={() =>
            cambiarModo(modo === "registro" ? "login" : modo === "recuperar" ? "login" : "registro")
          }
          className="w-full text-sm text-neutral-400 hover:text-neutral-200"
        >
          {modo === "login"
            ? "¿No tienes cuenta? Crear una"
            : modo === "registro"
              ? "¿Ya tienes cuenta? Entrar"
              : "← Volver a entrar"}
        </button>
      </form>
    </main>
  );
}
