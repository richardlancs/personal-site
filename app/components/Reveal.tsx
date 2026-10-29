"use client";

import { useEffect, useRef, useState } from "react";

// Wrap any content in <Reveal> to have it gently fade and rise the first
// time it comes into view, whether it scrolls up from below or slides in
// from the side during the park walk. The animation lives in globals.css
// (.reveal / .is-visible); `delay` staggers it after other reveals.
export default function Reveal({
  children,
  className = "",
  delay,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
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
      // Trigger once the element is a little way past the bottom or right
      // edge of the screen (works even for elements bigger than the screen).
      { rootMargin: "0px -8% -10% 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? "is-visible" : ""} ${className}`}
      style={delay ? ({ "--delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}
