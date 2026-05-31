# Roadmap de mejoras mi-hub — hasta 27-jun-2026

> Objetivo: dejar mi-hub lo mejor posible para pasar al plan **Pro de Supabase el 27-jun** con todo operativo.
> Objetivo de negocio: **reemplazo total de TrainerStudio** (gestión del coach + portal de la clienta).
> Formato: bloques de **3 sesiones de construcción + 1 de revisión** (preguntas-respuesta con click).
> Ritmo: se carga más en **findes + martes/jueves** (sesiones dobles); lunes/miércoles/viernes más ligeros.
> Flujo de trabajo: editar en local (`D:\Claude Code\mi-hub-desarrollo`) → push a GitHub (`AlvaroRtbS/mi-hub-desarrollo`) → Vercel redespliega.

## Bloques

### Bloque 1 — Cimientos
- S1: Conectar entorno local a Supabase (env vars), `npm install`, arrancar app, build OK, rama de trabajo. Verificar deploy Vercel.
- S2: Recorrer flujo core (login → clienta → ejercicio → programa → asignar), anotar y arreglar bugs bloqueantes.
- S3: Pulir Inicio (KPIs reales) + bugs menores.
- Revisión ✅

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
