// Cliente de servidor de la API de Trainer Studio (solo lectura).
// La key vive en la env var TS_API_KEY (Vercel / .env.local), nunca en cliente.

const TS_BASE = "https://api.trainerstudio.io";

export type ClientaTS = {
  id: string;
  nombre: string;
  adherencia7d: number | null;
  adherencia30d: number | null;
  adherencia90d: number | null;
  // OJO: Trainer Studio devuelve aquí la última sesión PROGRAMADA, que puede
  // estar en el futuro; no es "último entreno realizado".
  ultimaSesionProgramada: string | null;
  primerLogin: string | null;
};

type CustomerDoc = {
  _id: string;
  name?: string;
  surname?: string;
  customerRoleData?: {
    complianceRate7d?: number;
    complianceRate30d?: number;
    complianceRate90d?: number;
    lastWorkoutDate?: string;
    firstLoginDate?: string;
    customerType?: string;
  };
};

/**
 * Clientas activas con su adherencia, ordenadas de peor a mejor (30 días).
 * Devuelve null si falta la key o Trainer Studio no responde: la página
 * decide cómo avisar sin romperse.
 */
export async function obtenerAdherenciaTS(): Promise<ClientaTS[] | null> {
  const key = (process.env.TS_API_KEY ?? "").trim();
  if (!key) return null;

  try {
    const res = await fetch(
      `${TS_BASE}/coach/customers?archived=false&pageSize=50&pageNum=1`,
      {
        headers: { "X-API-Key": key, "Accept-Language": "es" },
        // La adherencia cambia despacio: 30 min de caché evitan castigar la API.
        next: { revalidate: 1800 },
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { docs?: CustomerDoc[] };

    const clientas = (data.docs ?? [])
      .filter((c) => c.customerRoleData?.customerType !== "SAMPLE")
      .map((c) => {
        const rd = c.customerRoleData ?? {};
        return {
          id: c._id,
          nombre: `${c.name ?? ""} ${c.surname ?? ""}`.trim() || "Sin nombre",
          adherencia7d: rd.complianceRate7d ?? null,
          adherencia30d: rd.complianceRate30d ?? null,
          adherencia90d: rd.complianceRate90d ?? null,
          ultimaSesionProgramada: rd.lastWorkoutDate ?? null,
          primerLogin: rd.firstLoginDate ?? null,
        };
      });

    return clientas.sort(
      (a, b) => (a.adherencia30d ?? 0) - (b.adherencia30d ?? 0)
    );
  } catch {
    return null;
  }
}

export type Semaforo = "rojo" | "ambar" | "verde";

/** Umbrales del semáforo sobre la adherencia de 30 días. */
export function semaforoDe(adherencia30d: number | null): Semaforo {
  const v = adherencia30d ?? 0;
  if (v < 40) return "rojo";
  if (v < 75) return "ambar";
  return "verde";
}
