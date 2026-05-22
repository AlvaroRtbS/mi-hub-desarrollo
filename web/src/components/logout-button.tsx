"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();

  async function cerrarSesion() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={cerrarSesion}
      className="w-full text-left text-sm text-neutral-400 hover:text-neutral-200 px-3 py-2 rounded-lg hover:bg-neutral-900"
    >
      Cerrar sesión
    </button>
  );
}
