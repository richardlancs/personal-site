// Building blocks for the park's illustrations, drawn in a soft storybook
// style: rounded shapes in three tones (shadow, base, highlight) with the
// light coming from the top left. Colors are CSS variables from globals.css,
// so everything switches to its night version with the theme.
//
// Each piece is drawn standing on (0, 0), so `x`/`y` is where it meets the
// ground.

type Placement = { x: number; y: number; scale?: number; flip?: boolean };

const place = ({ x, y, scale = 1, flip = false }: Placement) =>
  `translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`;

export function Tree(props: Placement) {
  return (
    <g transform={place(props)}>
      <ellipse cx="4" cy="0" rx="50" ry="7" fill="var(--shadow)" />
      <path
        d="M-8 0C-5-26-6-50-14-72l8-3c3 14 6 14 10 0l8 2C5-46 6-24 9 0Z"
        fill="var(--trunk)"
      />
      <g fill="var(--leaf-dark)">
        <circle cx="0" cy="-112" r="46" />
        <circle cx="-42" cy="-86" r="32" />
        <circle cx="42" cy="-88" r="34" />
        <circle cx="-18" cy="-148" r="32" />
        <circle cx="24" cy="-142" r="30" />
      </g>
      <g fill="var(--leaf)">
        <circle cx="-6" cy="-118" r="38" />
        <circle cx="-42" cy="-92" r="24" />
        <circle cx="30" cy="-100" r="26" />
        <circle cx="-20" cy="-152" r="25" />
        <circle cx="16" cy="-148" r="22" />
      </g>
      <g fill="var(--leaf-light)">
        <circle cx="-24" cy="-138" r="14" />
        <circle cx="-46" cy="-100" r="10" />
        <circle cx="0" cy="-160" r="10" />
        <circle cx="-6" cy="-112" r="8" />
      </g>
    </g>
  );
}

export function Bush(props: Placement) {
  return (
    <g transform={place(props)}>
      <g fill="var(--leaf-dark)">
        <circle cx="-22" cy="-12" r="17" />
        <circle cx="0" cy="-20" r="22" />
        <circle cx="22" cy="-12" r="17" />
      </g>
      <g fill="var(--leaf)">
        <circle cx="-24" cy="-16" r="11" />
        <circle cx="-4" cy="-26" r="15" />
        <circle cx="16" cy="-18" r="11" />
      </g>
      <circle cx="-9" cy="-32" r="6" fill="var(--leaf-light)" />
    </g>
  );
}

// A cluster of small flowers; `hue` picks one of the soft petal colors.
export function Flowers({ hue = 0, ...props }: Placement & { hue?: 0 | 1 | 2 }) {
  const petal = ["var(--petal-pink)", "var(--petal-yellow)", "var(--petal-white)"][hue];
  return (
    <g transform={place(props)}>
      <g stroke="var(--leaf-dark)" strokeWidth="1.5" strokeLinecap="round">
        <path d="M-10 0v-10M0 0v-15M10 0v-9" />
      </g>
      <g fill={petal}>
        <circle cx="-10" cy="-12" r="4" />
        <circle cx="0" cy="-17" r="4.5" />
        <circle cx="10" cy="-11" r="4" />
      </g>
      <g fill="var(--petal-center)">
        <circle cx="-10" cy="-12" r="1.4" />
        <circle cx="0" cy="-17" r="1.6" />
        <circle cx="10" cy="-11" r="1.4" />
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
// sections join into one continuous path.
export function Ground() {
  return (
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
  );
}
