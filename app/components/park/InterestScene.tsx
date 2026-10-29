import type { Interest } from "../../data/portfolio";
import { Basketball } from "./scenes";

// The small illustrated spot for each interest: a court, a net, a stone
// chess table and a picnic table with a poker hand. Each one has a single
// `play-*` motion that runs once when it scrolls into view (globals.css).

function Patch() {
  return <ellipse cx="160" cy="212" rx="150" ry="9" fill="var(--grass-back)" />;
}

function BasketballCourt() {
  return (
    <>
      <Patch />
      <path d="M58 150h234l16 64H18Z" fill="var(--court)" />
      <g fill="none" stroke="var(--court-line)" strokeWidth="2">
        <path d="M60 154h230l14 56H22Z" />
        <path d="M242 154l-4 30h58l-3-30M238 184q29 18 58 0" />
      </g>
      <rect x="272" y="58" width="7" height="96" rx="2" fill="var(--metal)" />
      <rect x="250" y="62" width="26" height="5" rx="2" fill="var(--metal)" />
      <rect x="226" y="38" width="54" height="38" rx="3" fill="var(--backboard)" stroke="var(--metal)" strokeWidth="2" />
      <rect x="244" y="54" width="18" height="13" fill="none" stroke="var(--ball)" strokeWidth="1.5" />
      <g fill="none" stroke="var(--backboard)" strokeWidth="1.2" opacity="0.85">
        <path d="M241 82l4 18h16l4-18M247 82l3 18M259 82l-3 18M243 91h20" />
      </g>
      <ellipse cx="253" cy="82" rx="12" ry="3.5" fill="none" stroke="var(--ball)" strokeWidth="2.5" />
      <ellipse cx="112" cy="199" rx="12" ry="3" fill="var(--shadow)" />
      <Basketball x={112} y={186} r={12} className="play-bounce" />
    </>
  );
}

function BadmintonNet() {
  const strands = Array.from({ length: 21 }, (_, i) => 79 + i * 8);
  return (
    <>
      <Patch />
      <path d="M40 210l36-44h168l36 44Z" fill="var(--grass)" />
      <path d="M44 208l34-40h164l34 40ZM160 168v40" fill="none" stroke="var(--court-line)" strokeWidth="1.5" />
      <rect x="66" y="104" width="5" height="100" rx="2" fill="var(--metal)" />
      <rect x="249" y="104" width="5" height="100" rx="2" fill="var(--metal)" />
      <g stroke="var(--metal)" strokeWidth="0.8" opacity="0.45">
        {strands.map((x) => (
          <path key={x} d={`M${x} 110v32`} />
        ))}
        <path d="M71 118h178M71 126h178M71 134h178M71 142h178" />
      </g>
      <rect x="71" y="106" width="178" height="5" rx="1" fill="var(--backboard)" />

      {/* Racket leaning on the left post */}
      <g transform="rotate(-14 86 200)" fill="none" stroke="var(--metal)">
        <path d="M86 204v-34" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="86" cy="156" rx="10" ry="14" strokeWidth="2.5" />
        <path d="M80 146v20M86 143v26M92 146v20M77 152h18M76 158h20M77 164h18" strokeWidth="0.6" opacity="0.6" />
      </g>

      <g transform="translate(196 66)">
        <g className="play-shuttle">
          <g transform="rotate(20)">
            <path d="M-2-4l-15-6v20l15-6Z" fill="var(--backboard)" stroke="var(--metal)" strokeWidth="0.8" />
            <path d="M-17-10v20" stroke="var(--metal)" strokeWidth="1" opacity="0.5" />
            <circle r="4.5" fill="var(--warm)" />
          </g>
        </g>
      </g>
    </>
  );
}

// Where a square of the chess board lands on screen: the board is a square
// turned 45° and squashed, so it looks like it is lying on the table.
const SQUARE = 11;
const square = (file: number, rank: number) => {
  const u = -4 * SQUARE + SQUARE * (file + 0.5);
  const v = -4 * SQUARE + SQUARE * (rank + 0.5);
  return { x: 160 + (u - v) * Math.SQRT1_2, y: 134 + (u + v) * Math.SQRT1_2 * 0.34 };
};

const piecePaths = {
  pawn: "M-4.5 0h9l-2-3h-1.2l1-5.5a3.4 3.4 0 1 0-4.6 0l1 5.5H-2.5Z",
  rook: "M-5 0h10l-1.5-3h-1l-.5-8h1.5v-3.5h-1.6v1.6h-1.4v-1.6h-1.6v1.6h-1.4v-1.6H-4.5v3.5H-3l-.5 8h-1Z",
  king: "M-5 0h10l-1.5-3h-1l1-9a3.6 3.6 0 0 0-1.8-2.6V-16h1.6v-1.6h-1.6v-1.6h-1.4v1.6h-1.6v1.6h1.6v1.4a3.6 3.6 0 0 0-1.8 2.6l1 9h-1Z",
};

type Piece = { kind: keyof typeof piecePaths; file: number; rank: number; dark: boolean };

const pieces: Piece[] = [
  { kind: "king", file: 1, rank: 1, dark: true },
  { kind: "rook", file: 4, rank: 0, dark: true },
  { kind: "pawn", file: 2, rank: 2, dark: true },
  { kind: "pawn", file: 5, rank: 1, dark: true },
  { kind: "king", file: 6, rank: 6, dark: false },
  { kind: "rook", file: 7, rank: 4, dark: false },
  { kind: "pawn", file: 5, rank: 5, dark: false },
];
// The pawn that makes its opening two-square move
const mover = { from: square(3, 6), to: square(3, 4) };

