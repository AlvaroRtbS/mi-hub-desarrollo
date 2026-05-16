import Link from 'next/link';

function tiempoTotal(r) {
  return (r.tiempoPreparacionMin || 0) + (r.tiempoCoccionMin || 0);
}

export default function RecipeCard({ receta }) {
  const total = tiempoTotal(receta);

  return (
    <Link href={`/recetas/${receta.slug}`} className="card">
      <div className="card-img">
        {receta.imagen ? (
          <img src={receta.imagen} alt={receta.titulo} />
        ) : (
          <span className="card-img-placeholder">🍽️</span>
        )}
      </div>
      <div className="card-body">
        <h3>{receta.titulo}</h3>
        <p>{receta.descripcion}</p>
        <div className="card-meta">
          {receta.dificultad && <span>{receta.dificultad}</span>}
          {total > 0 && <span>⏱ {total} min</span>}
          {receta.raciones && <span>🍽 {receta.raciones} rac.</span>}
        </div>
      </div>
    </Link>
  );
}
