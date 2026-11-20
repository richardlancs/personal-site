// The page's one-time arrival (reveal.css, "Arrival"): one observer for the
// page marks each `.reveal` data-arrived the first time its top edge comes a
// little way (5% of the screen) up over the foot of the screen, and then lets
// it go, so nothing ever arrives twice. "in" when it came up from below (it
// rises and fades in); empty when it was reached some other way (a jump, the
// find bar, scrolling back up to it), so it is simply there. Whatever is on
// the screen or above it when this runs is marked at once, before the page
// is marked ready (html[data-arrive]): nothing already in view ever hides.
// Called once, from GlassPress's effect (mounted in the layout).
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
  for (const el of document.querySelectorAll(".reveal:not([data-arrived])")) {
    if (el.getBoundingClientRect().top < innerHeight) el.setAttribute("data-arrived", "");
    else io.observe(el);
  }
  document.documentElement.setAttribute("data-arrive", "");
  return () => io.disconnect();
}
