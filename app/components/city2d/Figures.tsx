import { splitFigures } from "../../lib/figures.ts";

// Content text with its figures in bold (lib/figures.ts: "6,000+", "40%",
// "3×3", never a year or a name such as YOLO11): each figure a
// <strong className="figure">, weight 700 in the text's own colour
// (city.css), so it reads as part of the sentence. The data stays plain
// text; this is done where it is shown.
export default function Figures({ children }: { children: string }) {
  return (
    <>
      {splitFigures(children).map((piece, i) =>
        piece.figure ? (
          <strong key={i} className="figure">
            {piece.text}
          </strong>
        ) : (
          piece.text
        ),
      )}
    </>
  );
}