function Pieces() {
  // Drawn back to front so nearer pieces overlap farther ones
  const placed = pieces
    .map((piece) => ({ ...piece, ...square(piece.file, piece.rank) }))
    .sort((a, b) => a.y - b.y);
  return placed.map((piece) => (
    <path
      key={`${piece.file}-${piece.rank}`}
      transform={`translate(${piece.x} ${piece.y + 2})`}
      d={piecePaths[piece.kind]}
      fill={piece.dark ? "var(--piece-dark)" : "var(--piece-light)"}
      stroke="var(--metal)"
      strokeWidth="0.6"
    />
  ));
}

function ChessTable() {
  const squares = Array.from({ length: 64 }, (_, i) => ({ file: i % 8, rank: Math.floor(i / 8) }));
  return (
    <>
      <Patch />
      {[62, 258].map((x) => (
        <g key={x}>
          <path d={`M${x - 18} 172v32q18 6 36 0v-32Z`} fill="var(--stone-dark)" />
          <ellipse cx={x} cy="172" rx="18" ry="5.5" fill="var(--stone)" />
        </g>
      ))}
      <ellipse cx="160" cy="206" rx="30" ry="6" fill="var(--stone-dark)" />
      <rect x="148" y="140" width="24" height="66" fill="var(--stone-dark)" />
      <ellipse cx="160" cy="142" rx="100" ry="26" fill="var(--stone-dark)" />
      <ellipse cx="160" cy="136" rx="100" ry="26" fill="var(--stone)" />

      <g transform="translate(160 134) scale(1 0.34) rotate(45)">
        {squares.map(({ file, rank }) => (
          <rect
            key={`${file}-${rank}`}
            x={-4 * SQUARE + file * SQUARE}
            y={-4 * SQUARE + rank * SQUARE}
            width={SQUARE}
            height={SQUARE}
            fill={(file + rank) % 2 ? "var(--square-dark)" : "var(--square-light)"}
          />
        ))}
      </g>

      <Pieces />
      <g transform={`translate(${mover.to.x} ${mover.to.y + 2})`}>
        <path
          className="play-slide"
          style={
            {
              "--from-x": `${mover.from.x - mover.to.x}px`,
              "--from-y": `${mover.from.y - mover.to.y}px`,
            } as React.CSSProperties
          }
          d={piecePaths.pawn}
          fill="var(--piece-light)"
          stroke="var(--metal)"
          strokeWidth="0.6"
        />
      </g>
    </>
  );
}

function PlayingCard({ angle, rank, suit }: { angle: number; rank: string; suit: "heart" | "spade" }) {
  const red = suit === "heart";
  return (
    <g className="play-fan" style={{ "--angle": `${angle}deg` } as React.CSSProperties}>
      <rect x="-13" y="-40" width="26" height="38" rx="3" fill="var(--card-face)" stroke="var(--metal)" strokeWidth="0.8" />
      <text
        x="-9"
        y="-29"
        fontSize="9"
        fontWeight="700"
        fontFamily="Georgia, serif"
        fill={red ? "var(--suit-red)" : "var(--piece-dark)"}
      >
        {rank}
      </text>
      <path
        transform="translate(0 -17)"
        d={
          red
            ? "M0 5C-6 0-6-5-3-5c1.6 0 3 1.4 3 2.4C0-3.6 1.4-5 3-5c3 0 3 5-3 10Z"
            : "M0-6C-6-1-6 3-3 3c1.2 0 2.2-.8 2.6-1.6L-1.6 5h3.2L.4 1.4C.8 2.2 1.8 3 3 3c3 0 3-4-3-9Z"
        }
        fill={red ? "var(--suit-red)" : "var(--piece-dark)"}
      />
    </g>
  );
}

function ChipStack({ x, y, colors }: { x: number; y: number; colors: string[] }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {colors.map((color, i) => (
        <g key={i} transform={`translate(0 ${-i * 3.2})`}>
          <ellipse cx="0" cy="1.4" rx="9" ry="3.2" fill="#000" opacity="0.18" />
          <ellipse cx="0" cy="0" rx="9" ry="3.2" fill={color} />
        </g>
      ))}
    </g>
  );
}

function PokerTable() {
  return (
    <>
      <Patch />
      <g stroke="var(--wood)" strokeWidth="6" strokeLinecap="round">
        <path d="M76 154l-14 52M76 154l14 52M244 154l-14 52M244 154l14 52" />
      </g>
      <path d="M50 126h220l18 20H32Z" fill="var(--wood-light)" />
      <rect x="32" y="146" width="256" height="8" rx="2" fill="var(--wood)" />
      <rect x="22" y="180" width="276" height="8" rx="3" fill="var(--wood-light)" />
      <path d="M40 188v18M280 188v18" stroke="var(--wood)" strokeWidth="5" strokeLinecap="round" />

      <ChipStack x={214} y={138} colors={["var(--chip-red)", "var(--chip-red)", "var(--card-face)", "var(--chip-red)"]} />
      <ChipStack x={236} y={134} colors={["var(--chip-blue)", "var(--chip-blue)", "var(--chip-blue)"]} />
      <ChipStack x={100} y={136} colors={["var(--card-face)", "var(--chip-blue)"]} />

      <g transform="translate(156 140)">
        <PlayingCard angle={-11} rank="A" suit="spade" />
        <PlayingCard angle={11} rank="K" suit="heart" />
      </g>
    </>
  );
}

const scenes = {
  basketball: BasketballCourt,
  badminton: BadmintonNet,
  chess: ChessTable,
  poker: PokerTable,
};

export default function InterestScene({ scene }: { scene: Interest["scene"] }) {
  const Drawing = scenes[scene];
  return (
    <svg viewBox="0 0 320 220" className="block h-auto w-full" aria-hidden="true" focusable="false">
      <Drawing />
    </svg>
  );
}
