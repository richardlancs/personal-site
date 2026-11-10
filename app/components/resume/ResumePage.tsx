"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import type { PDFPageProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { Link, PdfJs } from "./pdf";

// The most pixels one page's canvas gets. Past about 16 million iOS
// won't draw a canvas at all (a phone at 3x, zoomed in, gets there); the
// page is then drawn at a lower resolution and stretched, while the text
// over it stays sharp.
const MAX_PIXELS = 12_000_000;

type Props = {
  pdfjs: PdfJs;
  page: PDFPageProxy;
  links: Link[];
  scale: number; // CSS pixels per PDF unit
  label: string;
};

// One page of the résumé: the page drawn on a canvas at the screen's
// resolution, and over it pdf.js's text layer, the same words as real
// text (invisible, in place), so they can be selected, copied, searched
// and read out; then the PDF's own links. At a new zoom both are redrawn
// off screen and swapped in when ready, so the page never goes blank.
export default function ResumePage({ pdfjs, page, links, scale, label }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const drawn = useRef<HTMLDivElement>(null);
  const words = useRef<HTMLDivElement>(null);
  const viewport = useMemo(() => page.getViewport({ scale }), [page, scale]);

  useEffect(() => {
    const canvasHost = drawn.current;
    const textHost = words.current;
    if (!canvasHost || !textHost) return;
    let live = true;

    const ratio = Math.min(window.devicePixelRatio || 1, Math.sqrt(MAX_PIXELS / (viewport.width * viewport.height)));
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width * ratio);
    canvas.height = Math.floor(viewport.height * ratio);
    const render = page.render({
      canvas,
      viewport,
      transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
    });
    render.promise.then(
      () => {
        if (!live) return;
        canvasHost.replaceChildren(canvas);
        box.current?.setAttribute("data-drawn", "");
      },
      () => {}, // cancelled by a newer zoom
    );

    const layer = document.createElement("div");
    layer.className = "textLayer";
    const text = new pdfjs.TextLayer({ textContentSource: page.streamTextContent(), container: layer, viewport });
    text.render().then(
      () => {
        if (live) textHost.replaceChildren(layer);
      },
      () => {},
    );

    return () => {
      live = false;
      render.cancel();
      text.cancel();
    };
  }, [pdfjs, page, viewport]);

  return (
    <div
      ref={box}
      role="group"
      aria-label={label}
      className="resume-page"
      style={
        {
          width: viewport.width,
          height: viewport.height,
          // pdf.js sizes its text layer from these
          "--total-scale-factor": scale,
          "--scale-round-x": "1px",
          "--scale-round-y": "1px",
        } as CSSProperties
      }
    >
      <div ref={drawn} className="resume-drawn" aria-hidden="true" />
      <div ref={words} className="resume-words" />
      {links.map((link, i) => {
        const [x1, y1, x2, y2] = viewport.convertToViewportRectangle(link.rect);
        const mail = link.url.startsWith("mailto:");
        const name = link.url.replace(/^mailto:|^https?:\/\/(www\.)?/g, "").replace(/\/$/, "");
        return (
          <a
            key={i}
            href={link.url}
            target={mail ? undefined : "_blank"}
            rel="noopener noreferrer"
            className="resume-link"
            aria-label={mail ? `Email ${name}` : `${name} (opens in a new tab)`}
            style={{
              left: Math.min(x1, x2),
              top: Math.min(y1, y2),
              width: Math.abs(x2 - x1),
              height: Math.abs(y2 - y1),
            }}
          />
        );
      })}
    </div>
  );
}
