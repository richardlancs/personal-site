// Writes generic placeholder "photos" for the interests' scrapbooks:
// three soft SVG scenes per interest into public/interests/<scene>/,
// named 01-placeholder.svg, 02-placeholder.svg, 03-placeholder.svg.
// They only hold the place until real photos go in: delete them when you
// add your own (docs/adding-interest-photos.md). No dependencies.
//
//   node scripts/interests/make-placeholders.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const root = new URL("../../", import.meta.url).pathname;

// [top, bottom] of each scene's soft gradient, and the drawing's ink
const palettes = [
  ["#f3d9b1", "#d98f5c", "#5a3a28"],
  ["#cfe3e6", "#6fa3ab", "#1f4a50"],
  ["#e9dcf0", "#a58bbf", "#3d2c52"],
];

const scenes = {
  // a ball, a hoop and a court line
  basketball: [
    `<circle cx="300" cy="250" r="90" fill="#e07a3a"/><g fill="none" stroke="#5a2e14" stroke-width="6"><circle cx="300" cy="250" r="90"/><path d="M300 160v180M210 250h180M240 185c40 40 40 90 0 130M360 185c-40 40-40 90 0 130"/></g>`,
    `<rect x="230" y="90" width="140" height="95" rx="6" fill="#fff" fill-opacity=".8"/><rect x="275" y="140" width="50" height="35" fill="none" stroke="#c44" stroke-width="5"/><path d="M262 185h76l-10 70h-56z" fill="none" stroke="#fff" stroke-width="4"/><rect x="290" y="255" width="20" height="200" fill="#555"/>`,
    `<path d="M0 470h600" stroke="#fff" stroke-width="8"/><path d="M150 470a150 120 0 0 1 300 0" fill="none" stroke="#fff" stroke-width="8"/><circle cx="420" cy="230" r="45" fill="#e07a3a"/>`,
  ],
  // a shuttle, a racket and a net
  badminton: [
    `<g transform="rotate(-25 300 260)"><path d="M250 150h100l-30 150h-40z" fill="#fff" fill-opacity=".9" stroke="#999" stroke-width="3"/><circle cx="300" cy="320" r="28" fill="#f4f1ea" stroke="#999" stroke-width="3"/></g>`,
    `<ellipse cx="300" cy="200" rx="85" ry="110" fill="none" stroke="#333" stroke-width="10"/><g stroke="#333" stroke-opacity=".35" stroke-width="2"><path d="M245 120v160M275 95v210M300 90v220M325 95v210M355 120v160M220 160h160M215 200h170M220 240h160"/></g><rect x="292" y="310" width="16" height="170" rx="6" fill="#333"/>`,
    `<rect x="40" y="250" width="520" height="130" fill="none" stroke="#fff" stroke-width="5"/><g stroke="#fff" stroke-opacity=".6" stroke-width="2"><path d="M40 280h520M40 310h520M40 340h520M100 250v130M160 250v130M220 250v130M280 250v130M340 250v130M400 250v130M460 250v130M520 250v130"/></g><path d="M0 470h600" stroke="#fff" stroke-width="6"/>`,
  ],
  // a king, a board, a knight
  chess: [
    `<g fill="#2a2a2a"><circle cx="300" cy="150" r="30"/><path d="M265 195h70l-15 170h-40z"/><rect x="230" y="365" width="140" height="45" rx="10"/><path d="M293 85h14v40h-14zM280 98h40v14h-40z"/></g>`,
    `<g transform="translate(140 130)">${Array.from({ length: 16 }, (_, i) => {
      const x = (i % 4) * 80, y = Math.floor(i / 4) * 80;
      return `<rect x="${x}" y="${y}" width="80" height="80" fill="${(i + Math.floor(i / 4)) % 2 ? "#6b4f3a" : "#f1e4cc"}"/>`;
    }).join("")}</g>`,
    `<path d="M240 420h140l-10-50c40-60 30-140-40-180l-20 30-30-20c-40 60-60 110-50 140l40-10z" fill="#2a2a2a"/><rect x="220" y="420" width="180" height="40" rx="10" fill="#2a2a2a"/>`,
  ],
  // cards, chips, a hand
  poker: [
    `<g transform="rotate(-10 300 260)"><rect x="200" y="120" width="160" height="230" rx="14" fill="#fff"/><text x="225" y="175" font-family="Georgia, serif" font-size="44" fill="#b33">A</text><path d="M280 220c-30 30-45 45-45 62a22 22 0 0 0 45 8 22 22 0 0 0 45-8c0-17-15-32-45-62z" fill="#b33"/></g>`,
    `<g>${[0, 1, 2, 3, 4].map((i) => `<ellipse cx="300" cy="${380 - i * 28}" rx="90" ry="28" fill="${i % 2 ? "#2d6a8a" : "#b33"}" stroke="#fff" stroke-width="5" stroke-dasharray="18 14"/>`).join("")}</g>`,
    `${[-24, -8, 8, 24].map((a, i) => `<rect x="240" y="150" width="120" height="175" rx="12" fill="#fff" stroke="#888" stroke-width="2" transform="rotate(${a} 300 420)"/><text x="255" y="190" font-family="Georgia, serif" font-size="30" fill="${i % 2 ? "#222" : "#b33"}" transform="rotate(${a} 300 420)">${["10", "J", "Q", "K"][i]}</text>`).join("")}`,
  ],
};

for (const [scene, drawings] of Object.entries(scenes)) {
  const dir = path.join(root, "public", "interests", scene);
  mkdirSync(dir, { recursive: true });
  drawings.forEach((drawing, i) => {
    const [top, bottom, ink] = palettes[i];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
<title>Placeholder photo</title>
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
<radialGradient id="v" cx=".5" cy=".45" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></radialGradient></defs>
<rect width="600" height="600" fill="url(#g)"/>
${drawing}
<rect width="600" height="600" fill="url(#v)"/>
<text x="300" y="565" text-anchor="middle" font-family="system-ui, sans-serif" font-size="22" fill="${ink}" fill-opacity=".7">placeholder</text>
</svg>
`;
    writeFileSync(path.join(dir, `0${i + 1}-placeholder.svg`), svg);
  });
}
console.log("wrote 3 placeholders for", Object.keys(scenes).join(", "));
