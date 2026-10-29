// The sky behind the whole site, fixed to the screen. As the visitor walks
// through the park (--p, set by ParkWalk) the morning sky fades through day
// and golden hour into dusk, and the sun arcs across from left to right. In
// the dark theme it is night instead, with the moon on the same path.
// The clouds and far hills drift a little while walking sideways, for depth.
// All of the styling lives in globals.css under "Sky".

function Cloud({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="0" cy="0" rx="64" ry="15" />
      <circle cx="-30" cy="-10" r="20" />
      <circle cx="2" cy="-22" r="28" />
      <circle cx="34" cy="-8" r="18" />
    </g>
  );
}

// Round treetops along a hill's crest
function Treeline({ points }: { points: [number, number, number][] }) {
  return (
    <>
      {points.map(([x, y, r]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
      ))}
    </>
  );
}

export default function Sky() {
  return (
    <div className="sky" aria-hidden="true">
      <div className="sky-layer sky-dawn" />
      <div className="sky-layer sky-day" />
      <div className="sky-layer sky-golden" />
      <div className="sky-layer sky-dusk" />
      <div className="sky-layer sky-night" />
      <div className="sky-layer sky-stars" />
      <div className="sky-sun" />
      <div className="sky-moon" />

      <svg className="sky-clouds" viewBox="0 0 1700 220" preserveAspectRatio="xMinYMin slice">
        <g fill="var(--cloud)">
          <Cloud x={160} y={110} />
          <Cloud x={520} y={60} scale={0.7} />
          <Cloud x={860} y={140} scale={1.2} />
          <Cloud x={1240} y={80} scale={0.85} />
          <Cloud x={1560} y={150} />
        </g>
      </svg>

      <svg className="sky-hills sky-hills-far" viewBox="0 0 1500 300" preserveAspectRatio="xMidYMax slice">
        <path
          d="M0 150Q140 96 300 126T620 112T940 132T1240 98T1500 124V300H0Z"
          fill="var(--hill-far)"
        />
      </svg>
      <svg className="sky-hills sky-hills-mid" viewBox="0 0 1500 300" preserveAspectRatio="xMidYMax slice">
        <g fill="var(--hill-tree)">
          <Treeline
            points={[
              [120, 188, 22], [150, 180, 26], [182, 190, 20],
              [520, 196, 18], [548, 186, 24],
              [880, 178, 24], [912, 170, 30], [946, 182, 22],
              [1290, 194, 20], [1318, 186, 25], [1348, 196, 18],
            ]}
          />
        </g>
        <path
          d="M0 214Q180 172 380 198T760 190T1120 202T1500 184V300H0Z"
          fill="var(--hill-mid)"
        />
      </svg>

      {/* Shared paint for the scenes: one definition, referenced everywhere */}
      <svg width="0" height="0" focusable="false">
        <defs>
          <radialGradient id="lamp-glow">
            <stop offset="0" stopColor="var(--lamp-light)" stopOpacity="0.55" />
            <stop offset="1" stopColor="var(--lamp-light)" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}
