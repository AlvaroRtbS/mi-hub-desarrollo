export function clasesCondicionales(
  ...args: (string | false | null | undefined)[]
): string {
  return args.filter(Boolean).join(" ");
}

/**
 * Fecha de "hoy" (YYYY-MM-DD) en la zona horaria de uso (España).
 * Evita el desfase de usar `new Date().toISOString()` (UTC), que de madrugada
 * en España devuelve el día anterior — y haría ver/guardar el entreno del día
 * equivocado. TODO: hacerlo configurable por coach/clienta si se internacionaliza.
 */
export function hoyISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
  }).format(new Date());
}

export function formatearFecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function inicialesNombre(nombre: string, apellidos?: string | null): string {
  const p = nombre.trim().split(" ")[0]?.[0] ?? "";
  const a = (apellidos ?? "").trim().split(" ")[0]?.[0] ?? "";
  return (p + a).toUpperCase() || "?";
}
