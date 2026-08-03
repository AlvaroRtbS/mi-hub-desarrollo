import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FormularioAjustes } from "./formulario";

export const metadata = {
  title: "Ajustes · mi-hub",
};

export default async function AjustesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: coach } = await supabase
    .from("coaches")
    .select(
      "id, nombre, email, telefono, bio, foto_url, marca_nombre, marca_color_primario, marca_logo_url"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!coach) {
    return (
      <div className="p-4 pt-16 md:p-8 mx-auto max-w-3xl">
        <p className="text-red-400">
          No se encontró tu perfil de coach. ¿Has terminado el registro?
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 pt-16 md:p-8 mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold mb-1">Ajustes</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Personaliza tu perfil y la marca con la que te ven tus clientas.
      </p>

      <FormularioAjustes
        coach={{
          id: coach.id as string,
          nombre: (coach.nombre as string) ?? "",
          email: (coach.email as string) ?? "",
          telefono: (coach.telefono as string | null) ?? "",
          bio: (coach.bio as string | null) ?? "",
          foto_url: (coach.foto_url as string | null) ?? null,
          marca_nombre: (coach.marca_nombre as string | null) ?? "",
          marca_color_primario:
            (coach.marca_color_primario as string | null) ?? "#16a34a",
          marca_logo_url: (coach.marca_logo_url as string | null) ?? null,
        }}
      />
    </div>
  );
}
