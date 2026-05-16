'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function fuenteTexto(f) {
  if (!f) return 'Desconocida';
  const tipos = { pdf: 'PDF', scraping: 'Scraping', manual: 'Manual' };
  return [tipos[f.tipo] || f.tipo, f.cuenta, f.referencia].filter(Boolean).join(' · ');
}

export default function ListaValidacion({ candidatas }) {
  const router = useRouter();
  const [cargando, setCargando] = useState(null);
  const [error, setError] = useState(null);

  async function cambiarEstado(slug, estado) {
    setCargando(slug);
    setError(null);
    try {
      const res = await fetch(`/api/recetas/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo actualizar la receta');
      }
      router.refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(null);
    }
  }

  if (candidatas.length === 0) {
    return <p className="vacio">No hay recetas pendientes de validar. 🎉</p>;
  }

  return (
    <>
      {error && <p className="error">{error}</p>}
      <div className="grid">
        {candidatas.map((r) => (
          <div key={r.slug} className="card">
            <div className="card-img">
              {r.imagen ? (
                <img src={r.imagen} alt={r.titulo} />
              ) : (
                <span className="card-img-placeholder">🍽️</span>
              )}
            </div>
            <div className="card-body">
              <h3>{r.titulo}</h3>
              <p>{r.descripcion}</p>
              <p className="fuente">Fuente: {fuenteTexto(r.fuente)}</p>
              <div className="acciones">
                <Link href={`/recetas/${r.slug}`} className="btn btn-ghost">
                  Ver ficha
                </Link>
                <button
                  className="btn btn-ok"
                  disabled={cargando === r.slug}
                  onClick={() => cambiarEstado(r.slug, 'aprobada')}
                >
                  {cargando === r.slug ? '...' : 'Aprobar'}
                </button>
                <button
                  className="btn btn-no"
                  disabled={cargando === r.slug}
                  onClick={() => cambiarEstado(r.slug, 'descartada')}
                >
                  Descartar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
