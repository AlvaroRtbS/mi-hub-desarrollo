import type { NextConfig } from "next";

// Cabeceras de seguridad. Aquí viven datos de salud de personas reales, así
// que el mínimo es: no dejar que nadie meta el portal en un iframe
// (clickjacking sobre el formulario de onboarding), no dejar que el navegador
// adivine tipos de contenido, y no filtrar la URL completa —que lleva ids de
// clienta— al navegar a sitios externos.
const CABECERAS_SEGURIDAD = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: CABECERAS_SEGURIDAD }];
  },
  webpack: (config) => {
    // Importar archivos .md como string (los manuales del cajón de tutoriales y /c/ayuda).
    config.module.rules.push({ test: /\.md$/, type: "asset/source" });
    return config;
  },
};

export default nextConfig;
