import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Recetario',
  description: 'Banco de recetas con índice, fichas detalladas y validación.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <header className="site-header">
          <Link href="/" className="logo">🍽️ Recetario</Link>
          <nav>
            <Link href="/">Recetas</Link>
            <Link href="/validar">Validar</Link>
          </nav>
        </header>
        <main className="container">{children}</main>
        <footer className="site-footer">Recetario · banco de recetas validadas</footer>
      </body>
    </html>
  );
}
