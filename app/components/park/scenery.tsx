// Building blocks for the park's illustrations, in a soft, painterly style:
// big simple masses in a few deep tones, with the light from the top left.
// The edges are softened by the shared "paint" filter (Sky.tsx) wherever
// a scene is drawn. Colors are CSS variables from globals.css, so
// everything switches to its night version with the theme.
//
// Each piece is drawn standing on (0, 0), so `x`/`y` is where it meets the
// ground.

type Placement = { x: number; y: number; scale?: number; flip?: boolean };

const place = ({ x, y, scale = 1, flip = false }: Placement) =>
  `translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`;

// A repeatable pseudo-random number in [0, 1), so the drawings come out the
// same on the server and in the browser.
export const rand = (n: number) => {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
};

// A deep, old tree: a few big rounded masses of foliage, each in a shadow
// tone with a lit face on its upper left, and a dark hollow under the crown.
export function Tree(props: Placement) {
  return (
    <g transform={place(props)}>
      <ellipse cx="8" cy="0" rx="62" ry="9" fill="var(--shadow)" />
      <path
        d="M-12 0c5-12 6-32 3-56-2-14-9-24-18-32l9-5c7 6 11 12 14 19 2-11 7-19 13-25l8 6c-7 8-10 18-10 30 0 24 2 46 7 63Z"
        fill="var(--trunk)"
      />
      <path d="M2 0c-2-18-2-40 0-60l7-2c-2 22-1 44 3 62Z" fill="var(--trunk-dark)" />
      <g fill="var(--leaf-deep)">
        <circle cx="0" cy="-122" r="60" />
        <circle cx="-54" cy="-92" r="40" />
        <circle cx="54" cy="-94" r="42" />
        <circle cx="-30" cy="-166" r="40" />
        <circle cx="32" cy="-162" r="38" />
        <circle cx="-68" cy="-130" r="30" />
        <circle cx="70" cy="-130" r="30" />
      </g>
      <g fill="var(--leaf-dark)">
        <circle cx="-6" cy="-130" r="50" />
        <circle cx="-58" cy="-100" r="30" />
        <circle cx="44" cy="-104" r="32" />
        <circle cx="-34" cy="-172" r="32" />
        <circle cx="24" cy="-170" r="28" />
        <circle cx="-70" cy="-136" r="22" />
      </g>
      <g fill="var(--leaf)">
        <circle cx="-20" cy="-146" r="30" />
        <circle cx="-62" cy="-108" r="18" />
        <circle cx="-40" cy="-182" r="20" />
        <circle cx="16" cy="-180" r="16" />
        <circle cx="26" cy="-118" r="18" />
      </g>
      <g fill="var(--leaf-light)">
        <circle cx="-30" cy="-160" r="12" />
        <circle cx="-68" cy="-116" r="7" />
        <circle cx="-46" cy="-192" r="8" />
        <circle cx="6" cy="-190" r="6" />
        <circle cx="-10" cy="-136" r="5" />
        <circle cx="18" cy="-124" r="6" />
      </g>
      {/* The shaded hollow beneath the crown */}
      <path d="M-50-76q50 22 100 0-12 10-50 12-38-2-50-12Z" fill="var(--leaf-deep)" opacity="0.6" />
    </g>
  );
}

export function Bush(props: Placement) {
  return (
    <g transform={place(props)}>
      <ellipse cx="4" cy="0" rx="36" ry="5" fill="var(--shadow)" />
      <g fill="var(--leaf-deep)">
        <circle cx="-22" cy="-12" r="18" />
        <circle cx="0" cy="-21" r="23" />
        <circle cx="23" cy="-12" r="18" />
      </g>
      <g fill="var(--leaf-dark)">
        <circle cx="-24" cy="-16" r="13" />
        <circle cx="-4" cy="-26" r="17" />
        <circle cx="16" cy="-18" r="12" />
      </g>
      <g fill="var(--leaf)">
        <circle cx="-10" cy="-32" r="8" />
        <circle cx="-27" cy="-21" r="6" />
      </g>
    </g>
  );
}

