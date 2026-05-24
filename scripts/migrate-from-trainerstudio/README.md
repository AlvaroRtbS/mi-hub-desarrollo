# Migración: TrainerStudio → tu Supabase

Script TypeScript que migra de Trainer Studio a tu instancia de Supabase:

- ✅ Ejercicios (con vídeos e imágenes descargados a Storage)
- ✅ Clientas (activas por defecto; `--include-archived` para todas)
- ✅ Notas (HTML, una nota por entrada en TS)
- ✅ Métricas (valor inicial + valor actual por métrica)
- ✅ Sesiones (a partir del compliance diario de cada clienta)
- ⚠ Programas (solo cabecera — TS no expone los `wblocks/witems` por API; recrearlos manualmente en el editor de mi-hub)
- ❌ Fotos de progreso (todavía no encontrado el endpoint exacto)

## Antes de empezar

1. **Migraciones SQL aplicadas.** Las siguientes deben estar en tu Supabase:
   - `20260524000006_unique_trainerstudio_ids.sql`
   - `20260524000007_trainerstudio_ids_extras.sql`

   Sin la segunda, las notas/métricas se duplicarán al re-ejecutar.

2. **Buckets de Storage creados.** Migraciones `20260522000001` y `20260524000004`.

3. **Una cuenta de coach registrada.** Entra a `/login`, crea tu cuenta.
   El script asume **un único coach** en la tabla `coaches`.

4. **API key de Trainer Studio.** Settings → Desarrolladores → Crear clave API.
   Formato: `ts_ak_...`.

5. **Service role key de Supabase.** Settings → API → service_role (no anon).
   Da acceso total — protégela.

## Uso

```bash
cd scripts/migrate-from-trainerstudio
npm install
```

Crea `.env` (no se commitea, ya está en `.gitignore`):

```
TS_API_KEY=ts_ak_...
TS_BASE=https://api.trainerstudio.io
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Importante:
- Sin comillas alrededor de los valores.
- Sin `/rest/v1/` al final de la URL.
- Sin espacios alrededor del `=`.

```bash
# 1) Comprobación rápida (auth + conexión a TS + Supabase)
npm run probe

# 2) Volcado de descubrimiento (shape de cada endpoint, útil para debug)
npm run discover

# 3) Dry-run: muestra qué migraría sin escribir
npm run migrate -- --dry-run

# 4) Migración real
npm run migrate
```

## Flags

| Flag | Para qué |
|---|---|
| `--probe` | Verifica credenciales y endpoints, no escribe. |
| `--dry-run` | Recorre todo como en una migración real pero sin escribir. |
| `--skip-storage` | Mantiene URLs originales de TS (caducan en 2h — solo para prueba). |
| `--include-archived` | Migra también las clientas archivadas. |
| `--only=<entidad>` | Migra solo una: `ejercicios`, `clientas`, `programas`, `notas`, `metricas`, `sesiones`. |

## Idempotencia

Cada fila lleva el `trainerstudio_id` original. Una constraint unique
`(coach_id, trainerstudio_id)` hace que re-ejecutar actualice en lugar de
duplicar. Puedes interrumpir y retomar sin problema.

Para las **sesiones**, la idempotencia es por `(clienta_id, fecha)`.
Para las **métricas**, el `trainerstudio_id` es compuesto:
`{metricsSet._id}_{metric._id}_{initial|current}`.

## Endpoints reales de TrainerStudio

Descubiertos con `npm run discover`. Auth: cabecera `X-API-Key: ts_ak_...`.
Paginación Mongoose: `{ docs, totalDocs, totalPages, hasNextPage }`.

```
GET /exercises?pageSize=100&pageNum=N
GET /exercises/{id}
GET /coach/customers?archived=false&pageSize=100&pageNum=N
GET /coach/customers/{id}
GET /coach/customers/{id}/notes
GET /coach/customers/{id}/metrics-sets
GET /coach/customers/{id}/compliance
GET /coach/programs?archived=false&pageSize=100&pageNum=N
GET /coach/programs/{id}
```

## Mapeo de campos

### Ejercicios

| Trainer Studio | mi-hub | Nota |
|---|---|---|
| `_id` | `trainerstudio_id` | |
| `name` | `nombre` | |
| `defaultInstructions` | `instrucciones` | |
| `tags[]` con keywords de equipo (kettlebell, mancuerna…) | `material[]` | |
| `tags[]` el resto | `grupos_musculares[]` | El usuario los puede limpiar después |
| `media[type=video].url` | `video_url` (en bucket `ejercicios-videos`) | Descargado |
| `videoLink` (YouTube/Vimeo si no hay media) | `video_url` | Tal cual |
| `image` | `imagen_url` (en bucket `ejercicios-imagenes`) | Descargado |

### Clientas

| Trainer Studio | mi-hub |
|---|---|
| `_id` | `trainerstudio_id` |
| `name`, `surname` | `nombre`, `apellidos` |
| `email` | `email` (lowercased) |
| `phone` | `telefono` |
| `birthday` | `fecha_nacimiento` |
| `customerRoleData.isArchived` | `estado = 'archivada' | 'activa'` |
| `profilePhotoUrl` | (omitido — URLs de TS caducan) |

### Métricas

Por cada métrica de cada metrics-set asignado a la clienta:
- Una fila con `valor = initialValue`, `fecha = createdAt del set`.
- Una fila con `valor = currentValue`, `fecha = hoy`.

`tipo` se deriva del nombre (`Peso` → `peso`, `Medida cintura` → `medida_cintura`).
`unidad` del `shortName` (`Kg`, `cm`, etc).

### Sesiones

Por cada día de `dailyCompliance` que es `isWorkoutDay`:
```
fecha = day.date
completada = day.isCompleted
porcentaje_completado = round(completedItems / totalItems * 100)
```

No migra los detalles serie a serie (TS no los expone).

## Después de migrar

- Verifica en la web que los ejercicios aparecen con sus vídeos/imágenes,
  que las clientas están con sus emails correctos, que tienen sus notas
  y métricas.
- Si algo está vacío, re-ejecuta con `--only=<entidad>`.
- Borra tu `.env` o rota la `TS_API_KEY` desde Trainer Studio y la
  `SUPABASE_SERVICE_ROLE_KEY` desde Supabase.
- Conserva backup de Supabase durante unos días.
- Para los **3 programas**: recrea su estructura manualmente en el editor
  de programas de mi-hub. TS no expone la estructura por API.

## Si algo falla

1. Re-ejecuta `npm run probe` para aislar si el problema es de auth/red.
2. Re-ejecuta `npm run discover` para ver si el API cambió.
3. Re-ejecuta `npm run migrate -- --only=ejercicios` (o la entidad que falle)
   para no volver a procesar todo.
