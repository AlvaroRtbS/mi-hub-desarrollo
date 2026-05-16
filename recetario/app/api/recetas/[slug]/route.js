import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { ESTADOS } from '@/lib/recipes';

const RECETAS_DIR = path.join(process.cwd(), 'data', 'recetas');

export async function PATCH(request, { params }) {
  const { slug } = await params;

  if (!/^[a-z0-9-]+$/.test(slug || '')) {
    return NextResponse.json({ error: 'Slug no válido' }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la petición no válido' }, { status: 400 });
  }

  const { estado } = body;
  if (!ESTADOS.includes(estado)) {
    return NextResponse.json(
      { error: `Estado no válido. Usa uno de: ${ESTADOS.join(', ')}` },
      { status: 400 }
    );
  }

  const file = path.join(RECETAS_DIR, `${slug}.json`);
  if (!fs.existsSync(file)) {
    return NextResponse.json({ error: 'Receta no encontrada' }, { status: 404 });
  }

  let receta;
  try {
    receta = JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return NextResponse.json({ error: 'El archivo de la receta está dañado' }, { status: 500 });
  }

  receta.estado = estado;
  fs.writeFileSync(file, JSON.stringify(receta, null, 2) + '\n');

  return NextResponse.json({ ok: true, receta });
}
