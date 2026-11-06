import { glyphs, type GlyphId } from "./glyphs";

export { glyphs, type GlyphId };

// One place's drawing from the map, by itself (lists, the links at the
// foot of each page)
export default function PlaceGlyph({ id, className }: { id: GlyphId; className?: string }) {
  return (
    <svg viewBox={glyphs[id].box} aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={glyphs[id].d} />
    </svg>
  );
}
