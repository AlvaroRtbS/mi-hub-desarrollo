'use client';

import { useMemo, useState } from 'react';
import RecipeCard from './RecipeCard';

export default function BuscadorRecetas({ recetas }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('Todas');

  const categorias = useMemo(() => {
    const set = new Set();
    recetas.forEach((r) => (r.categorias || []).forEach((c) => set.add(c)));
    return ['Todas', ...Array.from(set).sort()];
  }, [recetas]);

  const filtradas = useMemo(() => {
    const term = q.trim().toLowerCase();
    return recetas.filter((r) => {
      const matchTexto =
        !term ||
        r.titulo.toLowerCase().includes(term) ||
        (r.descripcion || '').toLowerCase().includes(term) ||
        (r.etiquetas || []).some((e) => e.toLowerCase().includes(term)) ||
        (r.ingredientes || []).some((i) => (i.nombre || '').toLowerCase().includes(term));
      const matchCat = cat === 'Todas' || (r.categorias || []).includes(cat);
      return matchTexto && matchCat;
    });
  }, [recetas, q, cat]);

  return (
    <>
      <div className="filtros">
        <input
          type="search"
          placeholder="Buscar por receta, ingrediente o etiqueta..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          {categorias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {filtradas.length === 0 ? (
        <p className="vacio">No hay recetas que coincidan con la búsqueda.</p>
      ) : (
        <div className="grid">
          {filtradas.map((r) => (
            <RecipeCard key={r.slug} receta={r} />
          ))}
        </div>
      )}
    </>
  );
}
