// Núcleo del método de EQUIVALENCIAS (sistema europeo, 1 ración = 10 g del macro).
// Tipos + calculadora de macros/raciones + reparto sugerido por tomas.

export type CategoriaRacion = "HC" | "P" | "G" | "V";

export const CATEGORIAS: { cat: CategoriaRacion; label: string; color: string }[] = [
  { cat: "HC", label: "Hidratos", color: "#f59e0b" },
  { cat: "P", label: "Proteína", color: "#ef4444" },
  { cat: "G", label: "Grasa", color: "#84cc16" },
  { cat: "V", label: "Verdura", color: "#22c55e" },
];

export function etiquetaCategoria(cat: CategoriaRacion): string {
  return CATEGORIAS.find((c) => c.cat === cat)?.label ?? cat;
}

export type AlimentoEquivalencia = {
  id: string;
  categoria: CategoriaRacion;
  subgrupo: string | null;
  alimento: string;
  cantidad: string;
  notas: string | null;
};

export type Toma = {
  id: string;
  nombre: string;
  hora: string;
  hc: number;
  p: number;
  g: number;
  v: number; // raciones de verdura (~200 g cada una)
};

export type PlanEstructurado = {
  id: string;
  nombre: string;
  calorias: number | null;
  proteina_g: number | null;
  grasa_g: number | null;
  hc_g: number | null;
  raciones_hc: number | null;
  raciones_p: number | null;
  raciones_g: number | null;
  tomas: Toma[];
  notas: string | null;
};

/** Redondea al medio más cercano (½, 1, 1½…), convención del método. */
export function redondearMedio(x: number): number {
  return Math.round(x * 2) / 2;
}

export type Macros = {
  proteina_g: number;
  grasa_g: number;
  hc_g: number;
  raciones_hc: number;
  raciones_p: number;
  raciones_g: number;
  caloriasReales: number;
};

/**
 * Calcula macros y raciones a partir de peso, calorías objetivo y % de grasa.
 *  P = peso × g/kg (default 2.0) · G = cal × grasa% / 9 · HC = resto / 4
 * Raciones = gramos / 10, redondeado al medio.
 */
export function calcularMacros(
  pesoKg: number,
  calorias: number,
  grasaPct = 28,
  proteinaPorKg = 2.0
): Macros {
  const proteina_g = Math.round(pesoKg * proteinaPorKg);
  const grasa_g = Math.round((calorias * (grasaPct / 100)) / 9);
  const hc_g = Math.max(0, Math.round((calorias - proteina_g * 4 - grasa_g * 9) / 4));
  return {
    proteina_g,
    grasa_g,
    hc_g,
    raciones_hc: redondearMedio(hc_g / 10),
    raciones_p: redondearMedio(proteina_g / 10),
    raciones_g: redondearMedio(grasa_g / 10),
    caloriasReales: hc_g * 4 + proteina_g * 4 + grasa_g * 9,
  };
}

// Plantillas de tomas por número de tomas (nombre, hora y peso relativo).
const PLANTILLAS_TOMAS: Record<number, { nombre: string; hora: string; peso: number }[]> = {
  3: [
    { nombre: "Desayuno", hora: "08:00", peso: 0.3 },
    { nombre: "Comida", hora: "14:00", peso: 0.4 },
    { nombre: "Cena", hora: "21:00", peso: 0.3 },
  ],
  4: [
    { nombre: "Desayuno", hora: "08:00", peso: 0.27 },
    { nombre: "Comida", hora: "14:00", peso: 0.33 },
    { nombre: "Merienda", hora: "17:30", peso: 0.13 },
    { nombre: "Cena", hora: "21:00", peso: 0.27 },
  ],
  5: [
    { nombre: "Desayuno", hora: "08:00", peso: 0.22 },
    { nombre: "Media mañana", hora: "11:00", peso: 0.16 },
    { nombre: "Comida", hora: "14:00", peso: 0.27 },
    { nombre: "Merienda", hora: "17:30", peso: 0.11 },
    { nombre: "Cena", hora: "21:00", peso: 0.24 },
  ],
  6: [
    { nombre: "Desayuno", hora: "08:00", peso: 0.18 },
    { nombre: "Media mañana", hora: "11:00", peso: 0.14 },
    { nombre: "Comida", hora: "14:00", peso: 0.24 },
    { nombre: "Merienda", hora: "17:30", peso: 0.12 },
    { nombre: "Cena", hora: "21:00", peso: 0.2 },
    { nombre: "Recena", hora: "23:00", peso: 0.12 },
  ],
};

function repartirMacro(total: number, pesos: number[]): number[] {
  // Reparte proporcionalmente y redondea al medio; el desajuste va a la toma
  // de mayor peso (la comida principal) para que el total cuadre exacto.
  const crudo = pesos.map((w) => total * w);
  const red = crudo.map(redondearMedio);
  const suma = red.reduce((a, b) => a + b, 0);
  const diff = redondearMedio(total - suma);
  if (diff !== 0) {
    const idxMax = pesos.indexOf(Math.max(...pesos));
    red[idxMax] = Math.max(0, red[idxMax] + diff);
  }
  return red;
}

/** Genera un reparto sugerido por tomas a partir de las raciones totales. */
export function distribucionSugerida(
  raciones: { hc: number; p: number; g: number },
  nTomas: number
): Toma[] {
  const plantilla = PLANTILLAS_TOMAS[nTomas] ?? PLANTILLAS_TOMAS[5];
  const pesos = plantilla.map((t) => t.peso);
  const hc = repartirMacro(raciones.hc, pesos);
  const p = repartirMacro(raciones.p, pesos);
  const g = repartirMacro(raciones.g, pesos);

  return plantilla.map((t, i) => {
    const esComida = t.nombre === "Comida";
    const esCena = t.nombre === "Cena";
    return {
      id: `t${i + 1}`,
      nombre: t.nombre,
      hora: t.hora,
      hc: hc[i],
      p: p[i],
      g: g[i],
      v: esComida ? 1 : esCena ? 2 : 0, // verdura en comidas principales
    };
  });
}

/** Suma las raciones de todas las tomas (para validar contra el objetivo). */
export function totalesDeTomas(tomas: Toma[]) {
  return tomas.reduce(
    (acc, t) => ({
      hc: acc.hc + (t.hc || 0),
      p: acc.p + (t.p || 0),
      g: acc.g + (t.g || 0),
      v: acc.v + (t.v || 0),
    }),
    { hc: 0, p: 0, g: 0, v: 0 }
  );
}
