// Figures in content text, so they can be set in bold where content is
// shown (components/city2d/Figures.tsx). Pure, so it is tested on its own
// and on the real data (tests/city-figures.test.mjs).
//
// A figure is a number with what is attached to it: thousands separators
// and decimals (6,000, 0.885), a leading $ ($7,500), a trailing +, %, ×, k
// or M (300+, 40%, 3×, 5k), a ratio (54/60), a dimension (3×3) and a range
// (10–12). A number that is part of a name or a date is not a figure: one
// inside or straight after a word (YOLO11, CS135, GPT-4, v2.1, #20261, 3D,
// 1st), a year (1900 to 2099, standing alone), a day beside a month
// ("Oct 12"), and a plain number right after a capitalised word in the
// middle of a sentence (Next.js 16, Line 2, Python 3).

export type Piece = { text: string; figure: boolean };

const NUM = String.raw`\$?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?`;
// A number, then optionally a ratio, a dimension or a range to a second
// number, then optionally a sign of what it counts
const FIGURE = new RegExp(String.raw`(${NUM})(?:([/×x–-])(${NUM}))?([+%×]|[kM](?![A-Za-z]))?`, "g");

const MONTHS = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?$/;
const letter = (c: string | undefined) => c !== undefined && /[\p{L}\p{N}_]/u.test(c);

// The word before position i (and what comes before that word), and the
// word after position j
function wordBefore(text: string, i: number) {
  const m = /(\S+)(\s+)$/.exec(text.slice(0, i));
  if (!m) return { word: "", start: true };
  const before = text.slice(0, i - m[0].length).trimEnd();
  // That word opens a sentence (or a point, or follows a colon)
  const start = before === "" || /[.!?:;(—–-]$/.test(before);
  return { word: m[1], start };
}
const wordAfter = (text: string, j: number) => /^\s+(\S+)/.exec(text.slice(j))?.[1] ?? "";

function isFigure(text: string, match: RegExpExecArray): boolean {
  const [whole, first, joint, second, sign] = match;
  const i = match.index;
  const j = i + whole.length;
  const prev = text[i - 1];
  // Inside or straight after a word: YOLO11, v2.1, #20261, GPT-4, mAP50
  if (letter(prev) || prev === "#" || prev === "." || prev === "@" || prev === "/") return false;
  if (prev === "-" && letter(text[i - 2])) return false;
  // Straight before a word: 3D, 1st, 2nd (a hyphen is fine: "5-card")
  if (letter(text[j])) return false;
  // A dimension written with a letter x needs a number on both sides
  if (joint === "x" && !second) return false;
  const plain = !joint && !sign && !first.startsWith("$") && !first.includes(",") && !first.includes(".");
  // A year, standing alone
  if (plain && /^(19|20)\d\d$/.test(first)) return false;
  // A day beside a month
  if (plain && (MONTHS.test(wordBefore(text, i).word) || MONTHS.test(wordAfter(text, j).replace(/[,.;:]$/, "")))) return false;
  // A number after a capitalised word mid-sentence: a name or a version
  if (plain) {
    const { word, start } = wordBefore(text, i);
    if (!start && (/^[A-Z]/.test(word) || /\w\.\w/.test(word))) return false;
  }
  return true;
}

/** The text in pieces, each a figure or not; joined, they are the text again. */
export function splitFigures(text: string): Piece[] {
  const pieces: Piece[] = [];
  let at = 0;
  for (const match of text.matchAll(FIGURE)) {
    // A hyphen "range" that isn't one (a figure then a hyphenated word)
    // has already been ruled out: the second part must be a number
    if (!isFigure(text, match)) continue;
    const i = match.index;
    if (i > at) pieces.push({ text: text.slice(at, i), figure: false });
    pieces.push({ text: match[0], figure: true });
    at = i + match[0].length;
  }
  if (at < text.length) pieces.push({ text: text.slice(at), figure: false });
  return pieces;
}
