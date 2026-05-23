// Plantillas de mensajes predefinidas para el chat.
// La coach las inserta con un click y luego puede editarlas antes de enviar.
// El placeholder {nombre} se sustituye por el primer nombre de la clienta.

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
];

export function rellenarPlantilla(
  plantilla: PlantillaMensaje,
  nombre: string
): string {
  return plantilla.contenido.replace(/\{nombre\}/g, nombre.trim());
}
