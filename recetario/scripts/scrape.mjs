// Lanza el Instagram Scraper de Apify para las cuentas de data/fuentes.json
// y guarda los posts en data/_scraping/ para convertirlos luego en recetas
// candidatas.
//
// Requiere la variable de entorno APIFY_TOKEN y acceso de red a api.apify.com.
//
// Uso:
//   node scripts/scrape.mjs                  -> todas las cuentas de fuentes.json
//   node scripts/scrape.mjs chefbosquet      -> solo esa(s) cuenta(s)
//   POSTS_POR_CUENTA=5 node scripts/scrape.mjs

import fs from 'fs';
import path from 'path';

const TOKEN = process.env.APIFY_TOKEN;
const ACTOR = process.env.APIFY_ACTOR || 'apify~instagram-scraper';
const POSTS_POR_CUENTA = Number(process.env.POSTS_POR_CUENTA || 8);

if (!TOKEN) {
  console.error('Falta la variable de entorno APIFY_TOKEN.');
  process.exit(1);
}

const ROOT = path.join(import.meta.dirname, '..');
const fuentes = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'data', 'fuentes.json'), 'utf-8')
);

const filtro = process.argv.slice(2).map((s) => s.toLowerCase().replace(/^@/, ''));
const cuentas = fuentes.cuentas
  .filter((c) => c.plataforma === 'instagram')
  .filter((c) => filtro.length === 0 || filtro.includes(c.usuario.toLowerCase()));

if (cuentas.length === 0) {
  console.error('No hay cuentas que coincidan con el filtro.');
  process.exit(1);
}

const endpoint = `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?token=${TOKEN}`;
const resultados = [];

for (const cuenta of cuentas) {
  console.log(`Scrapeando @${cuenta.usuario} ...`);
  const input = {
    directUrls: [`https://www.instagram.com/${cuenta.usuario}/`],
    resultsType: 'posts',
    resultsLimit: POSTS_POR_CUENTA,
    addParentData: false,
  };
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      console.error(`  Error ${res.status}: ${(await res.text()).slice(0, 200)}`);
      continue;
    }
    const posts = await res.json();
    console.log(`  ${posts.length} posts obtenidos.`);
    for (const p of posts) {
      resultados.push({
        cuenta: cuenta.usuario,
        url: p.url || p.postUrl || null,
        fecha: p.timestamp || null,
        tipo: p.type || null,
        imagen: p.displayUrl || (Array.isArray(p.images) ? p.images[0] : null),
        texto: p.caption || '',
      });
    }
  } catch (e) {
    console.error(`  Fallo al scrapear @${cuenta.usuario}: ${e.message}`);
  }
}

const dir = path.join(ROOT, 'data', '_scraping');
fs.mkdirSync(dir, { recursive: true });
const fichero = path.join(dir, `posts-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`);
fs.writeFileSync(fichero, JSON.stringify(resultados, null, 2) + '\n');

console.log(`\n${resultados.length} posts guardados en ${path.relative(ROOT, fichero)}`);
console.log('Siguiente paso: pídeme que los convierta en recetas candidatas.');
