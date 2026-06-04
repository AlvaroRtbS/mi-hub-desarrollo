# Mejoras propuestas — pool de 20 (por priorizar)

Propuesta 4-jun-2026. Dos focos: (A/B) que la **clienta** entre, lo entienda todo
sin esfuerzo y vea el **valor** real; (C) que el **coach** gane eficiencia y
retenga clientas. Esfuerzo orientativo: S (pequeño), M (medio), L (grande).

## A) Clienta — entrar y entender (simplicidad + claridad)
> Estado 4-jun: ✅ #1 (ya existía; +paso de Dieta) · ✅ #2/#6 ("Tus comidas de hoy" en Hoy) · ✅ #3 (login: olvidé contraseña + enlace mágico — PENDIENTE probar en vivo + allowlist Redirect URLs en Supabase) · ✅ #4 (explicador en Dieta) · ✅ #7 (formulario tipo asistente) · ⏸️ #5 (ayuda contextual: aplazado, poco valor en móvil con tooltips hover).

1. **Bienvenida guiada el primer día** (S) — 3-4 pantallas con tu marca: "esto es tu app, aquí ves tu entreno de hoy, tu dieta, tus fotos y hablas conmigo". Reduce el abandono del día 1.
2. **"Hoy" como pantalla héroe** (M) — lo primero al entrar: "Tu entreno de hoy" + "Tus comidas de hoy" + botón grande "Empezar". Que nunca se pregunte "¿y ahora qué hago?".
3. **Login sin fricción** (M) — enlace mágico por email + "olvidé contraseña". Las clientas pierden contraseñas; que un olvido no la bloquee.
4. **Mini-explicador de la dieta por equivalencias** (S) — la 1ª vez en Dieta: "1 ración = una porción; toca cualquier grupo para ver con qué cambiarlo". El método es potente pero nuevo para ella.
5. **Ayuda contextual (iconos "?")** (S) — glosario breve en RIR, ración, adherencia, etc.
6. **Checklist diario "qué hago hoy"** (M) — entreno ✓, comidas, pasos, foto si toca. La guía sin pensar.
7. **Formulario inicial tipo conversación** (M) — una pregunta por pantalla con barra de progreso, en vez de un formulario largo que intimida.

## B) Clienta — ver el VALOR (motivación y resultados)

8. **Pantalla "Tu evolución"** (M) — peso + medidas + foto antes/después + adherencia juntos, visual y motivador. (Ya hay comparador; falta la vista unificada de resultados.)
9. **Notificaciones push (PWA)** (L) — "tu entreno de hoy", "nuevo plan", "te toca check-in", "mensaje de Álvaro". Clave para uso recurrente y retención.
10. **Celebración de hitos** (S/M) — rachas, logros, "has perdido X kg", "4 semanas seguidas". La gamificación existe; hacerla más visible y emotiva.
11. **Resumen semanal para la clienta** (M) — "Tu semana: 3/3 entrenos, −0,4 kg, energía ↑". Refuerza el valor cada semana.
12. **Antes/después compartible** (M) — imagen bonita con foto + cifras que pueda guardar/compartir (opcional). Orgullo + marketing orgánico para ti.
13. **Feedback del coach que se sienta personal** (S) — ampliar el feedback post-sesión y los mensajes proactivos.

## C) Coach / Admin — eficiencia y retención

14. **Dashboard "Hoy necesitan tu atención"** (M) — clientas que no entrenaron, sin check-in, mensaje sin responder, peso estancado. Enfoca tu tiempo donde importa.
15. **Alertas de riesgo de abandono** (M) — adherencia < X% o sin actividad N días → aviso. Retención proactiva.
16. **Invitar clientas en lote + seguimiento del onboarding** (M) — ver quién activó la cuenta, reenviar invitación. CRÍTICO para el cambio desde TS.
17. **Respuestas rápidas en el chat** (S) — plantillas de mensajes frecuentes con un toque.
18. **Editor de programas más rápido** (L) — duplicar semana/día, arrastrar, progresión automática (+reps/semana).
19. **Informe semanal automático por clienta** (M) — brief para el coach (ya existe la idea en otra skill; traerlo a mi-hub con Gemini).
20. **Lista de compra autogenerada + PDF del plan de nutrición** (M) — cierra el sprint 3 de nutrición; valor directo para la clienta y ahorro de tiempo para ti.

## Notas
- Solapan con la cola actual: #16 = activar clientas (bloqueante), #20 = sprint 3 nutrición, #9 = notificaciones.
- Pendiente: priorizar contigo y repartir en el `ROADMAP-MEJORAS.md` (semanas 1-4 hasta el 27-jun).
