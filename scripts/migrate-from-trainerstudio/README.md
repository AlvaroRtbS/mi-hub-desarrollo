# Migración: TrainerStudio → tu Supabase

Script TypeScript que migra todos tus datos de Trainer Studio (ejercicios con
sus vídeos e imágenes, clientas, programas, sesiones, métricas, fotos de
progreso y notas) a tu instancia de Supabase.

## Antes de empezar

1. **Migraciones SQL aplicadas en Supabase.** El script depende de la
   migración `20260524000006_unique_trainerstudio_ids.sql` (y las
   anteriores). Aplícalas todas desde el SQL Editor antes de seguir.
2. **Buckets de Storage creados.** Las migraciones `20260522000001` y
   `20260524000004` los crean (`ejercicios-videos`, `ejercicios-imagenes`,
   `fotos-progreso`, `nutricion-pdfs`, `programa-adjuntos`).
3. **Una cuenta de coach ya registrada en tu Supabase.** Entra a tu web en
   `/login`, crea tu cuenta, y vuelve aquí. El script asume que existe
   exactamente UN coach en la tabla `coaches` y migrará a su nombre.
4. **API key de Trainer Studio.** Generar en TS: Settings → API Keys →
   Create. La clave dará al script acceso a tus datos.
5. **Service role key de Supabase.** Settings → API → service_role (no
   anon). Esta clave salta el RLS — protegerla.

## Uso

```bash
cd scripts/migrate-from-trainerstudio
npm install

# Crea .env con las claves (NO subir al repo, ya está en .gitignore)
cat > .env <<'EOF'
TS_API_KEY=tu_api_key_de_trainerstudio
TS_BASE=https://api.trainerstudio.io
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
EOF

# 1) Comprobación rápida: claves + un endpoint de TS + acceso a Supabase
npm run probe

# 2) Dry-run: muestra qué migraría sin escribir nada
npm run migrate -- --dry-run

# 3) Migración real
npm run migrate
```

## Flags del script

| Flag | Para qué |
|---|---|
| `--probe` | Solo verifica credenciales y endpoint de TS, no escribe nada. |
| `--dry-run` | Recorre todos los datos como en una migración real pero no escribe en BD ni en Storage. |
| `--skip-storage` | Mantiene las URLs originales de TS para imágenes/vídeos en lugar de descargarlas y subirlas a Supabase Storage. Útil para una primera prueba rápida. |
| `--only=<entidad>` | Migra solo una entidad: `ejercicios`, `clientas`, `programas`, `metricas`, `sesiones`, `fotos`, `notas`. |

## Idempotencia

Cada entidad migrada guarda el `trainerstudio_id` original en una columna del
mismo nombre. La constraint unique `(coach_id, trainerstudio_id)` hace que
re-ejecutar el script **actualice** las filas existentes en lugar de
duplicarlas. Puedes interrumpir y retomar.

## Si los endpoints de TS no son los esperados

El script asume estos paths (en `TS_ENDPOINTS` al inicio de `migrate.ts`):

```
GET /exercises?type=my
GET /customers
GET /customers/:id
GET /programs
GET /programs/:id
GET /customers/:id/metrics
GET /customers/:id/compliance
GET /customers/:id/photos
GET /customers/:id/notes
```

Si tu API real usa nombres distintos:

1. `npm run probe` te dirá qué endpoint falla y con qué código HTTP.
2. Edita el objeto `TS_ENDPOINTS` en `migrate.ts`.
3. Vuelve a probar con `npm run probe`.

## Orden de ejecución y dependencias

1. **Ejercicios primero**, porque los programas referencian `ejercicio_id`.
2. **Clientas** después, porque sesiones/métricas/fotos/notas las
   referencian.
3. **Programas**: cargan el detalle de cada uno con `GET /programs/:id` y
   traducen el formato TS (workout blocks con `day` absoluto) al formato
   local (estructura jerárquica `Semana → Día → Bloque → Elemento`).
4. **Sesiones**: leen el `dailyCompliance` de cada clienta y crean un
   registro de sesión por cada día programado. Solo guardan completada/%,
   no los detalles serie a serie (TS no los expone por API en este endpoint).
5. **Métricas, fotos, notas**: por clienta, en bucle.

## Mapeo de tipos de elemento

| TrainerStudio | mi-hub |
|---|---|
| `EXERCISE` con `sets` | elemento `ejercicio` con `series` |
| `EXERCISE.supersetExercises` | ejercicios consecutivos (supersets se aplanan) |
| `TASK` con media tipo PDF | elemento `pdf` |
| `TASK` con media tipo vídeo | elemento `video_externo` |
| `TASK` sin media | elemento `contenido` (markdown = description) |
| `workoutBlocks[].day` absoluto | `estructura[semana][dia]` (semana = floor((day-1)/7)+1) |

## Después de migrar

- Verifica en la web que los ejercicios aparecen, que las clientas están,
  que los programas tienen sus semanas/días/bloques. Si algo está vacío,
  re-ejecuta con `--only=<entidad>`.
- Borra tu .env o rota la `TS_API_KEY` desde Trainer Studio.
- Conserva backup de Supabase durante unos días por si necesitas rollback.
