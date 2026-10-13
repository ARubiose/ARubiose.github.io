// Imágenes genéricas de la plantilla (avatar e imagen al compartir), sin personas reales.
// Uso: node scripts/make-placeholder-images.mjs <profile.jpg> [og-image.png]
import sharp from "sharp";

const [photo, og] = process.argv.slice(2);
const avatar = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1f3a4d"/><stop offset="1" stop-color="#0d1b24"/></linearGradient></defs>
  <rect width="800" height="800" fill="url(#g)"/>
  <circle cx="400" cy="310" r="150" fill="#5fa8a0"/>
  <path d="M130 800c20-190 140-290 270-290s250 100 270 290z" fill="#5fa8a0"/>
</svg>`;
await sharp(Buffer.from(avatar)).jpeg({ quality: 85 }).toFile(photo);

if (og) {
    const card = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="627">
  <rect width="1200" height="627" fill="#0d1b24"/>
  <text x="80" y="300" font-family="monospace" font-size="72" fill="#e6edf3">Ada Lovelace</text>
  <text x="80" y="380" font-family="monospace" font-size="36" fill="#5fa8a0">Backend software engineer · demo</text>
  <text x="80" y="540" font-family="monospace" font-size="28" fill="#8b949e">llm-wiki-portfolio</text>
</svg>`;
    await sharp(Buffer.from(card)).png().toFile(og);
}
