# mi-hub-desarrollo

Plataforma de entrenamiento personal (placeholder de nombre — lo cambiamos cuando decidas marca).

Plan B confirmado: **propia base de datos, propia app, sin depender de TrainerStudio a largo plazo**. Multi-tenant desde el día 1 por si en el futuro otras entrenadoras se suben a la plataforma.

## Estructura del proyecto

```
mi-hub-desarrollo/
├── web/                              ← Panel web (Next.js) — uso por la entrenadora
├── mobile/                           ← App móvil (Expo) — uso por las clientas. Empieza vacío, se monta más adelante.
├── supabase/
│   └── migrations/                   ← Esquema de la base de datos (SQL versionado)
├── scripts/
│   └── migrate-from-trainerstudio/   ← Script que exporta tus datos de TrainerStudio a tu base. Sprint 4.
├── docs/                             ← Plan de acción y notas de arquitectura
├── .env.example                      ← Plantilla de variables de entorno
└── .gitignore
```

## Stack

| Pieza | Herramienta | Coste a pequeña escala |
|---|---|---|
| Base de datos + auth + storage | Supabase | 0€/mes (hasta ~500 MB y 50k usuarios) |
| Panel web | Next.js 15 (App Router) en Vercel | 0€/mes |
| App móvil | Expo (React Native) — iOS + Android con un solo código | 0€/mes |
| Dominio | (a comprar) | ~10€/año |
| Notificaciones push | Expo Notifications | 0€ |

## Primeros pasos (cuando vayas a probarlo en local)

### 1. Instalar dependencias
```bash
cd web
npm install
```

### 2. Configurar Supabase
1. Crear cuenta gratis en https://supabase.com y un proyecto nuevo (región Frankfurt va bien para Europa).
2. En **Settings → API** copiar `URL` y `anon key`.
3. Copiar `.env.example` a `web/.env.local` y pegar los valores.
4. En el **SQL Editor** de Supabase, ejecutar **en este orden**:
   - `supabase/migrations/20260522000000_initial_schema.sql` (tablas + RLS)
   - `supabase/migrations/20260522000001_storage_buckets.sql` (buckets para vídeos, imágenes, PDFs)

   Cada migración tiene que terminar con "Success. No rows returned".

### 3. Arrancar la web
```bash
cd web
npm run dev
```
Abre http://localhost:3000

## Próximos pasos

Ver `docs/PLAN.md` para el plan de sprints completo. En resumen:

1. **Sprint 1** (actual) — Cimientos: base de datos, login, pantalla "Mis Clientas" vacía.
2. **Sprint 2** — Panel de entrenadora: calendario, ejercicios, programas, asignaciones.
3. **Sprint 3** — App web para clientas: ver entreno del día, marcar, subir foto, registrar peso.
4. **Sprint 4** — Migración real desde TrainerStudio.
5. **Sprint 5** — App móvil nativa (iOS + Android) con podómetro automático.
6. **Sprint 6** — Mejoras: chat, lista de compra con checks, comparador de fotos, estadísticas.

## Notas importantes

- **NUNCA** subas el archivo `.env` o `.env.local` al repositorio. El `.gitignore` ya está configurado para evitarlo.
- La **API key de TrainerStudio** solo se usa para la migración (Sprint 4). Después puedes revocarla.
- La base de datos es **multi-tenant**: cada entrenadora ve solo sus propias clientas. Esto está protegido a nivel de base de datos por Row Level Security de Supabase.
