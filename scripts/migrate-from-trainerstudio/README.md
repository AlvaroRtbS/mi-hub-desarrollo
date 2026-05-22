# Script de migración: TrainerStudio → tu Supabase

**Estado:** placeholder. Se escribe en el **Sprint 4** del plan, cuando ya tengamos la web funcionando con datos reales.

## Qué hará este script

Un único archivo TypeScript (`migrate.ts`) que ejecutas desde tu ordenador y que:

1. Lee tu API key de TrainerStudio desde `.env`.
2. Lee tus credenciales de Supabase (service role) desde `.env`.
3. Llama a los endpoints de TrainerStudio en este orden:
   - `GET /coach/customers` → vuelca a `clientas`
   - `GET /coach/customers/:id/wblocks` → vuelca a estructura de programas
   - `GET /exercises/unified` → vuelca a `ejercicios`
   - `GET /coach/programs` → vuelca a `programas`
   - `GET /coach/customers/:id/metrics` → vuelca a `metricas`
   - `GET /coach/customers/:id/photos` → descarga y sube a Supabase Storage → `fotos_progreso`
   - `GET /coach/customers/:id/nutrition` → descarga PDFs → `nutricion_planes`
   - `GET /coach/customers/:id/notes` → vuelca a `notas`
   - `GET /coach/customers/:id/apple-health` → vuelca a `pasos_diarios`
4. Mantiene el `trainerstudio_id` original en cada fila para que la migración sea reanudable si se interrumpe (idempotente).
5. Imprime un resumen al final: "8 clientas, 142 ejercicios, 12 programas, 1.234 sesiones, 567 métricas migradas".

## Cómo se ejecutará (Sprint 4)

```bash
cd scripts/migrate-from-trainerstudio
cp ../../.env.example .env
# Rellenar .env con TS_API_KEY y SUPABASE_SERVICE_ROLE_KEY
npm install
npm run migrate -- --dry-run    # ver qué pasaría sin escribir nada
npm run migrate                 # migración real
```

## Importante

- Antes de ejecutar, hacer una **copia de seguridad** de Supabase (botón "Backups" en el dashboard).
- Ejecutar primero con `--dry-run` para validar.
- Solo se ejecuta **una vez** (cuando estés lista para cortar con TrainerStudio).
- Después de validar, **revocar la API key** en TrainerStudio.
