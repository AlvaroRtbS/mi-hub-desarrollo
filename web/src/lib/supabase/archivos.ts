import { createSupabaseServerClient } from "./server";

/**
 * Convierte una ruta dentro de un bucket en una URL firmada temporal.
 * Si el path es null o no es de Supabase Storage, lo devuelve tal cual (compatibilidad con URLs externas).
 */
export async function obtenerUrlFirmada(
  bucket: string,
  path: string | null,
  segundos = 3600
): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, segundos);
  return data?.signedUrl ?? null;
}

/**
 * Versión que acepta varias rutas a la vez.
 */
export async function obtenerUrlsFirmadas(
  bucket: string,
  paths: (string | null)[],
  segundos = 3600
): Promise<Map<string, string>> {
  const validos = paths.filter((p): p is string => !!p && !p.startsWith("http"));
  if (validos.length === 0) return new Map();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.storage
    .from(bucket)
    .createSignedUrls(validos, segundos);

  const mapa = new Map<string, string>();
  data?.forEach((item) => {
    if (item.path && item.signedUrl) mapa.set(item.path, item.signedUrl);
  });
  return mapa;
}
