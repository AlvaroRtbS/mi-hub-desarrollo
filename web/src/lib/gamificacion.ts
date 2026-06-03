// ============================================================================
// Catálogo de logros y motor de detección + cálculo de XP / nivel
// ============================================================================

export type TipoLogro =
  // Adherencia
  | "primera_sesion"
  | "semana_1"
  | "mes_1"
  | "meses_3"
  | "sesiones_100"
  // Racha
  | "racha_3"
  | "racha_7"
  | "racha_15"
  | "racha_30"
  // Progreso
  | "primera_metrica"
  | "primera_foto"
  | "fotos_5"
  | "perder_2cm_cintura"
  | "perder_5kg"
  // Compromiso
  | "primer_mensaje"
  | "mes_en_app"
  | "meses_6_en_app"
  | "check_ins_5";

export type DefinicionLogro = {
  tipo: TipoLogro;
  nombre: string;
  emoji: string;
  descripcion: string;
  categoria: "adherencia" | "racha" | "progreso" | "compromiso";
  /** XP que otorga al desbloquearse */
  xp: number;
};

export const LOGROS: Record<TipoLogro, DefinicionLogro> = {
  primera_sesion: {
    tipo: "primera_sesion",
    nombre: "Primera vez",
    emoji: "🔥",
    descripcion: "Completa tu primera sesión de entrenamiento",
    categoria: "adherencia",
    xp: 20,
  },
  semana_1: {
    tipo: "semana_1",
    nombre: "Una semana",
    emoji: "💪",
    descripcion: "Completa la primera semana del programa",
    categoria: "adherencia",
    xp: 30,
  },
  mes_1: {
    tipo: "mes_1",
    nombre: "Un mes",
    emoji: "🏆",
    descripcion: "Completa el primer mes del programa",
    categoria: "adherencia",
    xp: 75,
  },
  meses_3: {
    tipo: "meses_3",
    nombre: "Tres meses",
    emoji: "🌟",
    descripcion: "Tres meses entrenando con la app",
    categoria: "adherencia",
    xp: 150,
  },
  sesiones_100: {
    tipo: "sesiones_100",
    nombre: "Centenaria",
    emoji: "👑",
    descripcion: "100 sesiones completadas",
    categoria: "adherencia",
    xp: 300,
  },
  racha_3: {
    tipo: "racha_3",
    nombre: "En marcha",
    emoji: "⚡",
    descripcion: "Racha de 3 sesiones consecutivas",
    categoria: "racha",
    xp: 15,
  },
  racha_7: {
    tipo: "racha_7",
    nombre: "Imparable",
    emoji: "🚀",
    descripcion: "Racha de 7 sesiones consecutivas",
    categoria: "racha",
    xp: 50,
  },
  racha_15: {
    tipo: "racha_15",
    nombre: "En racha",
    emoji: "💎",
    descripcion: "Racha de 15 sesiones consecutivas",
    categoria: "racha",
    xp: 120,
  },
  racha_30: {
    tipo: "racha_30",
    nombre: "Leyenda",
    emoji: "🏔️",
    descripcion: "Racha de 30 sesiones consecutivas",
    categoria: "racha",
    xp: 250,
  },
  primera_metrica: {
    tipo: "primera_metrica",
    nombre: "Punto de partida",
    emoji: "📏",
    descripcion: "Primera medida corporal registrada",
    categoria: "progreso",
    xp: 10,
  },
  primera_foto: {
    tipo: "primera_foto",
    nombre: "Antes",
    emoji: "📸",
    descripcion: "Primera foto de progreso subida",
    categoria: "progreso",
    xp: 15,
  },
  fotos_5: {
    tipo: "fotos_5",
    nombre: "Constancia visual",
    emoji: "📊",
    descripcion: "5 fotos de progreso registradas",
    categoria: "progreso",
    xp: 50,
  },
  perder_2cm_cintura: {
    tipo: "perder_2cm_cintura",
    nombre: "−2 cm",
    emoji: "📉",
    descripcion: "Has perdido 2 cm de cintura",
    categoria: "progreso",
    xp: 75,
  },
  perder_5kg: {
    tipo: "perder_5kg",
    nombre: "−5 kg",
    emoji: "⚖️",
    descripcion: "Has perdido 5 kg de peso corporal",
    categoria: "progreso",
    xp: 100,
  },
  primer_mensaje: {
    tipo: "primer_mensaje",
    nombre: "Hola",
    emoji: "💬",
    descripcion: "Primer mensaje a tu entrenador",
    categoria: "compromiso",
    xp: 10,
  },
  mes_en_app: {
    tipo: "mes_en_app",
    nombre: "Un mes contigo",
    emoji: "🗓️",
    descripcion: "Un mes activa en la app",
    categoria: "compromiso",
    xp: 30,
  },
  meses_6_en_app: {
    tipo: "meses_6_en_app",
    nombre: "Medio año",
    emoji: "⭐",
    descripcion: "6 meses activa en la app",
    categoria: "compromiso",
    xp: 150,
  },
  check_ins_5: {
    tipo: "check_ins_5",
    nombre: "Comunicativa",
    emoji: "✅",
    descripcion: "5 check-ins semanales respondidos",
    categoria: "compromiso",
    xp: 50,
  },
};