// One flower with separate petals around a center
export function Blossom({
  x,
  y,
  r = 4,
  petals = 5,
  color,
  turn = 0,
}: {
  x: number;
  y: number;
  r?: number;
  petals?: number;
  color: string;
  turn?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${turn})`}>
      {Array.from({ length: petals }, (_, i) => (
        <ellipse
          key={i}
          cx="0"
          cy={-r * 0.75}
          rx={r * 0.5}
          ry={r * 0.8}
          transform={`rotate(${(i * 360) / petals})`}
          fill={color}
        />
      ))}
      <circle r={r * 0.38} fill="var(--petal-center)" />
    </g>
  );
}

const petalColors = ["var(--petal-pink)", "var(--petal-yellow)", "var(--petal-white)"];

// A small clump of wildflowers: curved stems with leaves, a few open
// flowers at different heights and a closed bud.
export function Flowers({ hue = 0, ...props }: Placement & { hue?: 0 | 1 | 2 }) {
  const petal = petalColors[hue];
  return (
    <g transform={place(props)}>
      <g stroke="var(--leaf-dark)" strokeWidth="1.4" strokeLinecap="round" fill="none">
        <path d="M-9 0q-2-8 0-15M0 0q2-10-1-21M10 0q1-7-2-12M4 0q3-6 6-9" />
      </g>
      <g fill="var(--leaf-dark)">
        <ellipse cx="-12" cy="-6" rx="4" ry="1.6" transform="rotate(-30 -12 -6)" />
        <ellipse cx="4" cy="-9" rx="4" ry="1.6" transform="rotate(25 4 -9)" />
      </g>
      <Blossom x={-9} y={-16} r={3.8} color={petal} turn={10} />
      <Blossom x={-1} y={-22} r={4.4} color={petal} turn={-20} />
      <Blossom x={8} y={-13} r={3.4} color={petal} turn={30} />
      <ellipse cx="10" cy="-10" rx="1.8" ry="2.6" fill={petal} />
    </g>
  );
}

// A clump of tall grass: tapering blades in three greens, leaning a little
// differently each time. `seed` varies the clump; it sways when the scene
// it's in is hovered (globals.css, .sway).
export function TallGrass({
  seed = 1,
  height = 46,
  blades = 13,
  ...props
}: Placement & { seed?: number; height?: number; blades?: number }) {
  const tones = ["var(--blade-dark)", "var(--blade)", "var(--blade-light)"];
  return (
    <g transform={place(props)}>
      <g className="sway">
        {Array.from({ length: blades }, (_, i) => {
          const r1 = rand(seed * 31 + i);
          const r2 = rand(seed * 17 + i * 3);
          const base = (i - blades / 2) * 2.6 + (r1 - 0.5) * 4;
          const h = height * (0.55 + r2 * 0.6);
          const lean = (r1 - 0.45) * h * 0.55;
          const w = 1.3 + r2 * 1.1;
          return (
            <path
              key={i}
              d={`M${base - w} 0Q${base + lean * 0.35} ${-h * 0.55} ${base + lean} ${-h}Q${base + lean * 0.35 + w} ${-h * 0.5} ${base + w} 0Z`}
              fill={tones[(i + seed) % 3]}
            />
          );
        })}
      </g>
    </g>
  );
}

// A lamp post. Its glow is off by day and lit at night (--glow).
export function Lamp(props: Placement) {
  return (
    <g transform={place(props)}>
      <circle cx="0" cy="-122" r="54" fill="url(#lamp-glow)" style={{ opacity: "var(--glow)" }} />
      <ellipse cx="2" cy="0" rx="14" ry="3" fill="var(--shadow)" />
      <rect x="-3" y="-112" width="6" height="112" rx="2" fill="var(--metal)" />
      <rect x="-8" y="-8" width="16" height="8" rx="2" fill="var(--metal)" />
      <path d="M-10-112h20l-3-20H-7Z" fill="var(--lamp)" />
      <path d="M-13-132h26L0-142Z" fill="var(--metal)" />
    </g>
  );
}

export function Bench(props: Placement) {
  return (
    <g transform={place(props)}>
      <ellipse cx="0" cy="0" rx="58" ry="5" fill="var(--shadow)" />
      <g stroke="var(--metal)" strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M-42 0l2-30M42 0l-2-30M-42-30l-4-34M42-30l4-34" />
      </g>
      <rect x="-54" y="-68" width="108" height="9" rx="3" fill="var(--wood-light)" />
      <rect x="-54" y="-54" width="108" height="9" rx="3" fill="var(--wood-light)" />
      <rect x="-56" y="-36" width="112" height="6" rx="2" fill="var(--wood)" />
      <rect x="-58" y="-31" width="116" height="7" rx="3" fill="var(--wood-light)" />
    </g>
  );
}

// The grass and footpath along the bottom of every section. It stretches to
// the section's width, and both ends sit at the same heights so neighbouring
// sections join into one continuous path. A fringe of grass blades (a
// repeating pattern, so it never stretches) runs along its top edge.
export function Ground() {
  return (
    <>
      <svg className="grass-fringe" aria-hidden="true" focusable="false">
        <rect width="100%" height="100%" fill="url(#blades-back)" />
        <rect width="100%" height="100%" fill="url(#blades-front)" />
      </svg>
      <svg
        className="ground"
        viewBox="0 0 1000 160"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M0 22C170 4 330 6 500 20s330 20 500 2v138H0Z" fill="var(--grass-back)" />
        <path d="M0 44c200-14 380 6 560-4s240 18 440 4v116H0Z" fill="var(--grass)" />
        <path
          d="M0 80c220-12 420 14 640 2s140 10 360-2v26c-140-6-300 8-480 2S160 100 0 106Z"
          fill="var(--path)"
        />
        <path d="M0 126c260-10 520 10 760 0s40 10 240 0v34H0Z" fill="var(--grass-front)" />
      </svg>
    </>
  );
}

// Blades for the repeating grass patterns: `width` wide, standing on `height`.
export function bladePattern(seed: number, width: number, height: number, count: number) {
  const tones = ["var(--blade-dark)", "var(--blade)", "var(--blade-light)"];
  return Array.from({ length: count }, (_, i) => {
    const base = (i + rand(seed + i) * 0.8) * (width / count);
    const h = height * (0.45 + rand(seed * 7 + i) * 0.55);
    const lean = (rand(seed * 3 + i) - 0.5) * h * 0.6;
    const w = 1.2 + rand(seed + i * 5);
    return (
      <path
        key={i}
        d={`M${base - w} ${height}Q${base + lean * 0.35} ${height - h * 0.55} ${base + lean} ${height - h}Q${base + lean * 0.35 + w} ${height - h * 0.5} ${base + w} ${height}Z`}
        fill={tones[(i * 7 + seed) % 3]}
      />
    );
  });
}
