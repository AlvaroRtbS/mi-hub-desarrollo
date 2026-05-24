// Plantillas de mensajes predefinidas para el chat.
// La coach las inserta con un click y luego puede editarlas antes de enviar.
//
// Variables soportadas en el contenido:
//   {nombre}            — primer nombre de la clienta
//   {ultimo_peso}       — última métrica de tipo "peso" (ej "72.4 kg")
//   {delta_peso}        — diferencia desde el primer peso registrado (ej "-2.3 kg")
//   {racha}             — días seguidos completando entreno (ej "5")
//   {adherencia_30d}    — % de adherencia en los últimos 30 días
//   {dias_sin_entrenar} — días desde la última sesión completada
//   {ejercicio}         — placeholder libre (no se rellena automáticamente)

export type PlantillaMensaje = {
  id: string;
  categoria: "saludos" | "seguimiento" | "motivacion" | "tecnica" | "informativos";
  titulo: string;
  contenido: string;
};

export const PLANTILLAS: PlantillaMensaje[] = [
  // Saludos
  {
    id: "buenos_dias",
    categoria: "saludos",
    titulo: "Buenos días",
    contenido: "¡Buenos días, {nombre}! ¿Cómo amaneces hoy? ¿Lista para el entreno?",
  },
  {
    id: "check_in_dia",
    categoria: "saludos",
    titulo: "Check-in del día",
    contenido:
      "Hola {nombre}, ¿qué tal va el día? Cuéntame cómo te has encontrado en el entreno de hoy.",
  },
  {
    id: "fin_semana",
    categoria: "saludos",
    titulo: "Fin de semana",
    contenido:
      "¡{nombre}! Repasando la semana — ¿cómo te has sentido en general? Mañana arrancamos otra.",
  },

  // Seguimiento
  {
    id: "como_va_entreno",
    categoria: "seguimiento",
    titulo: "Recordar entreno",
    contenido:
      "{nombre}, recuerda que hoy toca entreno. ¿Cómo lo llevas con los tiempos? Si necesitas mover el día, dímelo.",
  },
  {
    id: "echarte_de_menos",
    categoria: "seguimiento",
    titulo: "Llevas días sin entrenar",
    contenido:
      "Hola {nombre}, hace unos días que no veo actividad. ¿Va todo bien? Si necesitas reajustar el plan o pausar unos días, sin problema — solo dime.",
  },
  {
    id: "metrica_pendiente",
    categoria: "seguimiento",
    titulo: "Pedir medidas",
    contenido:
      "{nombre}, cuando puedas, regístrame tu peso y/o medidas para ver cómo vamos. Sin prisa.",
  },
  {
    id: "foto_progreso",
    categoria: "seguimiento",
    titulo: "Pedir foto de progreso",
    contenido:
      "{nombre}, si te apetece, súbeme una foto de progreso esta semana para comparar con la primera. Solo si te ves cómoda, ¿vale?",
  },

  // Motivación
  {
    id: "racha_animo",
    categoria: "motivacion",
    titulo: "Felicitar racha",
    contenido:
      "¡{nombre}, qué pasada de racha llevas! Estás siendo super constante 🔥 Sigue así.",
  },
  {
    id: "dia_dificil",
    categoria: "motivacion",
    titulo: "Día difícil",
    contenido:
      "{nombre}, sé que hay días que no apetece. Aunque sean 15 minutos a baja intensidad, suman muchísimo. Lo importante es no romper el hábito. ¡Tú puedes!",
  },
  {
    id: "celebrar_logro",
    categoria: "motivacion",
    titulo: "Celebrar logro",
    contenido:
      "¡{nombre}, esto es brutal! Has alcanzado el objetivo que nos pusimos. Te lo has currado tú, yo solo te he acompañado. Disfruta del logro 💪",
  },

  // Técnica / entreno
  {
    id: "tecnica_basica",
    categoria: "tecnica",
    titulo: "Recordar técnica",
    contenido:
      "{nombre}, recuerda con el {ejercicio}: peso en talones, espalda neutra, baja sin prisa. Si dudas, mándame un vídeo y lo revisamos.",
  },
  {
    id: "subir_peso",
    categoria: "tecnica",
    titulo: "Subir carga",
    contenido:
      "{nombre}, las últimas series las has hecho cómoda. Vamos a subir el peso esta semana — sigue las nuevas indicaciones del programa.",
  },
  {
    id: "bajar_peso",
    categoria: "tecnica",
    titulo: "Bajar carga",
    contenido:
      "{nombre}, no pasa nada si bajamos un poco el peso esta semana. Mejor hacer la técnica perfecta y subir de nuevo cuando estés lista. Sin estrés.",
  },

  // Informativos
  {
    id: "nuevo_programa",
    categoria: "informativos",
    titulo: "Nuevo programa",
    contenido:
      "{nombre}, te he asignado un programa nuevo. Échale un vistazo cuando puedas y me cuentas qué te parece.",
  },
  {
    id: "horario_cambio",
    categoria: "informativos",
    titulo: "Cambio de horario",
    contenido:
      "{nombre}, esta semana cambio mis horarios de atención. Estaré disponible de X a Y. Para urgencias, escríbeme y respondo en cuanto pueda.",
  },

  // Seguimiento con datos
  {
    id: "felicitar_evolucion_peso",
    categoria: "motivacion",
    titulo: "Felicitar evolución peso",
    contenido:
      "{nombre}, ¡{delta_peso} desde que empezamos! Estás siendo super constante. Sigue así 💪",
  },
  {
    id: "recordar_inactividad",
    categoria: "seguimiento",
    titulo: "Llevas X días sin entrenar (con número)",
    contenido:
      "Hola {nombre}, llevas {dias_sin_entrenar} días sin completar entreno. ¿Va todo bien? Si necesitas reajustar el plan o pausar unos días, sin problema — solo dime.",
  },
  {
    id: "resumen_semanal",
    categoria: "informativos",
    titulo: "Resumen semanal",
    contenido:
      "{nombre}, resumen rápido de la semana:\n• Adherencia: {adherencia_30d}\n• Último peso: {ultimo_peso} ({delta_peso})\n• Racha: {racha} días\n\n¡Vamos a por la siguiente!",
  },
];

