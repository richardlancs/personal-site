"use client";

import { useEffect, useRef, useState } from "react";

// Wrap any content in <Reveal> to have it gently fade and slide up the
// first time it scrolls into view. The actual animation lives in
// globals.css (.reveal / .is-visible).
export default function Reveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // IntersectionObserver tells us when the element enters the screen.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect(); // only animate once
        }
      },
      // Trigger once the top of the element is a little above the bottom of
      // the screen (works even for sections taller than the screen).
      { rootMargin: "0px 0px -10% 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal ${visible ? "is-visible" : ""}`}>
      {children}
    </div>
  );
}
