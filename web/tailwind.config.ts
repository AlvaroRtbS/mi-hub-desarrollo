import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0fdf4",
          400: "#4ade80",
          // 500/600/700 son dinámicos: el coach los configura en /ajustes y
          // las variables CSS se inyectan en los layouts. Default = verde.
          500: "var(--brand, #22c55e)",
          600: "var(--brand, #16a34a)",
          700: "var(--brand-hover, #15803d)",
          900: "#14532d",
          950: "#052e16",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
