# Roadmap de mejoras mi-hub — hasta 27-jun-2026

> Objetivo: dejar mi-hub lo mejor posible para pasar al plan **Pro de Supabase el 27-jun** con todo operativo.
> Objetivo de negocio: **reemplazo total de TrainerStudio** (gestión del coach + portal de la clienta).
> Formato: bloques de **3 sesiones de construcción + 1 de revisión** (preguntas-respuesta con click).
> Ritmo: se carga más en **findes + martes/jueves** (sesiones dobles); lunes/miércoles/viernes más ligeros.
> Flujo de trabajo: editar en local (`D:\Claude Code\mi-hub-desarrollo`) → push a GitHub (`AlvaroRtbS/mi-hub-desarrollo`) → Vercel redespliega.

## Estado real (actualizado 6-jun-2026)

Vamos **~1,5-2 semanas adelantados** sobre el plan original. Resumen por bloque:

| Bloque | Estado | Nota |
|---|---|---|
| 1 — Cimientos | ✅ | Hecho |
| 2 — Portal clienta + chat | ✅ | Esencial + rediseño, PWA, loading states. Falta pulido Fase C |
| 3 — Entrenamiento | 🟡 | Ejercicios/programas migrados; **circuitos de TS expandidos a ejercicios reales** (import); IA a Gemini free. Falta: circuitos en el EDITOR + pulir editor |
| 4 — Nutrición + seguimiento | ✅ | **Superado**: equivalencias + tabla + generador + perfil dietético + métricas + comparador fotos + **pasos diarios** (manual + atajo iPhone) |
| 5 — Asistente IA web (chatbot) | 🔴 | No empezado; iría con Gemini free |
| 6 — Datos reales + pulido pre-Pro | 🟡 | Datos migrados (incl. **fotos** y **métricas normalizadas**); **panel de activación de clientas construido (#16)** pero clientas aún sin invitar (diferido al lanzamiento). Falta storage/cuota y branding/responsive |

**Extras hechos (no estaban en el plan):** PWA instalable, constructor de formularios genérico, perfil dietético, IA migrada a Gemini free, centrado/ancho del panel. **Migración TS completada:** métricas normalizadas, circuitos del programa, 40 fotos de progreso, pasos. **Pool hecho:** A#1-4,6,7 · B#8,9(push),11 · C#16.

**Lo que queda de verdad para el 27 (en orden de prioridad):**
1. 🔌 **Cabos de config que desbloquean features YA construidas:** allowlist Redirect URLs en Supabase (#3 enlace mágico) + claves VAPID en Vercel (#9 push) + confirmar migraciones "pendientes de aplicar".
2. 🎯 **Activar a las clientas reales** — panel #16 hecho y flujo verificado; *ejecutar* en el lanzamiento (finales jun). Diferido por decisión.
3. 📋 Importar los 5 formularios de TrainerStudio como plantillas (en curso en otra sesión).
4. 🟡 Pulido Bloque 6: cuota de storage de fotos + branding/responsive + bugs finales.
5. 📋 Huecos de TS restantes: **circuitos/superseries en el EDITOR** (el import ya los expande), adjunto/comentario por-ejercicio de la clienta, cuestionarios mensuales de TS.
6. 🟡/🔴 Bloque 5 (chatbot del coach con Gemini) — opcional.
7. 🎯 **Pool restante:** A#5 · B#10,12,13 · C#14,15,17,18,19,20 (ver `docs/MEJORAS-PROPUESTAS.md`).

## Bloques

### Bloque 1 — Cimientos
- S1 ✅ (2-jun): entorno local conectado a Supabase, `npm install`, app arranca, typecheck + build OK. Rama de trabajo `roadmap-mejoras`. *(Verificar deploy Vercel: pendiente de confirmar en el dashboard.)*
- S2 ✅ (2-jun): recorrido del flujo core (login → clienta → programa → asignar) verificado en vivo. Bugs bloqueantes arreglados:
  - `fecha_fin` de asignación se calculaba mezclando UTC y hora local → desfase ±1 día en Vercel. Corregido a UTC.
  - "Cambiar programa" ahora **reemplaza** (desactiva la asignación activa previa): una clienta = un programa activo.
  - `inicio`: guard de sesión (evita crash 500 con sesión expirada).
  - `eliminarClienta`: ya no traga el error de Supabase (no más "borrada" en falso).
  - Verificado contra la BD real: 1 sola asignación activa tras reasignar y fecha correcta.
- S3 ✅ (2-jun, sesión nocturna): auditado Inicio — las queries de KPIs son correctas (no se tocó nada subjetivo de UI sin tu visto bueno). Como "bugs menores" se añadieron guardas anti-crash al renderizar estructuras JSONB (Inicio, calendario, programa por-clienta): un `estructura_snapshot` null/malformado ya no tumba la página con 500.
- Revisión ✅ (pendiente repaso en vivo en navegador antes de mergear a main)

> **Barrido de robustez/seguridad ✅ (2-jun, sesión nocturna):**
> - Defensa en profundidad: `.eq("coach_id", ...)` añadido a todos los `update`/`delete` de clientas, ejercicios, programas y snapshot de asignaciones (RLS ya protegía; esto es belt-and-suspenders).
> - `eliminarEjercicio` y `eliminarPrograma` dejan de tragar el error (eran `void`) → devuelven `ResultadoAccion` y los llamadores lo muestran.
> - Validación server-side: formato de fecha en `asignarPrograma` y `fecha_nacimiento`; teléfono.
> - Búsqueda de clientas saneada antes del `.or(...ilike)`.
> - Subida: validación de tamaño por bucket en cliente (15/25/150 MB).
>
> **Pendiente (no urgente):**
> - Limpiar archivos huérfanos en Storage al cambiar/quitar vídeos (NO hecho a propósito: borrar objetos sin supervisión es arriesgado; lo vemos juntos).
> - Endurecer `middleware.ts` ante error transitorio de la query de coach (hoy un fallo puntual trata al coach como clienta y lo manda a /c/hoy). NO tocado a propósito: es auth sensible y no se puede testear en vivo sin supervisión.
> - Badge "personalizado" del editor por-clienta compara contra la plantilla VIVA, no contra el snapshot del momento de asignar (si editas la plantilla base después, marca todo como personalizado). Requiere guardar snapshot original → decisión de diseño.

### Bloque 2 — Portal de la clienta + chat
> **Hallazgo de la auditoría (3-jun):** el portal `/c/*` ya estaba ~80% construido
> (onboarding por invitación, entreno del día con registro, métricas, fotos,
> nutrición, perfil, chat con realtime). El Bloque 2 es **activar + arreglar +
> pulir**, no construir.

**Fase A — usable por una clienta real (3-jun):**
- ✅ Onboarding: login redirige por rol; `/i/[token]` con server client; layout de
  clienta sin bucle si la cuenta no está enlazada.
- ✅ Fotos coach↔clienta: ruta unificada `coach_id/clienta_id/archivo` + migración
  `20260603000000` (APLICADA en Supabase).
- ✅ Acción de Álvaro: "Confirm email" desactivado en Supabase.
- ⏳ PENDIENTE: test en vivo end-to-end (invitar clienta real → subir foto → coach la ve).

**Fase B — correctness/seguridad (3-jun, en curso):**
- ✅ `/c/hoy`: fecha de "hoy" con zona horaria Europe/Madrid (antes UTC → día equivocado de madrugada).
- ✅ Migración `20260603000001`: trigger que impide a la clienta cambiar columnas sensibles (PENDIENTE de aplicar en Supabase).
- ⏳ DIFERIDO a sesión supervisada (ruta crítica, probar en vivo): upsert anti-carrera en `sesiones`; mover marcado de "leído" de mensajes fuera del render.

**Fase C — pulido (pendiente):** limpiar huérfanos en Storage al borrar fotos;
realtime de UPDATE para "visto"; permitir a la clienta borrar su última métrica/foto;
"olvidé contraseña" para clienta; perf de la lista de mensajes del coach.

### Bloque 3 — Entrenamiento
- S1: Pulir editor de programas (drag&drop, duplicar, plantillas).
- S2: Biblioteca de ejercicios (vídeos, búsqueda, grupos musculares).
- S3: Activar generación de programas con IA (Claude).
- Revisión ✅

### Bloque 4 — Nutrición + seguimiento
- S1: Planes de nutrición (método de equivalencias) + listas de compra.
- S2: Métricas + gráficas de evolución y adherencia.
- S3: Fotos de progreso + comparador antes/después.
- Revisión ✅

### Bloque 5 — Asistente IA en la web (chatbot)
- S1: Chatbot para el coach (consulta datos de clientas en Supabase).
- S2: Contexto y herramientas del asistente (tareas habituales).
- S3: Pulido. (Asistente para la clienta = fase 2, más adelante.)
- Nota: usa la API de Anthropic de pago (no el plan MAX local). Coste bajo por uso.
- Revisión ✅

### Bloque 6 — Datos reales + pulido pre-Pro
- S1: Meter/migrar clientas reales.
- S2: Optimizar storage de fotos (resolver la cuota Free) + limpieza.
- S3: Branding, responsive móvil, últimos bugs.
- Revisión final ✅ → paso a Pro el 27.

## Fuera de alcance (decidido)
- Integración WhatsApp en mi-hub (la API oficial de Meta es compleja/cara; el bot local de WhatsApp ya cubre el archivado por separado).

## Distribución orientativa (ORIGINAL — superada, ver "Estado real" arriba)
- Sem. 1 (1-7 jun): Bloques 1 + 2
- Sem. 2 (8-14 jun): Bloques 3 + 4
- Sem. 3 (15-21 jun): Bloques 5 + 6
- Sem. 4 (22-27 jun): colchón + pulido final → Pro el 27

## Reparto real propuesto (al 4-jun, vamos adelantados)
- **Sem. 1 restante (4-7 jun):** activar clientas reales (onboarding/invitaciones) + importar formularios de TS + mejoras rápidas de UX clienta (pool).
- **Sem. 2 (8-14 jun):** mejoras de valor/visibilidad para la clienta + dashboard de atención del coach (pool) + pulido editor de programas.
- **Sem. 3 (15-21 jun):** notificaciones/recordatorios + lista de compra/PDF de nutrición + (opcional) chatbot del coach con Gemini.
- **Sem. 4 (22-27 jun):** colchón, branding/responsive, cuota de storage, bugs finales → Pro el 27.

> El pool de 20 mejoras propuestas vive en `docs/MEJORAS-PROPUESTAS.md` (pendiente de priorizar contigo).
