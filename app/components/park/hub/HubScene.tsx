import { Blossom, Flowers, rand, TallGrass } from "../scenery";
import { destinations, pathRibbon, PLAZA } from "./paths";

// The central clearing, looking out over a city that was left behind:
// quiet towers with broken tops, vines pouring down their faces, a snapped
// overpass and a rusted car, all softened by haze. The park has grown back
// over the streets, and paths lead from an old fountain to each section.
//
// It is drawn as separate depth layers (far to near) so that Hub.tsx can
// drift them apart with the pointer. Every layer shares the 1600 × 900
// canvas from paths.ts and is painted with the soft "paint" filter.

function Layer({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      className={`hub-svg ${className}`}
      viewBox="0 0 1600 900"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <g filter="url(#paint)">{children}</g>
    </svg>
  );
}

export function HubSky() {
  return (
    <svg className="hub-svg" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="hub-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--hub-sky-1)" />
          <stop offset="0.5" stopColor="var(--hub-sky-2)" />
          <stop offset="0.72" stopColor="var(--hub-sky-3)" />
        </linearGradient>
        <radialGradient id="hub-sun-glow">
          <stop offset="0" stopColor="var(--hub-glow)" stopOpacity="0.85" />
          <stop offset="1" stopColor="var(--hub-glow)" stopOpacity="0" />
        </radialGradient>
        <filter id="hub-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>
      <rect width="1600" height="900" fill="url(#hub-sky)" />
      <circle cx="1060" cy="230" r="440" fill="url(#hub-sun-glow)" />
      <circle cx="1060" cy="230" r="44" fill="var(--hub-sun)" />

      {/* Light falling through the haze */}
      <g fill="var(--hub-ray)" filter="url(#hub-soft)">
        <path d="M1060 230L700 900h120Z" />
        <path d="M1060 230L930 900h70Z" />
        <path d="M1060 230L1160 900h110Z" />
        <path d="M1060 230L1380 900h60Z" />
      </g>

      {/* Long, thin clouds */}
      <g fill="var(--cloud)" filter="url(#hub-soft)" opacity="0.7">
        <ellipse cx="300" cy="150" rx="260" ry="18" />
        <ellipse cx="560" cy="90" rx="200" ry="12" />
        <ellipse cx="1300" cy="120" rx="240" ry="16" />
        <ellipse cx="900" cy="330" rx="320" ry="10" />
      </g>
    </svg>
  );
}

// [left x, width, top y, broken top?]
const farTowers: [number, number, number, boolean][] = [
  [255, 70, 290, false], [318, 52, 330, true], [372, 92, 175, true], [458, 64, 240, false],
  [516, 74, 330, false], [584, 58, 372, true], [636, 84, 392, false], [714, 62, 366, true],
  [770, 92, 400, false], [856, 56, 356, false], [906, 72, 384, true], [972, 64, 312, false],
  [1030, 98, 196, true], [1122, 62, 258, false], [1178, 84, 222, true], [1256, 58, 286, false],
];
const FAR_BASE = 500;

function towerOutline([x, w, top, broken]: (typeof farTowers)[number]) {
  if (!broken) return `M${x} ${FAR_BASE}V${top}h${w}V${FAR_BASE}Z`;
  // A jagged, torn-off top
  return `M${x} ${FAR_BASE}V${top + 22}l${w * 0.18} -22l${w * 0.16} 20l${w * 0.2} -10l${w * 0.16} 30l${w * 0.3} -14V${FAR_BASE}Z`;
}

