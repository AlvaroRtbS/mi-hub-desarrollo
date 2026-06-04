// Generador determinista de menú a partir del reparto de raciones por toma,
// la tabla de alimentos del coach y las intolerancias/preferencias de la clienta.
// Sin IA: 0 €, instantáneo, privado y siempre cuadra las raciones.

import type { Toma, CategoriaRacion } from "./nutricion";

export type AlimentoGen = {
  categoria: CategoriaRacion;
  subgrupo: string | null;
  alimento: string;
  cantidad: string;
  notas: string | null;
};

/** Normaliza para comparar: minúsculas + sin acentos. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// Mapa de exclusiones: si el texto de intolerancias contiene alguna de las
// `claves`, se excluyen los alimentos cuyo nombre/subgrupo contenga alguno de
// los `excluye` (o cuyo subgrupo esté en `subgrupos`).
const REGLAS_EXCLUSION: {
  claves: string[];
  excluye?: string[];
  subgrupos?: string[];
}[] = [
  {
    claves: ["lacteo", "lactosa", "leche", "lacteos"],
    excluye: ["leche", "yogur", "kefir", "queso", "requeson", "skyr", "mozzarella", "nata", "burgos", "mantequilla"],
  },
  { claves: ["huevo"], excluye: ["huevo", "clara"] },
  { claves: ["pescado"], subgrupos: ["Pescados"] },
  { claves: ["marisco"], subgrupos: ["Marisco"] },
  {
    claves: ["gluten", "celiac", "celiaca", "trigo"],
    excluye: ["pan", "pasta", "cuscus", "trigo", "seitan", "muesli", "galleta", "centeno", "cebada"],
  },
  { claves: ["fruto seco", "frutos secos", "nuez", "nueces", "almendra"], subgrupos: ["Frutos secos"] },
  { claves: ["soja"], excluye: ["soja", "tofu", "tempeh", "edamame", "texturizada"] },
  { claves: ["legumbre"], subgrupos: ["Legumbres"] },
  {
    claves: ["cerdo"],
    excluye: ["cerdo", "jamon", "iberico", "serrano", "panceta", "butifarra", "lomo", "cecina"],
  },
  // Vegetariana: sin carnes, pescados, marisco ni embutido (mantiene huevo y lácteos).
  {
    claves: ["vegetarian"],
    subgrupos: ["carne", "pescado", "marisco", "embutido"],
  },
  // Vegana: lo de vegetariana + sin huevo ni lácteos.
  {
    claves: ["vegan"],
    subgrupos: ["carne", "pescado", "marisco", "embutido", "huevo", "lacteo"],
  },
];

function construirExcluido(intolerancias: string): (a: AlimentoGen) => boolean {
  const texto = norm(intolerancias || "");
  const nombresExcluidos: string[] = [];
  const subgruposExcluidos: string[] = [];
  for (const regla of REGLAS_EXCLUSION) {
    if (regla.claves.some((k) => texto.includes(norm(k)))) {
      regla.excluye?.forEach((e) => nombresExcluidos.push(norm(e)));
      regla.subgrupos?.forEach((s) => subgruposExcluidos.push(norm(s)));
    }
  }
  return (a: AlimentoGen) => {
    const nombre = norm(a.alimento);
    const sub = norm(a.subgrupo ?? "");
    // "mantequilla de frutos secos/cacahuete" NO es lácteo: no excluir por leche.
    if (nombresExcluidos.includes("mantequilla") && nombre.includes("mantequilla")) {
      if (nombre.includes("cacahuete") || nombre.includes("fruto")) {
        // no excluir por la regla de lácteos
      } else {
        return true;
      }
    }
    if (nombresExcluidos.some((e) => e !== "mantequilla" && nombre.includes(e))) return true;
    if (subgruposExcluidos.some((s) => sub.includes(s))) return true;
    return false;
  };
}

/** Extrae el número base y la unidad de la cantidad por ración ("50 g (crudo)" → 50 g). */
function baseRacion(cantidad: string): { num: number; unidad: string } | null {
  const m = cantidad.trim().match(/^([\d.,]+)\s*(g|ml|unidades?|ud|cda)/i);
  if (!m) return null;
  const num = parseFloat(m[1].replace(",", "."));
  if (!isFinite(num)) return null;
  let unidad = m[2].toLowerCase();
  if (unidad.startsWith("unidad")) unidad = "ud";
  return { num, unidad };
}

