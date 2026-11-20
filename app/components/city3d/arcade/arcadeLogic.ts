// The arcade machine's rules (arcadeMachine.ts draws them): where a
// knight can hop, what a poker hand is called, which shots go in. Plain
// functions, no drawing, so tests/arcade.test.mjs can check them.

import type { Interest } from "../../../data/portfolio";

// Each mode's colour on the screen, and the one thing to do in it: the
// page's play button says the label, the screen the hint
export const HUES: Record<Interest["scene"], number> = { basketball: 22, badminton: 150, chess: 205, poker: 340 };
export const ACTIONS: Record<Interest["scene"], { label: string; hint: string }> = {
  basketball: { label: "Shoot", hint: "Click the ball to shoot" },
  badminton: { label: "Smash", hint: "Click the shuttle to smash it" },
  chess: { label: "Move the knight", hint: "Click a lit square to hop there" },
  poker: { label: "Deal", hint: "Click the deck to deal a hand" },
};

// A small seeded generator, so a deal or a shot is the same every time
// for the same count
export function seeded(seed: number) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

// The knight on a small board (`size` squares a side): the squares it can
// hop to from [col, row]
export const BOARD = 5;
export function knightMoves([c, r]: [number, number], size = BOARD): [number, number][] {
  const hops = [
    [1, 2],
    [2, 1],
    [2, -1],
    [1, -2],
    [-1, -2],
    [-2, -1],
    [-2, 1],
    [-1, 2],
  ];
  return hops.map(([dc, dr]) => [c + dc, r + dr] as [number, number]).filter(([x, y]) => x >= 0 && y >= 0 && x < size && y < size);
}

// The knight's next square when it isn't pointed where to go (the action
// button, the keyboard): the first it hasn't been to yet, by Warnsdorff's
// rule (fewest onward hops), so a run of presses tours the board
export function nextKnightSquare(at: [number, number], visited: Set<string>, size = BOARD): [number, number] {
  const moves = knightMoves(at, size);
  const fresh = moves.filter(([c, r]) => !visited.has(`${c},${r}`));
  const pool = fresh.length ? fresh : moves;
  const onward = (sq: [number, number]) => knightMoves(sq, size).filter(([c, r]) => !visited.has(`${c},${r}`)).length;
  return pool.reduce((best, sq) => (onward(sq) < onward(best) ? sq : best));
}

// Cards: rank 2..14 (14 the ace), suit 0..3 (spades, hearts, diamonds, clubs)
export type Card = { rank: number; suit: number };
export const RANKS: Record<number, string> = { 11: "J", 12: "Q", 13: "K", 14: "A" };
export const rankLabel = (rank: number) => RANKS[rank] ?? String(rank);

// Five different cards from a shuffled deck, the same five for the same deal
export function deal(count: number): Card[] {
  const r = seeded(count + 7);
  const deck: Card[] = [];
  for (let suit = 0; suit < 4; suit++) for (let rank = 2; rank <= 14; rank++) deck.push({ rank, suit });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, 5);
}

// What a five-card hand is called
export function handName(cards: Card[]): string {
  const counts = new Map<number, number>();
  for (const c of cards) counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1);
  const groups = [...counts.values()].sort((a, b) => b - a);
  const flush = cards.every((c) => c.suit === cards[0].suit);
  const ranks = [...counts.keys()].sort((a, b) => a - b);
  const wheel = ranks.join() === "2,3,4,5,14";
  const straight = counts.size === 5 && (ranks[4] - ranks[0] === 4 || wheel);
  if (straight && flush) return ranks[0] === 10 ? "Royal flush" : "Straight flush";
  if (groups[0] === 4) return "Four of a kind";
  if (groups[0] === 3 && groups[1] === 2) return "Full house";
  if (flush) return "Flush";
  if (straight) return "Straight";
  if (groups[0] === 3) return "Three of a kind";
  if (groups[0] === 2 && groups[1] === 2) return "Two pair";
  if (groups[0] === 2) return "One pair";
  return "High card";
}

// Whether the nth shot goes in: most do, about one in three rattles out
export const shotGoesIn = (n: number) => seeded(n + 101)() > 0.34;
