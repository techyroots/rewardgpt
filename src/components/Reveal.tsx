"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Reveals its children once they scroll into view.
 *
 * The hidden state lives in CSS, and this only flips an attribute, so a client
 * that never runs the observer still sees the content: the effect below marks
 * everything revealed if IntersectionObserver is unavailable.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  /** Stagger, in ms. */
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      node.setAttribute("data-revealed", "true");
      return;
    }

    // Safety net: if the observer never fires for any reason, show the content
    // anyway rather than leaving the page blank.
    const failsafe = window.setTimeout(() => node.setAttribute("data-revealed", "true"), 2500);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-revealed", "true");
            // Reveal is one-way; keeping it observed would re-animate on every
            // scroll past, which is distracting rather than lively.
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    observer.observe(node);
    return () => {
      window.clearTimeout(failsafe);
      observer.disconnect();
    };
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      data-reveal=""
      className={className}
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}
