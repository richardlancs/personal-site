// A date as written in the data ("Oct. 2026", "May 2025", "2024") as a
// machine value for <time dateTime> ("2026-10", "2025-05", "2024"), or
// undefined for anything else ("Present", a season, free text), which is
// then shown without one rather than guessed at. Used by the Experience
// station's board (components/city2d/sections/Experience.tsx).

const months: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", sept: "09", oct: "10", nov: "11", dec: "12",
};

const fullNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

export function machineDate(value: string): string | undefined {
  const text = value.trim();
  if (/^\d{4}$/.test(text)) return text;
  const match = /^([A-Za-z]+)\.?\s+(\d{4})$/.exec(text);
  if (!match) return undefined;
  const name = match[1].toLowerCase();
  // An abbreviation ("Oct", "Sept") or the month's full name, nothing looser
  const full = fullNames.indexOf(name);
  const month = full >= 0 ? String(full + 1).padStart(2, "0") : months[name];
  return month ? `${match[2]}-${month}` : undefined;
}