export function HubFarCity() {
  return (
    <Layer>
      <g fill="var(--city-far)">
        {farTowers.map((tower, i) => (
          <path
            key={i}
            d={towerOutline(tower)}
            // One tower leans where its foundations gave way
            transform={i === 7 ? `rotate(6 ${tower[0]} ${FAR_BASE})` : undefined}
          />
        ))}
        {/* The top of a snapped tower, resting against its neighbour */}
        <path d="M1128 268l70-34 26 52-70 34Z" />
        <rect x="402" y="140" width="4" height="40" />
      </g>
      {/* Faint floors on the nearer towers */}
      <g stroke="var(--city-far-line)" strokeWidth="2">
        {farTowers
          .filter((_, i) => i % 3 !== 1)
          .map(([x, w, top]) =>
            Array.from({ length: Math.floor((FAR_BASE - top - 30) / 22) }, (_, f) => (
              <path key={`${x}-${f}`} d={`M${x + 6} ${top + 34 + f * 22}h${w - 12}`} />
            )),
          )}
      </g>
      {/* Greenery reclaiming the broken tops */}
      <g fill="var(--city-far-green)">
        {farTowers
          .filter(([, , , broken]) => broken)
          .map(([x, w, top]) => (
            <g key={x}>
              <circle cx={x + w * 0.3} cy={top + 18} r={w * 0.22} />
              <circle cx={x + w * 0.6} cy={top + 26} r={w * 0.18} />
              <path d={`M${x + w * 0.25} ${top + 20}q-4 40 2 70`} stroke="var(--city-far-green)" strokeWidth="5" fill="none" />
            </g>
          ))}
      </g>
      {/* Haze swallowing the bases */}
      <defs>
        <linearGradient id="hub-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--hub-sky-3)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--hub-sky-3)" stopOpacity="0.85" />
        </linearGradient>
      </defs>
      <rect x="0" y="330" width="1600" height="180" fill="url(#hub-haze)" />
    </Layer>
  );
}

// [left x, width, top y]
const midBuildings: [number, number, number][] = [
  [-60, 170, 70], [100, 130, 196], [218, 120, 300],
  [1262, 128, 280], [1380, 130, 120], [1500, 160, 210],
];
const MID_BASE = 600;

function Windows({ x, w, top, seed }: { x: number; w: number; top: number; seed: number }) {
  const cols = Math.floor((w - 20) / 24);
  const rows = Math.floor((MID_BASE - top - 40) / 32);
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const n = rand(seed * 101 + r * 13 + c);
      if (n < 0.12) continue; // panel missing
      cells.push(
        <rect
          key={`${r}-${c}`}
          x={x + 14 + c * 24}
          y={top + 26 + r * 32}
          width="11"
          height="15"
          rx="1"
          fill={n > 0.82 ? "var(--city-window-dark)" : "var(--city-window)"}
        />,
      );
    }
  }
  return <>{cells}</>;
}

// Vines pouring from a roof edge, with leaves bunched along them
function Vines({ x, w, top, seed }: { x: number; w: number; top: number; seed: number }) {
  const strands = Math.max(3, Math.floor(w / 26));
  return (
    <g>
      {Array.from({ length: strands }, (_, i) => {
        const vx = x + 8 + (i + rand(seed + i)) * ((w - 16) / strands);
        const length = 60 + rand(seed * 5 + i) * (MID_BASE - top) * 0.7;
        const sway = (rand(seed * 9 + i) - 0.5) * 24;
        return (
          <g key={i}>
            <path
              d={`M${vx} ${top}q${sway} ${length * 0.5} ${sway * 0.4} ${length}`}
              stroke="var(--vine)"
              strokeWidth={3 + rand(seed + i * 2) * 4}
              strokeLinecap="round"
              fill="none"
            />
            {Array.from({ length: Math.floor(length / 30) }, (_, k) => (
              <circle
                key={k}
                cx={vx + sway * 0.45 * Math.sin((k / 3) * Math.PI) + (k % 2 ? 4 : -4)}
                cy={top + 16 + k * 30}
                r={4 + rand(seed + i + k) * 5}
                fill={k % 3 ? "var(--vine)" : "var(--vine-light)"}
              />
            ))}
          </g>
        );
      })}
      {/* Moss over the roof edge */}
      {Array.from({ length: Math.ceil(w / 22) }, (_, i) => (
        <circle key={i} cx={x + i * 22 + 6} cy={top + 2} r={9 + rand(seed + i * 7) * 7} fill="var(--vine)" />
      ))}
    </g>
  );
}

