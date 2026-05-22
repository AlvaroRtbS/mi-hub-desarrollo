import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Clienta = {
  id: string;
  nombre: string;
  apellidos: string | null;
  email: string;
  estado: "invitada" | "activa" | "archivada";
  foto_url: string | null;
  creada_en: string;
};

export default async function ClientasPage() {
  const supabase = await createSupabaseServerClient();
  const { data: clientas, error } = await supabase
    .from("clientas")
    .select("id, nombre, apellidos, email, estado, foto_url, creada_en")
    .order("nombre");

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Clientas</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Gestiona tu lista de clientas, ve su estado y accede a sus perfiles.
          </p>
        </div>
        <Link
          href="/clientas/nueva"
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          + Añadir clienta
        </Link>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-4 py-3 mb-4">
          {error.message}
        </div>
      )}

      {!clientas || clientas.length === 0 ? (
        <div className="border border-dashed border-neutral-800 rounded-2xl p-12 text-center">
          <div className="text-neutral-400">Aún no tienes clientas.</div>
          <div className="text-sm text-neutral-500 mt-2">
            Cuando migremos desde TrainerStudio o añadas la primera, aparecerá aquí.
          </div>
        </div>
      ) : (
        <div className="border border-neutral-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 text-neutral-400">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Nombre</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Estado</th>
                <th className="text-left px-4 py-3 font-medium">Alta</th>
              </tr>
            </thead>
            <tbody>
              {(clientas as Clienta[]).map((c) => (
                <tr key={c.id} className="border-t border-neutral-800 hover:bg-neutral-900/50">
                  <td className="px-4 py-3">
                    <Link href={`/clientas/${c.id}`} className="hover:text-brand-500">
                      {c.nombre} {c.apellidos ?? ""}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-400">{c.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "inline-block text-xs px-2 py-0.5 rounded-full " +
                        (c.estado === "activa"
                          ? "bg-green-950/50 text-green-400 border border-green-900/50"
                          : c.estado === "invitada"
                          ? "bg-amber-950/50 text-amber-400 border border-amber-900/50"
                          : "bg-neutral-900 text-neutral-500 border border-neutral-800")
                      }
                    >
                      {c.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-400">
                    {new Date(c.creada_en).toLocaleDateString("es-ES")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
