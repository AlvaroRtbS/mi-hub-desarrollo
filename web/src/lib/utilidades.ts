export function clasesCondicionales(
  ...args: (string | false | null | undefined)[]
): string {
  return args.filter(Boolean).join(" ");
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
