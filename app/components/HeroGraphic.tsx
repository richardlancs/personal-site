// A quiet, abstract editor window shown beside the hero on large screens.
// The "code" is just rounded bars, so it reads as an illustration rather
// than real content. Every color comes from the theme tokens, so it
// follows light and dark mode automatically.

type Segment = { width: number; tone: "accent" | "muted" | "faint" };

// Each line: how far it's indented, then the bars that make it up.
const lines: { indent: number; segments: Segment[] }[] = [
  {
    indent: 0,
    segments: [
      { width: 46, tone: "accent" },
      { width: 92, tone: "muted" },
    ],
  },
  {
    indent: 0,
    segments: [
      { width: 64, tone: "accent" },
      { width: 120, tone: "faint" },
    ],
  },
  {
    indent: 1,
    segments: [
      { width: 38, tone: "muted" },
      { width: 76, tone: "faint" },
    ],
  },
  {
    indent: 1,
    segments: [
      { width: 54, tone: "accent" },
      { width: 132, tone: "muted" },
    ],
  },
  { indent: 2, segments: [{ width: 104, tone: "faint" }] },
  {
    indent: 2,
    segments: [
      { width: 42, tone: "muted" },
      { width: 68, tone: "accent" },
    ],
  },
  { indent: 1, segments: [{ width: 22, tone: "muted" }] },
  { indent: 0, segments: [{ width: 22, tone: "muted" }] },
  { indent: 0, segments: [] },
  {
    indent: 0,
    segments: [
      { width: 58, tone: "accent" },
      { width: 148, tone: "faint" },
    ],
  },
];

const tones = {
  accent: "fill-accent/55",
  muted: "fill-foreground/20",
  faint: "fill-foreground/10",
};

const LINE_START = 80;
const LINE_GAP = 22;
const CODE_X = 52;
const INDENT = 22;
const BAR_GAP = 8;

export default function HeroGraphic() {
  return (
    <svg
      viewBox="0 0 440 320"
      className="h-auto w-full max-w-md"
      aria-hidden="true"
      focusable="false"
    >
      {/* Soft blue-gray plate behind the window for gentle depth */}
      <rect
        x="28"
        y="28"
        width="412"
        height="292"
        rx="22"
        className="fill-tint"
      />

      {/* Window */}
      <rect
        x="0.5"
        y="0.5"
        width="411"
        height="291"
        rx="18"
        className="fill-background stroke-border"
      />
      <line x1="0" y1="44" x2="412" y2="44" className="stroke-border" />
      {[24, 42, 60].map((cx) => (
        <circle key={cx} cx={cx} cy="22" r="5" className="fill-foreground/12" />
      ))}

      {/* Code lines with a faint line-number gutter */}
      {lines.map((line, row) => {
        const y = LINE_START + row * LINE_GAP;
        let x = CODE_X + line.indent * INDENT;
        return (
          <g key={row}>
            <rect
              x="20"
              y={y}
              width="14"
              height="7"
              rx="3.5"
              className="fill-foreground/8"
            />
            {line.segments.map((segment, i) => {
              const bar = (
                <rect
                  key={i}
                  x={x}
                  y={y}
                  width={segment.width}
                  height="7"
                  rx="3.5"
                  className={tones[segment.tone]}
                />
              );
              x += segment.width + BAR_GAP;
              return bar;
            })}
          </g>
        );
      })}

      {/* Resting text cursor on the last line */}
      <rect
        x={CODE_X + 58 + BAR_GAP + 148 + BAR_GAP}
        y={LINE_START + 9 * LINE_GAP - 3}
        width="2"
        height="13"
        rx="1"
        className="fill-accent"
      />
    </svg>
  );
}
