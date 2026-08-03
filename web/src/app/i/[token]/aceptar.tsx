"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// Traduce los errores técnicos de Supabase Auth a algo que la clienta entienda.
function traducirError(msg: string): string {
  const m = (msg || "").toLowerCase();
  if (m.includes("weak password") || m.includes("at least") || m.includes("should be"))
    return "La contraseña es demasiado débil. Usa al menos 8 caracteres.";
  if (m.includes("already registered") || m.includes("exists") || m.includes("registered"))
    return "Este email ya tiene una cuenta.";
  if (m.includes("invalid login") || m.includes("credentials"))
    return "Email o contraseña incorrectos.";
  if (m.includes("network") || m.includes("fetch") || m.includes("failed to"))
    return "Problema de conexión. Inténtalo de nuevo.";
  return "Algo no ha ido bien. Inténtalo otra vez o avisa a tu entrenador.";
}

function traducirMotivo(motivo: string | null): string {
  switch (motivo) {
    case "no_autenticada":
      return "Tu sesión no se inició bien. Cierra esta página y vuelve a abrir el enlace.";
    case "token_no_encontrado":
      return "El enlace de invitación no es válido.";
    case "ya_usada":
      return "Esta invitación ya se usó. Entra desde la pantalla de inicio.";
    case "expirada":
      return "La invitación ha caducado. Pídele a tu entrenador un enlace nuevo.";
    default:
      return "No se pudo activar la cuenta. Avisa a tu entrenador.";
  }
}

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

    // 1. Intentar registro. Guardamos si quedó sesión iniciada.
    const { data: signUpData, error: errSignup } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre, tipo: "clienta" },
      },
    });

    let haySesion = !!signUpData?.session;

    // Si el email ya existe, intentar login con la contraseña que acaba de poner
    // (caso: la clienta usó la app antes con esta cuenta, o se equivocó).
    if (errSignup) {
      const m = errSignup.message.toLowerCase();
      if (m.includes("registered") || m.includes("exists")) {
        const { data: loginData, error: errLogin } =
          await supabase.auth.signInWithPassword({ email, password });
        if (errLogin) {
          setError(
            "Este email ya tiene una cuenta. Si es tuya, entra desde la pantalla de inicio; si olvidaste la contraseña, pídele a tu entrenador un enlace nuevo."
          );
          setEnviando(false);
          return;
        }
        haySesion = !!loginData?.session;
      } else {
        setError(traducirError(errSignup.message));
        setEnviando(false);
        return;
      }
    }

    // Si NO quedó sesión iniciada, es que Supabase exige confirmar el email
    // antes de entrar. Avisamos con claridad en vez de fallar en silencio.
    if (!haySesion) {
      setError(
        "Te hemos enviado un correo para confirmar tu cuenta. Ábrelo, confirma, y luego entra desde la pantalla de inicio. (Si no lo ves, revisa la carpeta de spam.)"
      );
      setEnviando(false);
      return;
    }

    // 2. Canjear la invitación: enlaza auth.user con clientas.user_id
    const { data, error: errCanje } = await supabase.rpc("canjear_invitacion", {
      t: token,
    });

    if (errCanje) {
      setError("No se pudo activar tu cuenta: " + traducirError(errCanje.message));
      setEnviando(false);
      return;
    }

    const r = (data as Array<{ ok: boolean; motivo: string | null }>)[0];
    if (!r?.ok) {
      setError(traducirMotivo(r?.motivo ?? null));
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
          Se ha fijado al email con el que tu entrenador te dio de alta.
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

      {/* El art. 13 del RGPD obliga a informar EN EL MOMENTO de la recogida,
          no después: por eso el enlace va aquí, antes de crear la cuenta, y
          la página es pública (no exige sesión). */}
      <p className="text-[11px] leading-relaxed text-neutral-500">
        Al crear tu cuenta aceptas que tratemos tus datos para preparar y seguir
        tu plan, como se explica en{" "}
        <a
          href="/legal/privacidad"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-neutral-300"
        >
          la información de privacidad
        </a>
        . Los datos de salud y las fotos se piden aparte y son cosa tuya:
        puedes decir que no y seguir usando el portal.
      </p>
    </form>
  );
}
