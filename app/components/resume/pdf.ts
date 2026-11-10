import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist/legacy/build/pdf.mjs";

// Loads the résumé for the viewer (ResumeViewer.tsx) with pdf.js. Nothing
// here runs, and nothing of pdf.js is downloaded, until the viewer first
// opens. The legacy build: about 8% larger than the modern one, and it
// runs on the phones and browsers a few versions back that the modern
// build leaves out (it relies on APIs as new as Uint8Array.toHex).
export type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

export type Resume = {
  pdfjs: PdfJs;
  doc: PDFDocumentProxy;
  pages: PDFPageProxy[];
  links: Link[][]; // each page's links, in PDF units
};

// A link in the PDF (an email address, GitHub, a project), laid over the
// page so it can be followed as in any PDF reader
export type Link = { url: string; rect: number[] };

// Why it didn't open, for the error state's message
export type Failure = "network" | "file" | "reader";

export class ResumeError extends Error {
  constructor(
    readonly kind: Failure,
    message: string,
  ) {
    super(message);
  }
}

let pdfjs: Promise<PdfJs> | null = null;
let current: Promise<Resume> | null = null;

// The same document again on a second opening; after a failure, a fresh
// attempt (Retry) that goes back to the network
export function loadResume(url: string, retry: boolean): Promise<Resume> {
  if (current && !retry) return current;
  current = open(url, retry);
  current.catch(() => {
    current = null;
  });
  return current;
}

async function open(url: string, retry: boolean): Promise<Resume> {
  // The file and the reader download side by side
  const bytes = fetchBytes(url, retry);
  bytes.catch(() => {}); // reported below, once the reader is in
  const lib = await (pdfjs ??= import("pdfjs-dist/legacy/build/pdf.mjs")).catch(() => {
    pdfjs = null;
    throw new ResumeError("reader", "The reader didn't download. Check the connection and try again.");
  });
  const data = await bytes;

  // The reader's worker parses the file off the main thread. It is started
  // here rather than by pdf.js, so that a worker that can't load is an
  // error (pdf.js would quietly fall back to the main thread, and remember
  // the failure until the page reloads, so Retry couldn't recover).
  const worker = new Worker(new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url), { type: "module" });
  const port = new lib.PDFWorker({ port: worker as never });
  const stop = () => {
    port.destroy();
    worker.terminate();
  };
  let timer: number | undefined;
  const failed = new Promise<never>((_, reject) => {
    worker.addEventListener("error", (event) => {
      event.preventDefault();
      reject(new ResumeError("reader", "The reader couldn't start."));
    });
    timer = window.setTimeout(() => reject(new ResumeError("reader", "The reader took too long to start.")), 30_000);
  });
  failed.catch(() => {}); // only matters while the file is opening

  const task = lib.getDocument({ data, worker: port, isEvalSupported: false, enableXfa: false });
  try {
    const doc = await Promise.race([task.promise, failed]);
    const pages = await Promise.race([Promise.all(Array.from({ length: doc.numPages }, (_, i) => doc.getPage(i + 1))), failed]);
    const links = await Promise.all(
      pages.map(async (page) =>
        (await page.getAnnotations({ intent: "display" }))
          .filter((a) => a.subtype === "Link" && typeof a.url === "string" && /^(https?:|mailto:)/.test(a.url))
          .map((a) => ({ url: a.url as string, rect: a.rect as number[] })),
      ),
    );
    return { pdfjs: lib, doc, pages, links };
  } catch (error) {
    task.destroy();
    stop();
    if (error instanceof ResumeError) throw error;
    throw new ResumeError("file", "The file arrived but couldn't be read.");
  } finally {
    window.clearTimeout(timer);
  }
}

async function fetchBytes(url: string, retry: boolean) {
  let res: Response;
  try {
    // Retry skips the browser's cache, so it really asks again
    res = await fetch(url, { cache: retry ? "reload" : "default" });
  } catch {
    throw new ResumeError("network", "The connection dropped before the file arrived.");
  }
  if (!res.ok) throw new ResumeError("network", res.status === 404 ? "The file couldn't be found." : "The site couldn't send the file just now.");
  try {
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    throw new ResumeError("network", "The connection dropped before the file arrived.");
  }
}
