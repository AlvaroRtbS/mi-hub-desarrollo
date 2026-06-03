// Definición del "Formulario inicial" (cuestionario de onboarding que rellena
// la clienta dentro de la app). Las preguntas son fijas (MVP); las respuestas
// se guardan en la tabla formulario_respuestas keyed por el `id` de cada una.

export type PreguntaTipo = "texto" | "parrafo" | "numero" | "fecha";

export type Pregunta = {
  id: string;
  label: string;
  tipo: PreguntaTipo;
  placeholder?: string;
  sufijo?: string;
};

export const FORMULARIO_INICIAL_TIPO = "inicial";

export const FORMULARIO_INICIAL: {
  titulo: string;
  intro: string;
  preguntas: Pregunta[];
} = {
  titulo: "Formulario inicial",
  intro:
    "Cuéntame un poco sobre ti para ajustar bien tu plan. Solo lo verá tu entrenador. Tardas un par de minutos.",
  preguntas: [
    {
      id: "objetivo",
      label: "¿Cuál es tu objetivo principal?",
      tipo: "parrafo",
      placeholder: "Perder grasa, ganar fuerza, sentirme mejor…",
    },
    { id: "peso_actual", label: "Peso actual", tipo: "numero", sufijo: "kg" },
    { id: "altura", label: "Altura", tipo: "numero", sufijo: "cm" },
    { id: "fecha_nacimiento", label: "Fecha de nacimiento", tipo: "fecha" },
    {
      id: "lesiones",
      label: "¿Tienes lesiones o limitaciones?",
      tipo: "parrafo",
      placeholder: "Rodilla, espalda, ninguna…",
    },
    {
      id: "experiencia",
      label: "¿Qué experiencia tienes entrenando?",
      tipo: "parrafo",
      placeholder: "Nunca, algo de gimnasio, varios años…",
    },
    {
      id: "disponibilidad",
      label: "¿Qué días y cuánto tiempo puedes entrenar a la semana?",
      tipo: "parrafo",
      placeholder: "Ej: lunes, miércoles y viernes, 1 hora",
    },
    {
      id: "material",
      label: "¿Qué material tienes disponible?",
      tipo: "parrafo",
      placeholder: "Gimnasio, mancuernas en casa, bandas elásticas…",
    },
    {
      id: "alimentacion",
      label: "Alergias, intolerancias o alimentos que no toleras",
      tipo: "parrafo",
      placeholder: "Lactosa, gluten, no como pescado…",
    },
    {
      id: "algo_mas",
      label: "¿Algo más que deba saber?",
      tipo: "parrafo",
      placeholder: "Lo que quieras contarme",
    },
  ],
};
