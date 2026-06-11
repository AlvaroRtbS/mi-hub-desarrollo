# Manual del administrador (coach) — mi-hub

> Cómo usar el panel día a día, sin tener que descubrirlo probando.
> URL: `https://mi-hub-desarrollo.vercel.app` · Entra con tu cuenta de coach y aterrizas en **Inicio**.
> Última actualización: 11 de junio de 2026.

---

## Índice

1. [El día a día en 5 minutos](#1-el-día-a-día-en-5-minutos)
2. [Inicio: tu cuadro de mandos](#2-inicio-tu-cuadro-de-mandos)
3. [Clientas: alta, invitación y estados](#3-clientas-alta-invitación-y-estados)
4. [La ficha de clienta a fondo](#4-la-ficha-de-clienta-a-fondo)
5. [Programas de entrenamiento](#5-programas-de-entrenamiento)
6. [Ejercicios (biblioteca)](#6-ejercicios-biblioteca)
7. [Nutrición](#7-nutrición)
8. [Formularios y check-ins](#8-formularios-y-check-ins)
9. [Mensajes](#9-mensajes)
10. [Calendario y Agenda](#10-calendario-y-agenda)
11. [Pagos e inscripciones (CRM)](#11-pagos-e-inscripciones-crm)
12. [Asistente IA y Métricas](#12-asistente-ia-y-métricas)
13. [Ajustes y marca](#13-ajustes-y-marca)
14. [Imprimir / PDF](#14-imprimir-pdf)
15. [Acciones peligrosas y trucos](#15-acciones-peligrosas-y-trucos)

---

## 1. ☀️ El día a día en 5 minutos

La rutina típica de una mañana:

1. **Inicio** → mira "Hoy entrenan" (quién tiene sesión), "Mensajes" (lo no leído) y "A revisar" (quién lleva 5+ días sin entrenar).
2. Si hay alguien en "A revisar" → clic en su nombre → ficha → botón **💬 WhatsApp** para escribirle.
3. **Mensajes** → responde lo pendiente.
4. **Agenda** → repasa tus tareas del día y marca lo hecho.
5. Una vez por semana: **Pagos** (¿alguien con cuota vencida? ¿renovaciones cerca?) y los **check-ins** de cada clienta.

---

## 2. 📊 Inicio: tu cuadro de mandos

Lo que ves nada más entrar:

- **KPIs de negocio** (arriba): *Ingresos del mes*, *Pendiente de cobro* y *Renovaciones ≤30 días*. Cualquiera de los tres te lleva a `/pagos`.
- **4 tarjetas**: Clientas activas · Pendientes de alta (las invitadas que aún no han creado cuenta) · Programas · Ejercicios.
- **Hoy entrenan**: lista de clientas con sesión programada hoy, con el título del día. Si nadie entrena, te dice cuántas están en descanso programado.
- **Mensajes**: los últimos 5 sin leer, con preview.
- **A revisar**: clientas sin actividad 5+ días — tu radar de bajas silenciosas.
- **Fotos recientes**: las 3 últimas fotos de progreso subidas.
- **Botón "Informe semanal"**: genera el resumen de la semana.

---

## 3. 👥 Clientas: alta, invitación y estados

### Alta de una clienta nueva

1. **Clientas → + Añadir clienta**.
2. Rellena los datos básicos: nombre, apellidos, email (obligatorio) y teléfono.
3. Abre la sección **"Seguimiento comercial (CRM)"** y rellena lo que sepas:
   - **Etapa del funnel**: Lead / Activa / Pausada / Baja / Recuperable.
   - **Origen del lead**: reel, anuncio, referido…
   - **WhatsApp** (para el botón wa.me), ciudad, si encaja con el avatar objetivo, objetivo principal, condiciones médicas, lesiones, material disponible.
   - **Notas internas**: solo las ves tú, nunca la clienta.
4. Guardar → te lleva a su ficha. La clienta queda en estado **invitada**.

### Invitarla a la app

1. En su ficha → **📩 Invitar a la app**.
2. Se genera un link `https://…/i/[token]` válido **30 días**.
3. Botones: **Copiar** o **Compartir por WhatsApp** (mensaje ya redactado).
4. Ella abre el link, crea su contraseña y entra directa a su portal. El link se inutiliza solo.
5. Si te equivocaste o el link se filtró: **Revocar invitación** (en el mismo modal).

> 📌 La vista **Clientas → Activación** (`/clientas/onboarding`) te muestra el estado de todas las invitadas de un vistazo: link generado, cuenta creada, contrato firmado.

### Estados y gate RGPD

- **invitada** → **activa** → **archivada**. Se cambia desde su ficha (botones Archivar/Restaurar).
- ⚠️ **No puedes activar a una clienta sin contrato firmado** (panel "Contrato" de la ficha). El sistema lo bloquea: primero la firma, luego la activación.
- **Eliminar** borra a la clienta Y TODOS sus datos (sesiones, fotos, mensajes, métricas). Pide confirmación y no tiene vuelta atrás. Para ex-clientas usa **Archivar**, no Eliminar.

### Lista y filtros

- Filtro por **estado** (Activas por defecto) y, aparte, por **etapa del funnel**.
- Búsqueda por nombre o email.
- Iconos en la lista: 🔥N = racha de 7+ días · 💪N = racha de 3+ · ⚠ Nd = N días sin entrenar (en rojo).

---

## 4. 🗂️ La ficha de clienta a fondo

`/clientas/[id]` es el centro de todo. Arriba siempre: avatar, estado, contrato, botón WhatsApp, Editar y el menú de estado. Debajo, 4 KPIs fijos: **Programa activo · Racha · Adherencia · Último entreno**.

Cinco pestañas:

| Pestaña | Qué hay |
|---|---|
| **Resumen** | Datos básicos, panel de **Contrato (RGPD)**, panel de **Inscripción y pagos**, programa asignado con historial, accesos rápidos y los botones de IA |
| **Adherencia** | Racha actual y mejor, % adherencia, heatmap de sesiones y heatmap anual |
| **Métricas** | Últimas 10 medidas, pasos recientes y gráficas de evolución |
| **Proyecto** | Objetivos, logros/XP, fichas estructuradas, **tareas** de esta clienta (solo las ves tú), **notas internas** con historial, perfil dietético y el botón **Resumen IA** |
| **Actividad** | Timeline: sesiones, comentarios, fotos, check-ins |

Accesos rápidos del Resumen ("Más de esta clienta"):

- ✏️ **Plan personalizado** — edita SU copia del programa sin tocar la plantilla.
- 📸 **Fotos / comparador** — galería + comparador antes/después. Aquí está el interruptor **"Activar comparador"** por clienta (si lo apagas, ella verá sus fotos solo como galería, sin comparador).
- 📊 Histórico de ejercicios · 📋 Valoración inicial · ✅ Check-ins · 👁️ **Ver como la clienta** (preview de lo que ella ve) · 🖨️ Imprimir.

Botones IA:

- **✨ Generar programa con IA**: escribes instrucciones ("4 semanas, 4 días, énfasis glúteo, material: mancuernas") y genera un borrador usando su ficha y tu biblioteca de ejercicios. Siempre revísalo antes de asignar.
- **🧠 Resumen IA** (pestaña Proyecto): brief de la clienta con su contexto (programa, adherencia, mensajes, notas).

---

## 5. 🏋️ Programas de entrenamiento

### Crear

**Programas → Nuevo**: o desde **plantilla** (ej. "💪 Tonificación glúteo · 4 días/sem") o **vacío** (nombre + nº de semanas).

### Editor

Estructura: **Semanas → Días → Bloques → Ejercicios**.

- En cada **día**: título editable y toggle **Descanso**.
- En cada **bloque**: nombre (Calentamiento, Fuerza…) y posibilidad de circuito.
- En cada **ejercicio**: series × reps, RPE y notas. **+ Añadir ejercicio** abre el selector de tu biblioteca (con búsqueda y filtro por grupo muscular).

### Asignar

Botón **Asignar** → eliges clienta(s) y fecha de inicio.

> ⚠️ **Una clienta = un programa activo.** Asignar uno nuevo desactiva el anterior automáticamente.

La asignación guarda una **copia** (snapshot) del programa: si después editas la plantilla, las clientas ya asignadas no cambian. Para tocar el plan de UNA clienta usa **Plan personalizado** desde su ficha (los ejercicios modificados llevan el badge "Personalizado").

### Compartir sin login

**🔗 Compartir programa** genera un link público `/p/[token]` de solo lectura — útil para enseñar el plan a alguien sin cuenta. Válido mientras la asignación esté activa.

---

## 6. 💪 Ejercicios (biblioteca)

**Ejercicios**: tu catálogo central. Búsqueda + filtros por grupo muscular.

Cada ejercicio: nombre, descripción, grupos musculares, material, imagen y **vídeo demostrativo** (la clienta lo ve en su entreno). Cuanto más completa la biblioteca, mejores los programas (y mejores los borradores de la IA).

---

## 7. 🥗 Nutrición

Tres herramientas (botones arriba en **Nutrición**):

1. **Plan por equivalencias** (el potente): defines calorías y reparto de **raciones** (HC / Proteína / Grasa / Verdura) por toma. La clienta toca cada grupo en su app y ve los alimentos intercambiables con sus cantidades. Incluye generador de menú (respeta su perfil dietético y restricciones) y PDF imprimible.
2. **Plan documento**: subes un PDF o pegas texto. Para planes hechos fuera.
3. **Lista de la compra**: una línea por artículo; ella los marca como comprados desde su móvil. Desde el plan de equivalencias se puede autogenerar.

La **Tabla de alimentos** (`/nutricion/alimentos`) es la base de datos que alimenta los intercambios — si un alimento no aparece a la clienta, es que falta aquí.

> El **perfil dietético** se edita en la ficha de cada clienta (pestaña Proyecto) y condiciona el generador de menú.

---

## 8. 📋 Formularios y check-ins

### Constructor de formularios

**Formularios → + Nuevo**: añade preguntas de 7 tipos (texto corto, párrafo, opción única, opción múltiple, escala 1-5, número, fecha), marca cuáles son obligatorias y reordénalas.

**Asignar**: eliges clientas y, opcionalmente, una fecha **"Disponible desde"** — hasta ese día la clienta lo ve bloqueado 🔒. Útil para calendarizar (ej. revisión mensual).

**Respuestas**: desde el propio formulario, cada asignación muestra pendiente/completado y enlaza a las respuestas.

### Check-in semanal

La clienta lo rellena cada semana desde su portal (entreno 1-5, dieta 1-5, energía, sueño, peso y comentario). Tú lo ves en **su ficha → Check-ins semanales** con el histórico completo. Su portal le avisa cuando le toca.

---

## 9. 💬 Mensajes

- **Mensajes**: conversaciones ordenadas con badge de no leídos. Al abrir una conversación se marca leída.
- Escribes con normalidad; **la clienta NO puede responder desde la app** (decisión deliberada): su portal le muestra tu conversación y un botón gigante de **WhatsApp**. La comunicación de vuelta llega por WhatsApp.
- **📢 Broadcast**: el mismo mensaje a varias clientas a la vez (avisos de vacaciones, recordatorios…).

---

## 10. 🗓️ Calendario y Agenda

- **Calendario**: quién entrena qué y cuándo, en vista **mes / semana / día**. La vista semana es una tabla clientas × días con el estado de cada sesión (Sin empezar / Finalizado / Descanso). Perfecto para detectar huecos.
- **Agenda**: tu lista personal de tareas (no atada a clientas): texto + fecha de vencimiento opcional. Las vencidas salen en rojo. Filtros: pendientes / hechas / todas. *(Las tareas POR clienta van en su ficha, pestaña Proyecto.)*

---

## 11. 💶 Pagos e inscripciones (CRM)

### Conceptos

- **Inscripción** = un ciclo de contratación (ej. "Programa 1-a-1, 3 meses, 397 €") con su fecha de **renovación** — la clave para anticipar bajas.
- **Pago** = cada cobro individual (cuota o pago suelto), con estado: pendiente / pagado / fallido / reembolsado.

### Dar de alta una inscripción

En la ficha de la clienta → panel **"Inscripción y pagos"** → **+ Inscripción**:

1. Usa un preset: **Pago único 397 €** o **Fraccionado 480 € (3×160)** — o escribe lo tuyo.
2. Revisa fecha de inicio y **renovación** (se autocompleta a +3 meses).
3. Deja marcado **"Generar las cuotas como pagos pendientes"** → crea las cuotas mensuales automáticamente.
4. Cuando la clienta pague una cuota: botón **✓** (se marca pagada con fecha). **↺** la devuelve a pendiente. **✕** elimina el pago (pide confirmación).

Cuando un ciclo termina: **Marcar finalizada** (o **Cancelar** si se rompe a mitad). El botón **+ Inscripción** reaparece para registrar la renovación como nueva inscripción.

> Los pagos sueltos (una sesión extra, un upsell) se registran con **+ Pago** sin necesidad de inscripción.

### Dashboard `/pagos`

- KPIs: **Ingresos este mes · Pendiente de cobro · Pagos vencidos · Renovaciones ≤45 días**.
- **Próximas renovaciones**: a quién le caduca el programa pronto → tu lista de llamadas de renovación.
- **Pagos pendientes**: con fecha en rojo si están vencidos. Todo enlaza a la ficha.

---

## 12. ✨ Asistente IA y Métricas

- **Asistente** (`/asistente`): chatbot que responde sobre tus datos: *"¿quién ha bajado de peso esta semana?"*, *"¿quién tiene adherencia baja?"*, *"resumen de actividad"*. Conoce métricas con evolución de ~3 semanas.
- **Métricas** (`/metricas`): tabla de todas las clientas activas con peso/cintura/cadera/% grasa, su delta vs la medida anterior y fecha. Botón **+ Nueva métrica** para registrar tú una medida (ej. tras una videollamada de revisión). Las clientas también registran las suyas desde su portal.
- **Comparativa** (`/clientas/comparativa`): clientas lado a lado (racha, adherencia, peso, cintura…).

---

## 13. ⚙️ Ajustes y marca

**Ajustes**: tus datos (nombre, email, teléfono, bio, foto) y tu **marca**:

- **Nombre de marca** (lo que la clienta ve como remitente),
- **Color primario** (tiñe botones y acentos de TODO, panel y portal),
- **Logo** (aparece en el portal de la clienta y en la tarjeta de "Compartir progreso" que ella puede subir a Instagram — branding gratis).

---

## 14. 🖨️ Imprimir / PDF

Desde la ficha → **🖨️ Imprimir / PDF** (`/imprimir/clienta/[id]`): ficha completa con marca, programa activo, métricas, últimas 30 sesiones, fotos y notas. Se imprime con Ctrl+P o se guarda como PDF. También hay versión imprimible de programas y planes de nutrición.

---

## 15. ⚠️ Acciones peligrosas y trucos

**Irreversibles (siempre piden confirmación):**

- **Eliminar clienta** — borra TODO lo suyo. Usa Archivar salvo que de verdad quieras borrar.
- **Eliminar pago / programa / formulario / plan / lista.**
- **Revocar invitación** — el link deja de funcionar.

**Trucos:**

- 👁️ **Ver como la clienta** antes de mandarle nada: confirmas qué ve exactamente.
- La app es una PWA con caché agresiva: si tras un cambio no ves la última versión, **Ctrl+Shift+R** (o ventana de incógnito).
- El **interruptor de gamificación** y el del **comparador de fotos** son por clienta (en su ficha) — si a alguien no le encajan el confeti o el antes/después, apágaselos.
- Las **notas internas** y las **tareas por clienta** (pestaña Proyecto) nunca son visibles para ella; las **"Notas (visibles para la clienta)"** del formulario de edición, sí. No las confundas.
- Cuando escribas el WhatsApp en el CRM, pon prefijo (+34…): es lo que usa el botón wa.me.
