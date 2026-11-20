// Keyboard for a row of exclusive choices: the workshop's bench tabs, the
// arcade's cabinets, the timetable's lines. Arrows move the choice along
// the row (and wrap), Home and End jump to its ends. Returns the next
// index, or null when the key isn't one of these.
export function stepChoice(key: string, current: number, count: number): number | null {
  if (count < 1) return null;
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return (current + 1) % count;
    case "ArrowLeft":
    case "ArrowUp":
      return (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}

// Moves the choice on an arrow key and puts the keyboard's focus on it:
// the row keeps one tab stop (the chosen one), and the arrows do the rest.
export function onChoiceKey(event: React.KeyboardEvent<HTMLElement>, current: number, count: number, choose: (index: number) => void) {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const next = stepChoice(event.key, current, count);
  if (next === null) return;
  event.preventDefault();
  choose(next);
  const items = event.currentTarget.querySelectorAll<HTMLElement>("[data-choice]");
  items[next]?.focus();
}
