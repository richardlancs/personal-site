// The page's one-time arrival (reveal.css, "Arrival"): each `.reveal` item
// below the fold rises and fades in the first time its top edge comes a
// little way (5% of the screen) up over the foot of the screen, once.
//
// Items are visible by default. Only this script ever hides one, and only
// after the page is hydrated: it runs from Arrivals.tsx's effect, rendered
// last inside the page, so every item it touches is already React's (no
// attribute is ever written on server HTML React hasn't hydrated). Of the
// items it finds, only those below the fold at that moment are marked
// waiting (data-arrive-wait); one observer lets each come in (data-arrived
// "in", the transition) as it comes up, then lets it go. Everything on the
// screen or above it is simply there. The page is marked (html[data-arrive])
// so the waiting state can apply.
//
// Nothing can stay hidden: an item the observer never reports on within
// LAST_MS (the observer reports every item once as soon as it's observed,
// so that would be a broken observer) is shown; and the cleanup (the page
// leaving, or hidden by the router) unmarks everything still waiting, so
// it shows, and a later run (the page shown again) can take it up again.
const LAST_MS = 1500;
const WAIT = "data-arrive-wait";

export function watchArrivals() {
  const waiting = new Set<Element>();
  const reported = new Set<Element>();
  const show = (el: Element, how: "in" | "") => {
    el.removeAttribute(WAIT);
    el.setAttribute("data-arrived", how);
    waiting.delete(el);
  };
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        reported.add(e.target);
        if (!e.isIntersecting) continue;
        show(e.target, e.boundingClientRect.top > innerHeight / 2 ? "in" : "");
        io.unobserve(e.target);
      }
    },
    { rootMargin: "0px 0px -5% 0px" },
  );
  for (const el of document.querySelectorAll(".reveal:not([data-arrived])")) {
    if (el.getBoundingClientRect().top < innerHeight) {
      el.setAttribute("data-arrived", "");
      continue;
    }
    el.setAttribute(WAIT, "");
    waiting.add(el);
    io.observe(el);
  }
  document.documentElement.setAttribute("data-arrive", "");
  // The bound: anything the observer hasn't reported on by now is shown
  const last = window.setTimeout(() => {
    for (const el of [...waiting]) if (!reported.has(el)) show(el, "");
  }, LAST_MS);
  return () => {
    io.disconnect();
    window.clearTimeout(last);
    for (const el of waiting) el.removeAttribute(WAIT);
  };
}
