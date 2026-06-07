-- ============================================================================
-- Importar plantillas de formulario desde TrainerStudio
-- ----------------------------------------------------------------------------
-- Recrea como plantillas del constructor genérico (tabla `formularios`) los
-- formularios que Álvaro usaba en TrainerStudio. Las preguntas se extrajeron
-- VERBATIM del activity feed del conector (formularios ya enviados por clientas)
-- y se mapean al tipo más cercano de los 7 de mi-hub.
--
-- Mapeo de tipos: los check-in de TS mezclan una nota (1-10 / 0-5) con texto
-- libre, así que se mapean a `parrafo` (no a `escala`, que es 1-5 puro). La
-- única pregunta de opción cerrada es la de "variedad" de la valoración de
-- alimentación -> `eleccion`.
--
-- Idempotente: no inserta un formulario si el coach ya tiene uno con ese título.
-- Resuelve el coach por email (ajusta el email si tu coach es otro).
-- NO toca el "Formulario inicial" hardcodeado (lib/formulario-inicial.ts); la
-- jubilación de ese flujo es una fase 2 aparte.
-- ============================================================================

do $$
declare
  v_coach uuid;
begin
  select id into v_coach from public.coaches
   where email = 'alvaroarisquetaalonso@gmail.com'
   limit 1;
  -- Fallback: instancia de un solo coach.
  if v_coach is null then
    select id into v_coach from public.coaches limit 1;
  end if;
  if v_coach is null then
    raise exception 'No hay ningún coach en public.coaches';
  end if;

  insert into public.formularios (coach_id, titulo, descripcion, preguntas)
  select v_coach, t.titulo, t.descripcion, t.preguntas
  from (values

    -- 1) CUESTIONARIO SEMANAL --------------------------------------------------
    ('Cuestionario Semanal',
     'Check-in semanal de seguimiento (importado de TrainerStudio).',
     $j$[
       {"id":"p1","tipo":"parrafo","requerida":true,"label":"Nivel de cumplimiento (0-5): Si es menos de 4, ¿cuál fue la principal barrera (tiempo, energía, estrés)?."},
       {"id":"p2","tipo":"parrafo","requerida":true,"label":"Victoria No-Báscula de la semana: ¿Qué pequeño éxito has tenido que no tenga que ver con el peso (más energía, mejor ropa, disfrutaste un entrenamiento)?."},
       {"id":"p3","tipo":"parrafo","requerida":true,"label":"Relación con la comida: ¿Has disfrutado de tus comidas sin sentir culpa o necesidad de \"compensar\"?."},
       {"id":"p4","tipo":"parrafo","requerida":true,"label":"Feedback técnico: ¿Hay algún ejercicio que te haya generado dudas o incomodidad física?."},
       {"id":"p5","tipo":"parrafo","requerida":true,"label":"Gestión del contexto: Del 1 al 10, ¿cómo ha sido tu nivel de estrés y calidad de sueño esta semana?."},
       {"id":"p6","tipo":"parrafo","requerida":false,"label":"Soporte urgente: ¿Hay algo específico en lo que necesites mi ayuda ahora mismo para empezar bien la próxima semana?."}
     ]$j$::jsonb),

    -- 2) CUESTIONARIO MENSUAL --------------------------------------------------
    ('Cuestionario Mensual',
     'Revisión mensual de progreso y enfoque (importado de TrainerStudio).',
     $j$[
       {"id":"p1","tipo":"parrafo","requerida":true,"label":"Satisfacción general (1-10): ¿Cómo de cerca te sientes de tus objetivos iniciales?."},
       {"id":"p2","tipo":"parrafo","requerida":true,"label":"Evolución del autoconcepto: ¿Cómo ha cambiado tu percepción sobre el ejercicio? ¿Te sientes más cómoda realizándolo?."},
       {"id":"p3","tipo":"parrafo","requerida":true,"label":"Análisis de cambios físicos: Más allá del peso, ¿qué cambios notas en ti? (ejemplos: Más ligereza, menos cansancio, dormir mejor...)."},
       {"id":"p4","tipo":"parrafo","requerida":true,"label":"Barreras del próximo mes: ¿Tienes algún evento, viaje o pico de trabajo que debamos tener en cuenta para adaptar tu plan?."},
       {"id":"p5","tipo":"parrafo","requerida":true,"label":"Valor del soporte: ¿Sientes que el horario y la forma de soporte (WhatsApp/App) están siendo útiles para ti?."},
       {"id":"p6","tipo":"parrafo","requerida":true,"label":"Ajuste de la brújula: ¿Seguimos con el mismo objetivo principal o han cambiado tus prioridades?."}
     ]$j$::jsonb),

    -- 3) CUESTIONARIO FINAL DE CICLO (trimestral / fin de ciclo) ---------------
    ('Cuestionario Final de ciclo',
     'Revisión de cierre de ciclo / trimestre (importado de TrainerStudio).',
     $j$[
       {"id":"p1","tipo":"parrafo","requerida":true,"label":"1. Satisfacción Global (1-10): En una escala del 1 al 10, ¿cuál es tu grado de satisfacción general con el programa hasta hoy?."},
       {"id":"p2","tipo":"parrafo","requerida":true,"label":"2. Atención y Soporte (1-10): ¿Cómo calificarías mi acompañamiento y la resolución de tus dudas durante estos tres meses?."},
       {"id":"p3","tipo":"parrafo","requerida":true,"label":"3. Posibilidad de recomendación: ¿Con qué probabilidad recomendarías este servicio a un amigo o familiar que se sienta como tú te sentías al principio?."},
       {"id":"p4","tipo":"parrafo","requerida":true,"label":"4. Cambio de Identidad: ¿Sientes que ha cambiado tu relación con el ejercicio? (Ej: ¿Has pasado de verlo como un \"castigo\" a verlo como un \"momento para ti\"?)."},
       {"id":"p5","tipo":"parrafo","requerida":true,"label":"5. \"Mejor hecho que perfecto\": Cuéntame si ha habido un momento de estos tres meses en el que las cosas \"no fueron perfectas\" (estrés, viajes, cenas), pero fuiste capaz de aplicar la Acción Masiva Imperfecta y seguir adelante en lugar de abandonar."},
       {"id":"p6","tipo":"parrafo","requerida":true,"label":"6. Tu Mayor Orgullo: ¿De qué cambio (físico o mental) te sientes especialmente orgullosa de haber conseguido en estos 90 días?."},
       {"id":"p7","tipo":"parrafo","requerida":true,"label":"7. Feedback Constructivo: Si pudieras cambiar o añadir una sola cosa para que tu experiencia fuera aún mejor, ¿qué sería?."},
       {"id":"p8","tipo":"parrafo","requerida":true,"label":"8. Próximo \"Punto B\": ¿Cuál es el nuevo objetivo o reto que te gustaría \"conquistar\" en los próximos 3 meses?."}
     ]$j$::jsonb),

    -- 4) VALORACIÓN INICIAL (¡Quiero conocerte mejor!) -------------------------
    ('Valoración inicial (¡Quiero conocerte mejor!)',
     'Cuestionario de onboarding / entrenamiento (importado de TrainerStudio).',
     $j$[
       {"id":"p1","tipo":"parrafo","requerida":true,"label":"1. Empecemos fácil, ¿Cómo te llamas (y/o cómo te gusta que te llamen)? ¿Qué edad tienes? ¿Cúales son tu estatura y peso actuales?\n\nNombre y Apellidos / Fecha de nacimiento (edad) / Estatura (cm) / Peso (en kg)\n\nFecha de Nacimiento (y Edad):\n\nEstatura (en centímetros):\n\nPeso (en kilogramos):"},
       {"id":"p2","tipo":"parrafo","requerida":false,"label":"1.1. ¿Te gustaría contarme un poco QUIÉN ERES? (Si te apetece hablar de ello, me encantaría conocer quien está detrás de la pantalla y saber un poco más de ti y de cómo eres y te percibes)\n\nEjemplo: Profesión a la que te dedicas, algún hobby concreto que disfrutes...\n\n*Aunque pueda parecer que no, el saber este tipo de cosas me puede ayudar un poco más a conocerte y a que el programa sea más adaptado."},
       {"id":"p3","tipo":"parrafo","requerida":true,"label":"2. ¿Cuánto tiempo dispones para entrenar a la semana?\n\n(Ejemplo: PUEDO entrenar lunes, miércoles, y sábado de 09:00-10:30)"},
       {"id":"p4","tipo":"parrafo","requerida":true,"label":"3. Con respecto a la cuestión anterior, a pesar de disponer del tiempo que hayas marcado, ¿CUÁNTO te gustaría realmente dedicarle? (ejemplo: Igual puedes dedicarle 4 horas a la semana, pero ahora mismo no te apetece/estás dispuesto/a dedicarle más de 2 horas semanales. Recuerda que MÁS NO ES MEJOR y lo importante es que tú estés a gusto y te veas capaz de dedicarle X tiempo a la semana)"},
       {"id":"p5","tipo":"parrafo","requerida":false,"label":"4. (OPCIONAL) Para terminar con el tema de disponibilidad, ¿Hay alguna otra cosa que creas conveniente que sepa para preparar tu estilo de entrenamiento? (ejemplo: Tiendes a viajar a menudo, trabajas a turnos y no siempre puedes los mismos días y mismas horas...)"},
       {"id":"p6","tipo":"parrafo","requerida":true,"label":"5. Me gustaría saber qué material tienes disponible (si hay alguno que no conoces, o no sabes cómo se llama, no te preocupes, este tema podemos mirarlo más en profundidad por WhatsApp)\n\nAlgunos ejemplos de respuesta: Mancuernas de X peso / Kettlebell de X peso / TRX / Gomas de Resistencia / Garrafas de agua de 5 litros / Barra de 10 kilos / No dispongo de material ..."},
       {"id":"p7","tipo":"parrafo","requerida":false,"label":"6. (OPCIONAL) Te dejo este espacio por si quieres especificar algo más relativo al material que consideres conveniente (más material del que yo he mencionado, posibilidad de comprar nuevo material...). Lo que se te ocurra escríbelo aquí\n\n(Ejemplo: Tengo TRX pero la puerta a la que lo anclo está rota y no me siento segura cuando lo uso)"},
       {"id":"p8","tipo":"parrafo","requerida":true,"label":"7. (MUY IMPORTANTE) Me gustaría saber si hay algo a nivel MÉDICO o respecto a algún aspecto de tu salud en concreto que creas que es importante que tenga en cuenta (lesiones previas, dolores en X zona, dificultad de descanso y recuperación...) y que quieras desarrollar (aunque ya lo hayamos podido hablar, me ayuda tenerlo por escrito y bien desarrollado)"},
       {"id":"p9","tipo":"parrafo","requerida":true,"label":"8. (MUY IMPORTANTE) Me gustaría saber si hay algo a nivel PERSONAL que creas que es importante que tenga en cuenta (no me gusta mucho X actividad, me da cierto miedo/respeto algunos ejercicios, no me gusta entrenar en público o con mucha gente alrededor ya que me agobio bastante...).\n\n*Conocer este tipo de cosas me hace que tenga un mayor conocimiento de tus preferencias y así intentar que estés lo más \"cómoda\" a lo largo de este proceso que llevaremos a cabo"},
       {"id":"p10","tipo":"parrafo","requerida":true,"label":"9. A pesar de que ya lo hayamos hablado, me gustaría que dejases por escrito (por si quieres desarrollarlo todo lo que quieras):\n\n¿QUÉ es lo que te ha hecho hoy estar aquí, empezando conmigo?\n\n(Vamos a decir que sería el \"OBJETIVO\" que te gustaría conseguir con este proceso que vamos a llevar a cabo)"},
       {"id":"p11","tipo":"parrafo","requerida":false,"label":"10. (OPCIONAL). Con respecto a la cuestión anterior, si te apetece hablar de ello ¿Qué te hace sentir empezar este proceso? ¿Qué te despierta? (Ejemplo: Ilusión pero cierto miedo, algo de desconfianza, muchas ganas y mucha motivación...)"}
     ]$j$::jsonb),

    -- 5) VALORACIÓN INICIAL ALIMENTACIÓN ---------------------------------------
    ('Valoración inicial ALIMENTACIÓN',
     'Cuestionario inicial de nutrición (importado de TrainerStudio). Sus respuestas pueden volcarse al perfil dietético (clientas.dieta_restricciones) en una fase posterior.',
     $j$[
       {"id":"p1","tipo":"parrafo","requerida":true,"label":"¿Cuántas veces comes al día? ¿Y cuántas te gustaría comer?"},
       {"id":"p2","tipo":"parrafo","requerida":true,"label":"¿Qué alimentos te gustan más y que alimentos te gustan menos?\n\n(Es muy IMPORTANTE que lo detalles para luego el menú que te prepare sea lo más adaptado a tus gustos a la vez que nos ayude a conseguir el objetivo)"},
       {"id":"p3","tipo":"parrafo","requerida":true,"label":"¿Me puedes hacer un RECUERDO ALIMENTARIO (Intentar describir de forma más o menos precisa lo que puedes comer normalmente durante el día)?\n\nEs una PREGUNTA MUY IMPORTANTE Y EN EL QUE ES NECESARIO SER MUY SINCERA.\n\n(Intenta hacerlo de un día entre semana y de un día del fin de semana)"},
       {"id":"p4","tipo":"parrafo","requerida":true,"label":"¿Tienes alguna alergia/intolerancia a algún alimento?"},
       {"id":"p5","tipo":"eleccion","requerida":true,"label":"Prefieres que haya: (nivel de variedad en las comidas)","opciones":["MUCHA variedad (repetir como mucho 1 o 2 veces el mismo plato en la semana)","ALGO DE VARIEDAD (repetir un máximo de 3-4 veces el mismo plato en la semana)","NO HACE FALTA QUE HAYA DEMASIADA VARIEDAD (un mismo plato puede repetirse 5 o + veces en la semana)"]},
       {"id":"p6","tipo":"parrafo","requerida":false,"label":"¿Hay algo en tu contexto personal que crees que es importante que sepa a la hora de intentar que controlemos el aspecto de la alimentación? (Ejemplos: \"Trabajo en un colegio y me quedo a comer en el comedor y como lo que haya\" o \"Entre semana no hay problema pero el finde sí que me gusta ir a cenar fuera con amigos/pareja y me gustaría mantenerlo\" o \"En X situación me pasa que llego muy hambrienta de trabajar y me cuesta controlar el apetito\")\n\nNo pasa nada si ocurren ejemplos como los mencionados, pero saberlo me ayudará más a poder enfocar de una manera u otra las estrategias que tomaremos para cumplir el plan lo mejor posible."},
       {"id":"p7","tipo":"parrafo","requerida":false,"label":"¿Hay alguna pregunta/duda con respecto al apartado de alimentación que no haya sido tratada en este cuestionario?\n\n(Si es el caso, estaré encantado de que en este me lo cuentes con lujo de detalles)"}
     ]$j$::jsonb)

  ) as t(titulo, descripcion, preguntas)
  where not exists (
    select 1 from public.formularios f
    where f.coach_id = v_coach and f.titulo = t.titulo
  );

  raise notice 'Importación de formularios TS completada para coach %', v_coach;
end $$;
