import { getCandidateRecipes } from '@/lib/recipes';
import ListaValidacion from '@/components/ListaValidacion';

export const dynamic = 'force-dynamic';

export default function ValidarPage() {
  const candidatas = getCandidateRecipes();

  return (
    <>
      <section className="hero">
        <h1>Validar recetas</h1>
        <p>
          Recetas candidatas procedentes de PDF o scraping. Aprueba las que quieras
          incluir en el banco de datos o descártalas.
        </p>
      </section>
      <ListaValidacion candidatas={candidatas} />
    </>
  );
}
