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
| 6 — Datos reales + pulido pre-Pro | 🟡 | Datos migrados (fotos, métricas); panel activación (#16) listo (clientas sin invitar → lanzamiento). **Branding ✅** (marca RTBS morada #6a517b en panel/portal/login) + **responsive ✅** (tablas con scroll). Solo falta: storage/cuota (→ Pro 27-jun) y activar clientas (lanzamiento) |

**Extras hechos (no estaban en el plan):** PWA instalable, constructor de formularios genérico, perfil dietético, IA migrada a Gemini free, centrado/ancho del panel. **Migración TS completada:** métricas normalizadas, circuitos del programa, 40 fotos de progreso, pasos. **Pool hecho:** A#1-4,6,7 · B#8,9(push),11 · C#16.

**Lo que queda de verdad para el 27 (en orden de prioridad):**
1. 🔌 **Cabos de config:** ✅ enlace mágico (#3, Redirect URLs `…/**` en Supabase) y push (#9, VAPID en Vercel) configurados — falta solo el test final (email + móvil). Migraciones recientes todas aplicadas ✅. Crons 📋 **diferidos a Pro** (no hay `vercel.json`, Hobby limita crons, y el middleware redirige `/api/cron`). ⚠️ Supabase Free marca **"EXCEEDING USAGE LIMITS"** → revisar cuota de storage antes del 27.
2. 🎯 **Activar a las clientas reales** — panel #16 hecho y flujo verificado; *ejecutar* en el lanzamiento (finales jun). Diferido por decisión.
3. 📋 Importar los 5 formularios de TrainerStudio como plantillas (en curso en otra sesión).
4. 🟡 Pulido Bloque 6: branding ✅ + responsive ✅ hechos (7-jun); queda cuota de storage (→ Pro) y bugs finales.
5. ✅ Huecos de TS (7-jun): **circuitos en el EDITOR con rondas** ✅, **comentario + foto por-ejercicio de la clienta** ✅. Quedan opcionales menores: vídeo adjunto (bucket nuevo), cuestionarios mensuales de TS, conjuntos de métricas auto-asignables.
6. 🟡/🔴 Bloque 5 (chatbot del coach con Gemini) — opcional.
7. ✅ **Pool de 20 COMPLETO** (7-jun: #12 antes/después compartible, #15 alerta de abandono hechos; #17 respuestas rápidas ya existía en el chat). Quedan solo tareas de FECHA: pasar a Pro + activar clientas (lanzamiento), y opcionales: huecos de TS (circuitos en el editor, adjunto por-ejercicio). Ver `docs/MEJORAS-PROPUESTAS.md`.

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

---

## CRM — capa comercial sobre mi-hub (iniciado 7-jun-2026)

> Objetivo: seguimiento comercial de clientas (funnel, pagos, contrato/RGPD) sin
> reconstruir nada. Se integra encima del esquema existente en **español + RLS por
> coach**. La mayoría del CRM "clásico" ya existía en mi-hub (clientas, métricas,
> checkins, fotos, notas, todos) — solo se añade lo que faltaba.

**Decisión de plataforma de pago:** Stripe, cobrando por **SEPA Direct Debit**
(domiciliación) las cuotas recurrentes (0,8% + 0,30 € vs ~1,5% tarjeta), con
tarjeta/Bizum de respaldo. Las suscripciones se gestionan en mi-hub (tabla propia),
**no con Stripe Billing**, para esquivar el +0,7%.

- ✅ **Fase 1 — Capa comercial sobre `clientas` (7-jun, APLICADA en Supabase):**
  migración `20260607000001_crm_fase1_clientas_comercial.sql`. Columnas nuevas
  (nullable, aditivas): `etapa` (funnel: lead/activa/pausada/baja/recuperable,
  **independiente de `estado`**), `lead_source`, `whatsapp_phone`,
  `es_avatar_objetivo`, `objetivo_principal`, `ciudad`, `condiciones_medicas`,
  `lesiones_limitaciones`, `material`, `notas_contexto`, `stripe_customer_id`.
  Trigger `clientas_proteger_columnas()` endurecido (congela campos comerciales
  frente a auto-edición de la clienta). Tipo `Clienta` ampliado + **WhatsApp-lite**
  (botón `wa.me/…` en la cabecera de la ficha). Typecheck OK.
- 🟡 **Fase 2 — Consentimientos / contrato RGPD (7-jun, fontanería lista):**
  Contrato = Google Form "Peso a Paso" (forms.gle/AdFfX7yMc2TF6Grs9). Detección
  de firma **por email** (la clienta lo escribe en el form).
  - ✅ Migración `20260607000002_crm_fase2_consentimientos.sql` (tabla
    `consentimientos`: contrato_servicios / datos_salud / imagen, RLS por coach).
  - ✅ Endpoint `POST /api/consentimientos/firma` (secreto en cabecera +
    service_role; casa por email y marca firmado/rechazado).
  - ✅ Apps Script `docs/contrato-apps-script.gs` (onFormSubmit → endpoint).
  - 📋 PENDIENTE Álvaro: aplicar migración en Supabase; añadir env en Vercel
    (`CONTRATO_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`); instalar el Apps
    Script + activador en el formulario.
  - ✅ Apps Script instalado + autorizado + activador "Al enviarse el formulario"
    activo (8-jun). Probado end-to-end (firma de prueba → `firmado` en BD).
  - ✅ Wiring UI (8-jun): badge de estado en la ficha + panel "Contrato de
    servicios" (botones "Enviar contrato" por el chat y "Marcar firmado a mano")
    + gate RGPD en `cambiarEstadoClienta` (no activa sin contrato firmado).
  - ⚠️ Detección por email: si la clienta usa un email distinto al de su ficha,
    la firma llega pero no casa → usar "Marcar firmado a mano".
- 📋 **Fase 3 — Inscripciones + pagos (registro manual) + dashboard:** tablas
  `inscripciones` (con `renewal_date`) + `pagos` (multi-origen: stripe/sepa/bizum/
  transferencia). Dashboard de pagos: estado por clienta + próximas renovaciones +
  clientas en riesgo.
- 📋 **Fase 4 — Stripe webhook:** aplazada hasta tener volumen recurrente real.

> Brief original (de Claude chat): `E:\RTBS\RTBS 2.0\Claude\crm-rtbs-brief-claude-code.md`.
> Adaptado a la realidad de mi-hub (español, RLS por coach, sin duplicar tablas).