export function HubMidCity() {
  return (
    <Layer>
      {/* The broken overpass across the middle distance */}
      <g fill="var(--concrete)">
        <path d="M300 420h470l-6 22H300Z" />
        <path d="M842 446l10-30h448v22H850Z" />
        {/* The end that came down */}
        <path d="M770 420l40 64-12 10-44-52Z" />
        <rect x="380" y="440" width="22" height="120" />
        <rect x="620" y="440" width="22" height="120" />
        <rect x="1000" y="438" width="22" height="120" />
        <rect x="1200" y="438" width="22" height="120" />
      </g>
      <g fill="var(--city-far-green)">
        {[340, 420, 520, 650, 720, 900, 980, 1080, 1160, 1260].map((x, i) => (
          <circle key={x} cx={x} cy={x < 800 ? 418 : 414} r={8 + (i % 3) * 4} />
        ))}
      </g>
      <path d="M760 442q6 30-4 60M1290 438q-4 24 4 44" stroke="var(--vine)" strokeWidth="3" fill="none" />

      {midBuildings.map(([x, w, top], i) => (
        <g key={x}>
          <rect x={x} y={top} width={w} height={MID_BASE - top} fill="var(--city-mid)" />
          <rect x={x + w - 18} y={top} width="18" height={MID_BASE - top} fill="var(--city-mid-dark)" />
          <Windows x={x} w={w - 18} top={top} seed={i + 1} />
          <Vines x={x} w={w} top={top} seed={i + 3} />
        </g>
      ))}

      {/* A billboard frame, its panel half torn away */}
      <g transform="translate(1290 196)">
        <path d="M14 0v90M126 0v90" stroke="var(--rust)" strokeWidth="5" />
        <rect x="0" y="-70" width="150" height="74" fill="none" stroke="var(--rust)" strokeWidth="5" />
        <path d="M2-68h86l-14 30 22 20-30 18H2Z" fill="var(--billboard)" />
        <path d="M88-68l-14 30 22 20-30 18" stroke="var(--city-mid-dark)" strokeWidth="1.5" fill="none" opacity="0.5" />
        <path d="M150-4l-10 60" stroke="var(--vine)" strokeWidth="4" />
      </g>
    </Layer>
  );
}

export function HubTreeline() {
  // A continuous band of deep, rounded treetops, taller at the sides so
  // the view opens up in the middle
  const crowns = Array.from({ length: 34 }, (_, i) => {
    const x = -40 + i * 51;
    const side = Math.abs(x - 800) / 800; // 0 in the middle, 1 at the edges
    const r = 34 + rand(i + 4) * 26 + side * 34;
    const y = 498 - side * 70 - rand(i + 9) * 18;
    return { x, y, r };
  });
  return (
    <Layer>
      <path d="M-40 600V500H1640V600Z" fill="var(--leaf-deep)" />
      <g fill="var(--leaf-deep)">
        {crowns.map(({ x, y, r }) => (
          <circle key={x} cx={x} cy={y} r={r} />
        ))}
      </g>
      <g fill="var(--leaf-dark)">
        {crowns.map(({ x, y, r }) => (
          <circle key={x} cx={x - r * 0.18} cy={y - r * 0.2} r={r * 0.72} />
        ))}
      </g>
      <g fill="var(--leaf)" opacity="0.7">
        {crowns
          .filter((_, i) => i % 3 === 0)
          .map(({ x, y, r }) => (
            <ellipse key={x} cx={x - r * 0.3} cy={y - r * 0.45} rx={r * 0.34} ry={r * 0.22} />
          ))}
      </g>
    </Layer>
  );
}

