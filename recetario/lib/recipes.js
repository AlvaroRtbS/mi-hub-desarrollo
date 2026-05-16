import fs from 'fs';
import path from 'path';

const RECETAS_DIR = path.join(process.cwd(), 'data', 'recetas');

export const ESTADOS = ['candidata', 'aprobada', 'descartada'];

export function getAllRecipes() {
  if (!fs.existsSync(RECETAS_DIR)) return [];
  return fs
    .readdirSync(RECETAS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(RECETAS_DIR, f), 'utf-8'));
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => (b.fechaAnadida || '').localeCompare(a.fechaAnadida || ''));
}

export function getApprovedRecipes() {
  return getAllRecipes().filter((r) => r.estado === 'aprobada');
}

export function getCandidateRecipes() {
  return getAllRecipes().filter((r) => r.estado === 'candidata');
}

export function getRecipeBySlug(slug) {
  if (!/^[a-z0-9-]+$/.test(slug || '')) return null;
  const file = path.join(RECETAS_DIR, `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return null;
  }
}