// ============================================================================
// Niveles
// ============================================================================

const UMBRALES_NIVEL = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 7500];

const NOMBRES_NIVEL = [
  "Empezando",
  "Principiante",
  "En marcha",
  "Constante",
  "Dedicada",
  "Imparable",
  "Bestia",
  "Atleta",
  "Leyenda",
  "Mítica",
  "Inmortal",
];

export type Nivel = {
  nivel: number;
  nombre: string;
  xpActual: number;
  xpEnNivel: number;
  xpParaSiguiente: number;
  porcentaje: number;
};

export function calcularNivel(xp: number): Nivel {
  let nivel = 0;
  for (let i = UMBRALES_NIVEL.length - 1; i >= 0; i--) {
    if (xp >= UMBRALES_NIVEL[i]!) {
      nivel = i;
      break;
    }
  }
  const umbralActual = UMBRALES_NIVEL[nivel]!;
  const umbralSiguiente = UMBRALES_NIVEL[nivel + 1] ?? umbralActual + 5000;
  const xpEnNivel = xp - umbralActual;
  const xpParaSiguiente = umbralSiguiente - umbralActual;
  return {
    nivel: nivel + 1,
    nombre: NOMBRES_NIVEL[nivel] ?? "Inmortal",
    xpActual: xp,
    xpEnNivel,
    xpParaSiguiente,
    porcentaje: Math.min(100, Math.round((xpEnNivel / xpParaSiguiente) * 100)),
  };
}

// ============================================================================
// Detección de logros
// ============================================================================

export type DatosClientaParaLogros = {
  clientaId: string;
  coachId: string;
  fechaAlta: string;
  sesionesCompletadasTotal: number;
  rachaActual: number;
  rachaMaxima: number;
  diasEnAsignacionActual: number;
  numFotos: number;
  numMetricas: number;
  numMensajesClienta: number;
  numCheckInsRespondidos: number;
  perdidoKg: number; // diferencia primera medida - última (positivo = ha perdido)
  perdidoCmCintura: number;
};

export function logrosAplicables(d: DatosClientaParaLogros): TipoLogro[] {
  const conseguidos: TipoLogro[] = [];

  // Adherencia
  if (d.sesionesCompletadasTotal >= 1) conseguidos.push("primera_sesion");
  if (d.diasEnAsignacionActual >= 7) conseguidos.push("semana_1");
  if (d.diasEnAsignacionActual >= 30) conseguidos.push("mes_1");
  if (d.diasEnAsignacionActual >= 90) conseguidos.push("meses_3");
  if (d.sesionesCompletadasTotal >= 100) conseguidos.push("sesiones_100");

  // Racha
  if (d.rachaMaxima >= 3) conseguidos.push("racha_3");
  if (d.rachaMaxima >= 7) conseguidos.push("racha_7");
  if (d.rachaMaxima >= 15) conseguidos.push("racha_15");
  if (d.rachaMaxima >= 30) conseguidos.push("racha_30");

  // Progreso
  if (d.numMetricas >= 1) conseguidos.push("primera_metrica");
  if (d.numFotos >= 1) conseguidos.push("primera_foto");
  if (d.numFotos >= 5) conseguidos.push("fotos_5");
  if (d.perdidoCmCintura >= 2) conseguidos.push("perder_2cm_cintura");
  if (d.perdidoKg >= 5) conseguidos.push("perder_5kg");

  // Compromiso
  if (d.numMensajesClienta >= 1) conseguidos.push("primer_mensaje");
  const diasEnApp =
    (Date.now() - new Date(d.fechaAlta).getTime()) / (24 * 3600 * 1000);
  if (diasEnApp >= 30) conseguidos.push("mes_en_app");
  if (diasEnApp >= 180) conseguidos.push("meses_6_en_app");
  if (d.numCheckInsRespondidos >= 5) conseguidos.push("check_ins_5");

  return conseguidos;
}

export function xpTotal(logros: TipoLogro[]): number {
  return logros.reduce((acc, tipo) => acc + (LOGROS[tipo]?.xp ?? 0), 0);
}
