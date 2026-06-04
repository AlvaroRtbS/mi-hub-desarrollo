// Perfil dietético de la clienta: restricciones típicas (checks) + nota libre.
// Se guarda en clientas.dieta_restricciones y alimenta al generador de menús.

export type DietaRestricciones = {
  flags?: string[];
  notas?: string;
};

export const RESTRICCIONES_DIETETICAS: {
  key: string;
  label: string;
  frase: string;
}[] = [
  { key: "vegetariana", label: "Vegetariana", frase: "vegetariana" },
  { key: "vegana", label: "Vegana", frase: "vegana" },
  { key: "sin_lactosa", label: "Sin lactosa", frase: "sin lactosa" },
  { key: "sin_huevo", label: "Sin huevo", frase: "sin huevo" },
  { key: "sin_gluten", label: "Sin gluten", frase: "sin gluten" },
  { key: "sin_pescado", label: "Sin pescado", frase: "sin pescado" },
  { key: "sin_marisco", label: "Sin marisco", frase: "sin marisco" },
  { key: "sin_cerdo", label: "Sin cerdo", frase: "sin cerdo" },
  { key: "sin_frutos_secos", label: "Sin frutos secos", frase: "sin frutos secos" },
  { key: "sin_soja", label: "Sin soja", frase: "sin soja" },
];

/** Convierte el perfil dietético en un texto de restricciones para el generador. */
export function restriccionesATexto(d: DietaRestricciones | null | undefined): string {
  if (!d) return "";
  const frases = (d.flags ?? [])
    .map((k) => RESTRICCIONES_DIETETICAS.find((r) => r.key === k)?.frase)
    .filter((f): f is string => !!f);
  return [...frases, d.notas].filter(Boolean).join(". ");
}
