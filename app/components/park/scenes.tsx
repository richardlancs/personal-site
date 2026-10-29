import { Bench, Bush, Flowers, Lamp, TallGrass, Tree } from "./scenery";

// The illustration that stands on the ground beside each section's content.
// Every scene shares one 600 × 360 canvas whose bottom edge is the ground.
// Elements with a `play-*` class run a small one-off animation the first
// time the scene scrolls into view (globals.css, "Scene motion").

function Scene({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 600 360" preserveAspectRatio="xMidYMax meet" focusable="false">
      {children}
    </svg>
  );
}

export function Basketball({
  x,
  y,
  r = 10,
  className,
}: {
  x: number;
  y: number;
  r?: number;
  className?: string;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={className}>
        <circle r={r} fill="var(--ball)" />
        <g fill="none" stroke="var(--ball-seam)" strokeWidth={r * 0.12}>
          <path d={`M${-r} 0H${r}M0 ${-r}V${r}`} />
          <path
            d={`M${-r * 0.7} ${-r * 0.7}Q${-r * 0.15} 0 ${-r * 0.7} ${r * 0.7}M${r * 0.7} ${-r * 0.7}Q${r * 0.15} 0 ${r * 0.7} ${r * 0.7}`}
          />
        </g>
        <circle cx={-r * 0.35} cy={-r * 0.4} r={r * 0.3} fill="#fff" opacity="0.18" />
      </g>
    </g>
  );
}

