import { getApprovedRecipes } from '@/lib/recipes';
import BuscadorRecetas from '@/components/BuscadorRecetas';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const recetas = getApprovedRecipes();

  return (
    <>
      <section className="hero">
        <h1>Índice de recetas</h1>
        <p>
          {recetas.length === 0
            ? 'Todavía no hay recetas aprobadas en el banco de datos.'
            : `${recetas.length} receta${recetas.length === 1 ? '' : 's'} validada${recetas.length === 1 ? '' : 's'} y lista${recetas.length === 1 ? '' : 's'} para cocinar.`}
        </p>
      </section>
      <BuscadorRecetas recetas={recetas} />
    </>
  );
}
