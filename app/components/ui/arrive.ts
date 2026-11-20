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
  const take = (el: Element) => {
    if (el.getBoundingClientRect().top < innerHeight) el.setAttribute("data-arrived", "");
    else io.observe(el);
  };
  const takeAll = () => {
    for (const el of document.querySelectorAll(".reveal:not([data-arrived])")) take(el);
  };
  takeAll();
  document.documentElement.setAttribute("data-arrive", "");
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
  // The safety net: anything on screen or above it still waiting is shown
  const safety = window.setTimeout(() => {
    for (const el of document.querySelectorAll(".reveal:not([data-arrived])")) if (el.getBoundingClientRect().top < innerHeight) el.setAttribute("data-arrived", "");
  }, SAFETY_MS);
  return () => {
    io.disconnect();
    mo.disconnect();
    window.clearTimeout(safety);
  };
}