function redondear(qty: number, unidad: string): string {
  if (unidad === "ud") {
    const r = Math.round(qty * 2) / 2;
    return `${r} ${r === 1 ? "unidad" : "uds"}`;
  }
  if (unidad === "ml") {
    return `${Math.max(5, Math.round(qty / 5) * 5)} ml`;
  }
  // gramos
  const r = qty >= 25 ? Math.round(qty / 5) * 5 : Math.round(qty);
  return `${Math.max(5, r)} g`;
}

function linea(food: AlimentoGen, raciones: number): string {
  const base = baseRacion(food.cantidad);
  if (!base) {
    return `${food.alimento} (${raciones} ${raciones === 1 ? "ración" : "raciones"})`;
  }
  return `${food.alimento}: ${redondear(base.num * raciones, base.unidad)}`;
}

function esComidaPrincipal(nombre: string): boolean {
  const n = norm(nombre);
  return n.includes("comida") || n.includes("cena") || n.includes("almuerzo");
}

function pick<T>(lista: T[], i: number): T | null {
  return lista.length ? lista[i % lista.length] : null;
}

/**
 * Genera un menú (líneas) por toma cuadrando las raciones con alimentos de la
 * tabla, respetando las intolerancias. Determinista, sin IA.
 */
export function generarMenuPlan(
  tomas: Toma[],
  alimentos: AlimentoGen[],
  intolerancias: string
): { id: string; menu: string[] }[] {
  const excluido = construirExcluido(intolerancias);
  const ok = alimentos.filter((a) => !excluido(a));

  const proteinas = ok.filter((a) => a.categoria === "P");
  // Proteínas más típicas de desayuno/snack (lácteos proteicos, huevos) vs
  // de comida/cena (carnes, pescados, marisco).
  const subSnackP = ["lacteos proteicos", "huevos"];
  const protSnack = proteinas.filter((a) => subSnackP.some((s) => norm(a.subgrupo ?? "").includes(s)));
  const protPrincipal = proteinas.filter((a) => !subSnackP.some((s) => norm(a.subgrupo ?? "").includes(s)));
  const grasas = ok.filter((a) => a.categoria === "G");
  const aove = grasas.find((a) => norm(a.alimento).includes("aove")) ?? null;
  const grasaSnack = grasas.filter((a) => norm(a.subgrupo ?? "").includes("fruto")) ;

  const hcTodos = ok.filter((a) => a.categoria === "HC");
  const subSnack = ["fruta", "lacteos"];
  const hcSnack = hcTodos.filter((a) => subSnack.some((s) => norm(a.subgrupo ?? "").includes(s)));
  const hcPrincipal = hcTodos.filter(
    (a) => !subSnack.some((s) => norm(a.subgrupo ?? "").includes(s))
  );

  return tomas.map((t, i) => {
    const menu: string[] = [];
    const principal = esComidaPrincipal(t.nombre);

    if (t.p > 0) {
      const listaP = principal
        ? protPrincipal.length
          ? protPrincipal
          : proteinas
        : protSnack.length
          ? protSnack
          : proteinas;
      const f = pick(listaP, i);
      if (f) menu.push(linea(f, t.p));
    }
    if (t.hc > 0) {
      const lista = principal ? hcPrincipal : hcSnack.length ? hcSnack : hcTodos;
      const f = pick(lista, i + 1);
      if (f) menu.push(linea(f, t.hc));
    }
    if (t.g > 0) {
      // En comidas saladas, AOVE como grasa principal; en snacks, frutos secos.
      const f = principal ? aove ?? pick(grasas, i) : pick(grasaSnack.length ? grasaSnack : grasas, i);
      if (f) menu.push(linea(f, t.g));
    }
    if (t.v > 0) {
      menu.push(`Verdura libre: ~${Math.round(t.v * 200)} g (ensalada o verdura salteada)`);
    }

    return { id: t.id, menu };
  });
}