function StoneLantern({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="4" cy="0" rx="20" ry="5" fill="var(--shadow)" />
      <rect x="-10" y="-8" width="20" height="8" rx="1.5" fill="var(--stone-dark)" />
      <rect x="-4" y="-30" width="8" height="22" fill="var(--stone)" />
      <rect x="-11" y="-46" width="22" height="16" rx="2" fill="var(--stone)" />
      <rect x="-5" y="-42" width="10" height="8" fill="var(--lamp)" style={{ opacity: "calc(0.4 + var(--glow) * 0.6)" }} />
      <path d="M-17-46h34l-10-10h-14Z" fill="var(--stone-dark)" />
      <circle cx="0" cy="-58" r="3.5" fill="var(--stone-dark)" />
      <circle cx="-9" cy="-48" r="4" fill="var(--vine)" />
    </g>
  );
}

function Car({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="2" rx="74" ry="8" fill="var(--shadow)" />
      <path d="M-66 0v-22q0-8 8-10l22-4 16-20q4-4 10-4h40q6 0 10 5l14 19 14 4q8 2 8 10V0Z" fill="var(--rust)" />
      <path d="M-28-36l14-18h22v18ZM14-36v-18h16l12 18Z" fill="var(--city-window-dark)" />
      <circle cx="-38" cy="0" r="12" fill="var(--asphalt)" />
      <circle cx="40" cy="0" r="12" fill="var(--asphalt)" />
      {/* Grass grown over the roof and up the doors */}
      <TallGrass x={-6} y={-56} seed={4} height={18} blades={10} />
      <TallGrass x={-40} y={4} seed={8} height={30} blades={14} />
      <TallGrass x={44} y={4} seed={2} height={26} blades={12} />
    </g>
  );
}

// The old pavement, half taken back by grass
function Pavement({ d, cracks }: { d: string; cracks: string }) {
  return (
    <g>
      <path d={d} fill="var(--asphalt)" opacity="0.75" />
      <path d={cracks} stroke="var(--asphalt-crack)" strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  );
}

export function HubGround() {
  return (
    <Layer>
      <defs>
        <linearGradient id="hub-field" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--grass-back)" />
          <stop offset="0.45" stopColor="var(--grass)" />
          <stop offset="1" stopColor="var(--grass-front)" />
        </linearGradient>
      </defs>
      <path d="M-60 520Q300 470 800 482T1660 520V960H-60Z" fill="url(#hub-field)" />
      {/* Lighter swells in the meadow */}
      <g fill="var(--grass-back)" opacity="0.6">
        <ellipse cx="420" cy="600" rx="260" ry="40" />
        <ellipse cx="1180" cy="610" rx="280" ry="44" />
      </g>

      <Pavement
        d="M240 700l300-40 60 70-340 50Z"
        cracks="M300 712l60 10 30-14M420 690l20 40 50 6M520 700l-30 30"
      />
      <Pavement
        d="M1040 690l330 20-20 76-360-30Z"
        cracks="M1080 712l50 14 40-8M1220 704l-10 40 40 14M1300 720l30 30"
      />
      <path d="M262 742l60-8M352 730l60-8M442 718l60-8" stroke="var(--lane)" strokeWidth="5" strokeLinecap="round" />

      <Car x={1210} y={650} />

      {/* A traffic light that has toppled over */}
      <g transform="translate(160 640) rotate(-62)">
        <rect x="-3" y="-120" width="6" height="120" fill="var(--metal)" />
        <rect x="-12" y="-156" width="24" height="40" rx="4" fill="var(--city-mid-dark)" />
        <circle cx="0" cy="-146" r="5" fill="var(--rust)" />
        <circle cx="0" cy="-128" r="5" fill="var(--city-window)" />
      </g>
      <TallGrass x={120} y={652} seed={6} height={34} />

      {/* The paths, for wide, tablet and phone screens */}
      {(["wide", "mid", "narrow"] as const).map((layout) => (
        <g key={layout} className={`hub-${layout}`}>
          {destinations.map((destination) => (
            <g key={destination.id}>
              <path d={pathRibbon(destination[layout], destination.bend, 52, 18)} fill="var(--path-edge)" />
              <path d={pathRibbon(destination[layout], destination.bend, 40, 12)} fill="var(--path)" />
            </g>
          ))}
          {destinations.map((destination) => (
            <StoneLantern key={destination.id} x={destination[layout][0]} y={destination[layout][1] + 4} />
          ))}
        </g>
      ))}

      {/* The fountain plaza: a cracked stone ring around a dry basin */}
      <g transform={`translate(${PLAZA.x} ${PLAZA.y})`}>
        <ellipse cx="0" cy="0" rx="176" ry="54" fill="var(--stone-dark)" />
        <ellipse cx="0" cy="-4" rx="168" ry="50" fill="var(--stone)" />
        <g stroke="var(--stone-dark)" strokeWidth="2" fill="none">
          <ellipse cx="0" cy="-4" rx="120" ry="34" />
          <path d="M-168-4h48M120-4h48M0-54v16M-90-44l20 12M90-44l-20 12M-60 40l10-12M60 40l-10-12" />
          <path d="M-40 20l14 8 8 14M70 6l18-4" />
        </g>
        <ellipse cx="0" cy="-12" rx="78" ry="22" fill="var(--stone-dark)" />
        <ellipse cx="0" cy="-16" rx="70" ry="18" fill="var(--hub-water)" />
        <path d="M-12-16v-48l6-6 4 8 6-10 4 6v50Z" fill="var(--stone)" />
        <TallGrass x={-40} y={-14} seed={12} height={22} blades={10} />
        <TallGrass x={34} y={-12} seed={5} height={18} blades={8} />
        <Flowers x={-150} y={10} hue={1} scale={1.2} />
        <Flowers x={150} y={6} hue={0} scale={1.2} />
      </g>
    </Layer>
  );
}

