// The page's one-time arrival (reveal.css, "Arrival"): one observer for the
// page marks each `.reveal` data-arrived the first time its top edge comes a
// little way (5% of the screen) up over the foot of the screen, and then lets
// it go, so nothing ever arrives twice. "in" when it came up from below (it
// rises and fades in); empty when it was reached some other way (a jump, the
// find bar, scrolling back up to it), so it is simply there. Whatever is on
// the screen or above it when this runs is marked at once, before the page
// is marked ready (html[data-arrive]): nothing already in view ever hides.
//
// Started from GlassPress's effect (mounted in the layout) on every route:
// a client-side navigation (the 3D city's /city/* pages, the switch between
// views) brings new content without a load, so the previous observer is
// let go and a new one watches the new page. The content can land a moment
// after the address changes, so items added later are taken in as they
// come, and a safety net marks anything still unmarked on screen or above
// it shortly after, so nothing is ever left at the waiting opacity.
// (The page scrolls the window on every route, the city's panel included,
// so the viewport is the observer's root.)
const SAFETY_MS = 900;
const LAST_MS = 5000;

export function watchArrivals() {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.setAttribute("data-arrived", e.boundingClientRect.top > innerHeight / 2 ? "in" : "");
        io.unobserve(e.target);
      }
    },
    { rootMargin: "0px 0px -5% 0px" },
  );
  // An item React hasn't hydrated yet (a route segment that streams in after
  // the layout) is left alone until it has: marking it first would make
  // its server HTML differ from what React expects. React tags each
  // element it has hydrated with a "__reactFiber…" key; until then it is
  // looked at again on the next frames (and the safety net has it anyway).
  const hydrated = (el: Element) => Object.keys(el).some((k) => k.startsWith("__reactFiber"));
  const waiting = new Set<Element>();
  let frame = 0;
  const take = (el: Element) => {
    if (!hydrated(el)) {
      waiting.add(el);
      frame ||= requestAnimationFrame(retry);
      return;
    }
    waiting.delete(el);
    if (el.getBoundingClientRect().top < innerHeight) el.setAttribute("data-arrived", "");
    else io.observe(el);
  };
  // The page is marked ready (items may wait) only once nothing on the
  // screen is still waiting to be hydrated, so nothing in view ever hides
  const ready = () => {
    if (![...waiting].some((el) => el.getBoundingClientRect().top < innerHeight)) document.documentElement.setAttribute("data-arrive", "");
  };
  const retry = () => {
    frame = 0;
    for (const el of [...waiting]) take(el);
    ready();
  };
  for (const el of document.querySelectorAll(".reveal:not([data-arrived])")) take(el);
  ready();
  // Content that lands after this ran (a streamed or late route segment)
  const mo = new MutationObserver((records) => {
    for (const r of records)
      for (const node of r.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches(".reveal:not([data-arrived])")) take(node);
        for (const el of node.querySelectorAll(".reveal:not([data-arrived])")) take(el);
      }
  });
  mo.observe(document.body, { childList: true, subtree: true });
  // The safety net: anything on screen or above it still unmarked is
  // shown. (Not yet hydrated, it is visible anyway: the page isn't marked
  // ready while it waits in view. Past LAST_MS it is marked regardless.)
  const sweep = (all: boolean) => {
    for (const el of document.querySelectorAll(".reveal:not([data-arrived])")) if ((all || hydrated(el)) && el.getBoundingClientRect().top < innerHeight) el.setAttribute("data-arrived", "");
    if (all) document.documentElement.setAttribute("data-arrive", "");
    else ready();
  };
  const safety = window.setTimeout(() => sweep(false), SAFETY_MS);
  const last = window.setTimeout(() => sweep(true), LAST_MS);
  return () => {
    io.disconnect();
    mo.disconnect();
    window.clearTimeout(safety);
    window.clearTimeout(last);
    cancelAnimationFrame(frame);
  };
}
