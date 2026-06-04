// Genera los PNG de la PWA a partir de los SVG de marca (icon.svg / icon-maskable.svg).
// Uso: node scripts/gen-pwa-icons.mjs
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const pub = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const icon = readFileSync(join(pub, "icon.svg"));
const maskable = readFileSync(join(pub, "icon-maskable.svg"));

const jobs = [
  [icon, "icon-192.png", 192],
  [icon, "icon-512.png", 512],
  [maskable, "icon-maskable-192.png", 192],
  [maskable, "icon-maskable-512.png", 512],
  // apple-touch-icon: full-bleed (sin transparencia), iOS le aplica su propio redondeo
  [maskable, "apple-touch-icon.png", 180],
];

for (const [svg, name, size] of jobs) {
  await sharp(svg, { density: 384 })
    .resize(size, size, { fit: "contain", background: "#16a34a" })
    .flatten({ background: "#16a34a" })
    .png()
    .toFile(join(pub, name));
  console.log("OK", name, `${size}x${size}`);
}
console.log("PWA icons listos.");