function Pillar({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 356)`}>
      <ellipse cx="6" cy="0" rx="32" ry="5" fill="var(--shadow)" />
      <rect x="-20" y="-176" width="40" height="176" rx="3" fill="var(--stone)" />
      <rect x="8" y="-176" width="12" height="176" fill="var(--stone-dark)" opacity="0.5" />
      <path d="M-20-130h40M-20-84h40M-20-38h40" stroke="var(--stone-dark)" strokeWidth="2" />
      <rect x="-26" y="-188" width="52" height="14" rx="4" fill="var(--stone-dark)" />
      <circle cx="0" cy="-198" r="11" fill="var(--stone)" />
      {/* Ivy climbing the left face */}
      <g fill="var(--leaf)">
        <circle cx="-19" cy="-150" r="7" />
        <circle cx="-22" cy="-134" r="6" />
        <circle cx="-17" cy="-118" r="7" />
        <circle cx="-21" cy="-98" r="5" />
        <circle cx="-14" cy="-160" r="5" />
      </g>
    </g>
  );
}

// About: a bench under an old oak
export function OakScene() {
  return (
    <Scene>
      <Bush x={80} y={358} scale={1.1} />
      <Tree x={390} y={354} scale={1.55} />
      <Bench x={310} y={356} />
      <Lamp x={540} y={356} />
      <Flowers x={150} y={358} hue={1} />
      <Flowers x={196} y={360} />
      <Flowers x={470} y={360} hue={2} />
      <TallGrass x={120} y={360} seed={2} height={40} />
      <TallGrass x={250} y={362} seed={5} height={30} />
      <TallGrass x={500} y={362} seed={9} height={44} />
    </Scene>
  );
}

// Projects: a small grove past the notice board
export function GroveScene() {
  return (
    <Scene>
      <Lamp x={90} y={356} />
      <Tree x={210} y={354} scale={1.2} />
      <Tree x={420} y={356} scale={1.4} flip />
      <Bush x={310} y={358} />
      <Bush x={540} y={358} scale={0.9} />
      <Flowers x={160} y={360} hue={2} />
      <Flowers x={500} y={360} />
      <TallGrass x={130} y={362} seed={3} height={42} />
      <TallGrass x={360} y={362} seed={7} height={34} />
      <TallGrass x={570} y={362} seed={1} height={46} />
    </Scene>
  );
}

// Experience: a signpost where the trail forks
export function TrailScene() {
  return (
    <Scene>
      <Tree x={90} y={354} scale={1.1} />
      <Tree x={520} y={354} scale={1.25} flip />
      <Bush x={430} y={358} />
      <g fill="var(--stone)">
        <ellipse cx="180" cy="352" rx="16" ry="4" />
        <ellipse cx="226" cy="347" rx="12" ry="3" />
        <ellipse cx="384" cy="350" rx="14" ry="3.5" />
      </g>

      <ellipse cx="304" cy="356" rx="22" ry="4" fill="var(--shadow)" />
      <rect x="294" y="178" width="12" height="178" rx="3" fill="var(--wood)" />
      <rect x="290" y="172" width="20" height="9" rx="3" fill="var(--wood)" />
      <g className="play-swing" fill="var(--wood-light)">
        <path d="M306 196h86l16 14-16 14h-86Z" />
      </g>
      <path d="M294 236h-86l-16 14 16 14h86Z" fill="var(--wood-light)" />
      <path d="M306 276h60l12 11-12 11h-60Z" fill="var(--wood-light)" />
      <g stroke="var(--wood)" strokeWidth="3" strokeLinecap="round" opacity="0.6">
        <path d="M320 210h56M224 250h56M318 287h36" />
      </g>
      <Flowers x={150} y={360} hue={1} />
      <Flowers x={350} y={360} hue={2} />
      <TallGrass x={260} y={362} seed={4} height={36} />
      <TallGrass x={330} y={362} seed={8} height={30} />
      <TallGrass x={470} y={362} seed={6} height={44} />
    </Scene>
  );
}

// Skills: a fenced garden with raised beds
export function GardenScene() {
  const pickets = Array.from({ length: 17 }, (_, i) => 130 + i * 20);
  return (
    <Scene>
      <g fill="var(--fence)">
        <rect x="128" y="300" width="340" height="6" rx="2" />
        <rect x="128" y="326" width="340" height="6" rx="2" />
        {pickets.map((x) => (
          <path key={x} d={`M${x} 354v-62l6-8 6 8v62Z`} />
        ))}
      </g>
      <Bush x={556} y={358} />

      {[150, 300].map((x) => (
        <g key={x}>
          <rect x={x} y="330" width="124" height="28" rx="4" fill="var(--wood)" />
          <rect x={x + 4} y="326" width="116" height="8" rx="3" fill="var(--soil)" />
          <Flowers x={x + 22} y={328} />
          <Flowers x={x + 62} y={328} hue={1} />
          <Flowers x={x + 102} y={328} hue={2} />
        </g>
      ))}

      {/* Sunflower */}
      <path d="M488 358V232" stroke="var(--leaf-dark)" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="474" cy="292" rx="14" ry="6" transform="rotate(-30 474 292)" fill="var(--leaf)" />
      <ellipse cx="502" cy="270" rx="14" ry="6" transform="rotate(30 502 270)" fill="var(--leaf)" />
      <g className="play-nod">
        <g fill="var(--sunflower)">
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i * Math.PI) / 6;
            return (
              <ellipse
                key={i}
                cx={488 + Math.cos(a) * 20}
                cy={226 + Math.sin(a) * 20}
                rx="9"
                ry="6"
                transform={`rotate(${i * 30} ${488 + Math.cos(a) * 20} ${226 + Math.sin(a) * 20})`}
              />
            );
          })}
        </g>
        <circle cx="488" cy="226" r="14" fill="var(--sunflower-center)" />
      </g>

      {/* Watering can */}
      <g transform="translate(90 356)">
        <ellipse cx="2" cy="0" rx="26" ry="4" fill="var(--shadow)" />
        <path d="M-18 0v-32q0-6 6-6h24q6 0 6 6V0Z" fill="var(--can)" />
        <path d="M18-26l22-18" stroke="var(--can)" strokeWidth="5" strokeLinecap="round" />
        <path d="M-18-30q-14 4-10 16" stroke="var(--can)" strokeWidth="4" fill="none" />
        <rect x="-12" y="-38" width="20" height="4" rx="2" fill="var(--metal)" opacity="0.4" />
      </g>
      <TallGrass x={60} y={362} seed={10} height={40} />
      <TallGrass x={290} y={362} seed={11} height={28} />
      <TallGrass x={440} y={362} seed={13} height={30} />
    </Scene>
  );
}

// Contact: the far gate at dusk, with the lamps coming on
export function EveningScene() {
  const fireflies = [
    [170, 238], [262, 196], [398, 226], [512, 184], [300, 272], [446, 282],
  ];
  return (
    <Scene>
      <Bush x={120} y={358} />
      <Tree x={470} y={354} scale={1.3} flip />
      <Pillar x={580} />
      <Lamp x={220} y={356} scale={1.2} />

      {/* Mailbox */}
      <g transform="translate(340 356)">
        <ellipse cx="4" cy="0" rx="22" ry="4" fill="var(--shadow)" />
        <rect x="-4" y="-62" width="8" height="62" rx="2" fill="var(--wood)" />
        <path d="M-26-60h52v-24a26 18 0 0 0-52 0Z" fill="var(--mailbox)" />
        <path d="M-26-60h14v-24a26 18 0 0 1 10-14" fill="#000" opacity="0.12" />
        <rect x="26" y="-100" width="4" height="26" rx="1" fill="var(--metal)" />
        <rect className="play-flag" x="30" y="-100" width="15" height="10" rx="1.5" fill="var(--warm)" />
      </g>

      <Flowers x={280} y={360} hue={2} />
      <Flowers x={400} y={360} />
      <g fill="var(--firefly)">
        {fireflies.map(([x, y], i) => (
          <circle
            key={x}
            className="play-glow firefly"
            cx={x}
            cy={y}
            r="3"
            style={{ "--delay": `${300 + i * 140}ms` } as React.CSSProperties}
          />
        ))}
      </g>
      <TallGrass x={160} y={362} seed={14} height={42} />
      <TallGrass x={300} y={362} seed={15} height={32} />
      <TallGrass x={540} y={362} seed={16} height={46} />
    </Scene>
  );
}
