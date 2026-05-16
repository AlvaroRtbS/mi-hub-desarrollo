import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getRecipeBySlug } from '@/lib/recipes';

export const dynamic = 'force-dynamic';

const ESTADO_BADGE = {
  candidata: { txt: 'Candidata · pendiente de validar', cls: 'badge-candidata' },
  descartada: { txt: 'Descartada', cls: 'badge-descartada' },
};

function fuenteTexto(f) {
  if (!f) return 'Desconocida';
  const tipos = { pdf: 'PDF', scraping: 'Scraping', manual: 'Manual' };
  return [tipos[f.tipo] || f.tipo, f.cuenta, f.referencia].filter(Boolean).join(' · ');
}

export default async function RecetaPage({ params }) {
  const { slug } = await params;
  const receta = getRecipeBySlug(slug);
  if (!receta) notFound();

  const badge = ESTADO_BADGE[receta.estado];
  const tiempoTotal = (receta.tiempoPreparacionMin || 0) + (receta.tiempoCoccionMin || 0);

  return (
    <article className="receta-detalle">
      <Link href="/" className="volver">← Volver al índice</Link>

      {receta.imagen ? (
        <img className="receta-hero-img" src={receta.imagen} alt={receta.titulo} />
      ) : (
        <div className="receta-hero-img" />
      )}

      {badge && (
        <p style={{ marginTop: '1rem', marginBottom: 0 }}>
          <span className={`badge ${badge.cls}`}>{badge.txt}</span>
        </p>
      )}

      <h1>{receta.titulo}</h1>
      {receta.descripcion && <p className="descripcion">{receta.descripcion}</p>}

      <div className="meta-row">
        {receta.dificultad && (
          <div><strong>Dificultad</strong>{receta.dificultad}</div>
        )}
        {tiempoTotal > 0 && (
          <div><strong>Tiempo total</strong>{tiempoTotal} min</div>
        )}
        {receta.raciones && (
          <div><strong>Raciones</strong>{receta.raciones}</div>
        )}
        {receta.categorias?.length > 0 && (
          <div><strong>Categorías</strong>{receta.categorias.join(', ')}</div>
        )}
      </div>

      <div className="receta-cols">
        <section>
          <h2>Ingredientes</h2>
          <ul className="ingredientes">
            {(receta.ingredientes || []).map((ing, i) => {
              const cant = [ing.cantidad, ing.unidad].filter(Boolean).join(' ');
              return (
                <li key={i}>
                  {cant && <span className="cant">{cant} </span>}
                  {ing.nombre}
                </li>
              );
            })}
          </ul>
        </section>
        <section>
          <h2>Elaboración</h2>
          <ol className="pasos">
            {(receta.pasos || []).map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ol>
        </section>
      </div>

      {receta.nutricion && (
        <div className="panel">
          <h2>
            Información nutricional{' '}
            <span style={{ fontWeight: 400, fontSize: '0.85rem', color: 'var(--muted)' }}>
              (por ración)
            </span>
          </h2>
          <div className="nutricion-grid">
            <div>
              <div className="valor">{receta.nutricion.caloriasPorRacion ?? '–'}</div>
              <div className="etq">kcal</div>
            </div>
            <div>
              <div className="valor">{receta.nutricion.proteinasG ?? '–'}</div>
              <div className="etq">Proteínas (g)</div>
            </div>
            <div>
              <div className="valor">{receta.nutricion.carbohidratosG ?? '–'}</div>
              <div className="etq">Carbohidratos (g)</div>
            </div>
            <div>
              <div className="valor">{receta.nutricion.grasasG ?? '–'}</div>
              <div className="etq">Grasas (g)</div>
            </div>
          </div>
        </div>
      )}

      {receta.notas && (
        <div className="panel">
          <h2>Notas</h2>
          <p style={{ margin: 0 }}>{receta.notas}</p>
        </div>
      )}

      {receta.fuente && (
        <p className="fuente" style={{ marginTop: '1.5rem' }}>
          Fuente: {fuenteTexto(receta.fuente)}
          {receta.fechaAnadida ? ` · Añadida el ${receta.fechaAnadida}` : ''}
        </p>
      )}
    </article>
  );
}