export type DatosClientaParaPlantilla = {
  nombre: string;
  ultimoPesoKg?: number | null;
  pesoInicialKg?: number | null;
  racha?: number;
  adherencia30d?: number | null;
  diasSinEntrenar?: number | null;
};

export function rellenarPlantilla(
  plantilla: PlantillaMensaje,
  datos: DatosClientaParaPlantilla | string
): string {
  // Backward-compat: si se pasa un string, asumimos que es solo el nombre.
  const d: DatosClientaParaPlantilla =
    typeof datos === "string" ? { nombre: datos } : datos;

  const nombre = (d.nombre ?? "").trim();
  const peso =
    d.ultimoPesoKg != null ? `${d.ultimoPesoKg} kg` : "[peso pendiente]";
  const deltaPeso =
    d.ultimoPesoKg != null && d.pesoInicialKg != null
      ? (() => {
          const diff = d.ultimoPesoKg - d.pesoInicialKg;
          const signo = diff > 0 ? "+" : "";
          return `${signo}${diff.toFixed(1)} kg`;
        })()
      : "[evolución pendiente]";
  const racha = d.racha != null ? String(d.racha) : "0";
  const adherencia =
    d.adherencia30d != null ? `${d.adherencia30d}%` : "[adherencia pendiente]";
  const diasSin =
    d.diasSinEntrenar != null ? String(d.diasSinEntrenar) : "[sin datos]";

  return plantilla.contenido
    .replace(/\{nombre\}/g, nombre)
    .replace(/\{ultimo_peso\}/g, peso)
    .replace(/\{delta_peso\}/g, deltaPeso)
    .replace(/\{racha\}/g, racha)
    .replace(/\{adherencia_30d\}/g, adherencia)
    .replace(/\{dias_sin_entrenar\}/g, diasSin);
}

/** Lista de variables disponibles para mostrar como ayuda en la UI. */
export const VARIABLES_PLANTILLA = [
  { token: "{nombre}", descripcion: "Primer nombre de la clienta" },
  { token: "{ultimo_peso}", descripcion: "Última métrica de peso registrada" },
  { token: "{delta_peso}", descripcion: "Diferencia vs primer peso" },
  { token: "{racha}", descripcion: "Días seguidos entrenando" },
  { token: "{adherencia_30d}", descripcion: "% adherencia últimos 30 días" },
  {
    token: "{dias_sin_entrenar}",
    descripcion: "Días desde la última sesión completada",
  },
  { token: "{ejercicio}", descripcion: "Placeholder libre (lo escribes tú)" },
];
