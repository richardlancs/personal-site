// The Experience section's order and grouping
// (components/city2d/sections/Experience.tsx), pure so the tests can run
// them on the real data. Dates are read with machineDate ("Oct 2026" is
// "2026-10", "2024" is "2024", "Present" is nothing).
import type { Experience } from "../data/portfolio";
import { machineDate } from "./machineDate";

// Still running: only an end that says "Present". An entry with no end at
// all is a single date, not a running one.
export function isCurrent(entry: Experience): boolean {
  return entry.endDate === "Present";
}

// A start as [year, month or undefined], or undefined when the data's
// start is not a date machineDate can read
function start(entry: Experience): [number, number | undefined] | undefined {
  const value = machineDate(entry.startDate);
  if (!value) return undefined;
  const [year, month] = value.split("-");
  return [Number(year), month ? Number(month) : undefined];
}

// Newest start first, in a new array. A year alone counts as the start of
// that year; when two entries start in the same year and only one of them
// names its month, the one still running goes first. Equal starts keep
// their order in the data (Array.prototype.sort is stable). A start that
// isn't a date goes last.
export function sortNewestFirst(entries: readonly Experience[]): Experience[] {
  return [...entries].sort((a, b) => {
    const sa = start(a);
    const sb = start(b);
    if (!sa || !sb) return sa ? -1 : sb ? 1 : 0;
    if (sa[0] !== sb[0]) return sb[0] - sa[0];
    const mixed = (sa[1] === undefined) !== (sb[1] === undefined);
    if (mixed && isCurrent(a) !== isCurrent(b)) return isCurrent(a) ? -1 : 1;
    return (sb[1] ?? 1) - (sa[1] ?? 1);
  });
}

// Work and education apart; an entry without a kind is work
export function groupByKind(entries: readonly Experience[]): { work: Experience[]; education: Experience[] } {
  const work: Experience[] = [];
  const education: Experience[] = [];
  for (const entry of entries) ((entry.kind ?? "work") === "education" ? education : work).push(entry);
  return { work, education };
}