export function HubForeground() {
  // Tall grass along the bottom edge, with flowers standing out of it
  // Short in the middle, where the plaza is, and tall toward the edges
  const clumps = Array.from({ length: 26 }, (_, i) => {
    const x = -40 + i * 66 + rand(i) * 30;
    const side = Math.abs(x - 800) / 800;
    return { x, height: 22 + rand(i * 3) * 26 + side * side * 120, seed: i + 1 };
  });
  const blossoms = Array.from({ length: 22 }, (_, i) => ({
    x: 20 + i * 74 + rand(i * 5) * 40,
    y: 860 - rand(i * 7) * 60,
    r: 6 + rand(i * 11) * 5,
    color: ["var(--petal-pink)", "var(--petal-yellow)", "var(--petal-white)"][i % 3],
  }));
  return (
    <Layer className="hub-fg">
      <g fill="var(--leaf-deep)">
        <path d="M-60 900V760q60-60 140-40 70-60 120 20 40 30 30 120Z" />
        <path d="M1660 900V740q-70-70-150-30-60-50-110 30-50 40-30 160Z" />
      </g>
      {clumps.map((clump) => (
        <TallGrass
          key={clump.seed}
          x={clump.x}
          y={912}
          seed={clump.seed}
          height={clump.height}
          blades={18}
          scale={1.6}
        />
      ))}
      {blossoms.map((b, i) => (
        <g key={i}>
          <path d={`M${b.x} 910Q${b.x - 4} ${(b.y + 910) / 2} ${b.x} ${b.y}`} stroke="var(--blade-dark)" strokeWidth="2" fill="none" />
          <Blossom x={b.x} y={b.y} r={b.r} color={b.color} turn={i * 23} />
        </g>
      ))}
      {/* Dandelion clocks */}
      {[380, 1240].map((x) => (
        <g key={x}>
          <path d={`M${x} 910V780`} stroke="var(--blade)" strokeWidth="2" />
          <circle cx={x} cy="776" r="14" fill="var(--petal-white)" opacity="0.75" />
          <circle cx={x} cy="776" r="3" fill="var(--petal-center)" />
        </g>
      ))}
    </Layer>
  );
}
