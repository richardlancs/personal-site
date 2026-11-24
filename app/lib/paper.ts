// The paper the site is printed on: cream (the default), charcoal or
// kraft, chosen by the visitor in the Paper picker (ui/PaperPicker.tsx),
// never by the system's light or dark setting.
//
// One attribute on <html> carries it, data-paper="cream|charcoal|kraft":
// every colour is a token defined per paper in city.css
// (:root[data-paper=…]). The choice is kept in localStorage under
// PAPER_KEY. This file has no "use client", so the root layout can put
// PAPER_SCRIPT in the page's <head>, where it sets the attribute before the
// first paint: a saved paper never flashes cream first.

export const PAPER_KEY = "paper";
export const PAPERS = ["cream", "charcoal", "kraft"] as const;
export type Paper = (typeof PAPERS)[number];
export const DEFAULT_PAPER: Paper = "cream";

export const isPaper = (value: unknown): value is Paper => typeof value === "string" && (PAPERS as readonly string[]).includes(value);

export const PAPER_SCRIPT = `(function(){var p;try{p=localStorage.getItem("${PAPER_KEY}")}catch(e){}if(${JSON.stringify(PAPERS)}.indexOf(p)<0)p="${DEFAULT_PAPER}";document.documentElement.setAttribute("data-paper",p)})()`;

// The paper on <html> now (the head script's, or the picker's since)
export const currentPaper = (): Paper => {
  const value = document.documentElement.getAttribute("data-paper");
  return isPaper(value) ? value : DEFAULT_PAPER;
};
