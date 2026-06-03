import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FORMULARIO_INICIAL, FORMULARIO_INICIAL_TIPO } from "@/lib/formulario-inicial";
import { FormularioInicial } from "./formulario";

export default async function FormularioInicialPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: clienta } = await supabase
    .from("clientas")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!clienta) return null;

  const { data: fila } = await supabase
    .from("formulario_respuestas")
    .select("respuestas, completado")
    .eq("clienta_id", clienta.id)
    .eq("tipo", FORMULARIO_INICIAL_TIPO)
    .maybeSingle<{ respuestas: Record<string, string> | null; completado: boolean }>();

  return (
    <div>
      <Link
        href="/c/formularios"
        className="text-sm text-neutral-400 hover:text-neutral-200"
      >
        ← Formularios
      </Link>
      <h1 className="text-xl font-semibold mt-3 mb-1">
        {FORMULARIO_INICIAL.titulo}
      </h1>
      <p className="text-sm text-neutral-400 mb-5">{FORMULARIO_INICIAL.intro}</p>

      <FormularioInicial
        respuestasIniciales={fila?.respuestas ?? {}}
        yaCompletado={fila?.completado ?? false}
      />
    </div>
  );
}
