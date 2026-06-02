# Roadmap de mejoras mi-hub — hasta 27-jun-2026

> Objetivo: dejar mi-hub lo mejor posible para pasar al plan **Pro de Supabase el 27-jun** con todo operativo.
> Objetivo de negocio: **reemplazo total de TrainerStudio** (gestión del coach + portal de la clienta).
> Formato: bloques de **3 sesiones de construcción + 1 de revisión** (preguntas-respuesta con click).
> Ritmo: se carga más en **findes + martes/jueves** (sesiones dobles); lunes/miércoles/viernes más ligeros.
> Flujo de trabajo: editar en local (`D:\Claude Code\mi-hub-desarrollo`) → push a GitHub (`AlvaroRtbS/mi-hub-desarrollo`) → Vercel redespliega.

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
- S1: Activar login de clientas + RLS de clienta.
- S2: La clienta ve su programa del día y marca series/sesión.
- S3: La clienta sube peso, medidas y fotos. Chat coach ↔ clienta.
- Revisión ✅

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

## Distribución orientativa (flexible)
- Sem. 1 (1-7 jun): Bloques 1 + 2
- Sem. 2 (8-14 jun): Bloques 3 + 4
- Sem. 3 (15-21 jun): Bloques 5 + 6
- Sem. 4 (22-27 jun): colchón + pulido final → Pro el 27
