// Short points, the way everything on the site is written: a list with a
// small mark in the margin. `variant` picks the paper: plain sheets, or
// the notebook's ruled lines.
export default function Points({ items, variant = "paper", className }: { items: string[]; variant?: "paper" | "notebook"; className?: string }) {
  const base = variant === "notebook" ? "notebook-points" : "points";
  return (
    <ul role="list" className={className ? `${base} ${className}` : base}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
