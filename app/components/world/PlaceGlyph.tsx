import { glyphs, type GlyphId } from "./glyphs";

export { glyphs, type GlyphId };

// One place's drawing from the map, by itself (lists, the links at the
// foot of each page). Shown at different sizes, so the stroke doesn't
// scale with the drawing: 1.5px wherever it is, like the sketches and the
// map's own ink.
export default function PlaceGlyph({ id, className }: { id: GlyphId; className?: string }) {
  return (
    <svg viewBox={glyphs[id].box} aria-hidden="true" focusable="false" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={glyphs[id].d} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
