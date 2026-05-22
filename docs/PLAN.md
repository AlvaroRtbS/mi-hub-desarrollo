# Plan de acción

Decisión tomada: **Plan B — independencia total de TrainerStudio**. Multi-tenant desde el día 1 por si en el futuro se ofrece como SaaS a otras entrenadoras.

## Sprints

### ✅ Sprint 0 — Preparación
- Leer documentación de la API de TrainerStudio.
- Decidir stack.
- Confirmar plan.

### 🟢 Sprint 1 — Cimientos (ACTUAL)
- [x] Estructura del repo.
- [x] Esquema de base de datos completo con RLS multi-tenant.
- [x] Login y registro funcionando (vía Supabase Auth).
- [x] Layout del panel con sidebar.
- [x] Pantalla "Clientas" lista para mostrar datos reales.
- [ ] Crear proyecto en Supabase y aplicar migración.
- [ ] Probar el flujo registro → login → ver panel.

### Sprint 2 — Panel de entrenadora
- [ ] CRUD de Clientas (alta, edición, archivado).
- [ ] CRUD de Ejercicios (con subida de vídeo a Supabase Storage).
- [ ] Editor de Programas con drag & drop (semanas → días → bloques → elementos).
- [ ] Vista de Calendario con asignaciones.
- [ ] Asignar programa a clienta.

### Sprint 3 — App web para clientas
- [ ] Login de la clienta (separado del de la entrenadora).
- [ ] "Hoy entreno" — ver bloques del día.
- [ ] Marcar series, anotar pesos, marcar completado.
- [ ] Registrar métricas (peso, perímetros).
- [ ] Subir foto de progreso.
- [ ] Ver planes de nutrición.

### Sprint 4 — Migración desde TrainerStudio
- [ ] Script `scripts/migrate-from-trainerstudio/migrate.ts`.
- [ ] Modo `--dry-run` para validar sin escribir.
- [ ] Migrar: clientas, ejercicios, programas, sesiones, métricas, fotos, nutrición, notas, Apple Health.
- [ ] Validar con 1-2 clientas reales en paralelo.
- [ ] Cancelar TrainerStudio.

### Sprint 5 — App móvil nativa
- [ ] Setup Expo.
- [ ] Login + pantallas básicas reusando lógica de la web.
- [ ] **Podómetro automático** vía Apple Health (`expo-sensors`) y Google Fit.
- [ ] Notificaciones push (Expo Notifications).
- [ ] Publicar en TestFlight / Play Store interno.

### Sprint 6 — Mejoras
- [ ] Chat en tiempo real (Supabase Realtime).
- [ ] Lista de la compra con checks.
- [ ] Comparador de fotos antes/después.
- [ ] Estadísticas de adherencia automáticas.
- [ ] Recordatorios programados.

### Sprint 7+ — Monetización (futuro)
- [ ] Pasarela de pago (Stripe).
- [ ] Onboarding para otras entrenadoras.
- [ ] Personalización de marca (logo, colores) por entrenadora.
- [ ] Panel de administración global.

## Decisiones de arquitectura

| Tema | Decisión | Por qué |
|---|---|---|
| Multi-tenancy | Row Level Security de Supabase, `coach_id` en cada tabla | Permite ofrecer SaaS sin reescribir nada |
| Estructura de programas | JSONB anidado en `programas.estructura` | Drag & drop natural, edición flexible |
| Histórico de adherencia | `estructura_snapshot` en `asignaciones` | Editar plantilla no rompe asignaciones en curso |
| Pasos automáticos | Campo `fuente` en `pasos_diarios` | Diferencia screenshot de Apple Health de Google Fit |
| Storage de vídeos/fotos | Supabase Storage | Gratis hasta 1 GB, integrado con RLS |
| Migración | Script idempotente con `trainerstudio_id` | Reanudable si se corta |

## Lo que NO hacemos (por ahora)

- Pagos a clientas finales. (Tú cobras a tus clientas como ahora, fuera de la app).
- Marketplace de entrenadoras. (Sprint futuro).
- IA generativa de rutinas. (Posible Sprint 7+, conlleva coste de tokens).
- Integración con relojes (Garmin, Polar) — cada uno tiene su API distinta, hay que ver demanda primero.
