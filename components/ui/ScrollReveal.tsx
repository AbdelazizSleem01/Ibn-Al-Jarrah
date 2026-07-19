"use client";

import { useEffect, useRef } from "react";

/**
 * ScrollReveal – wraps any element and triggers CSS .is-visible
 * when it enters the viewport via IntersectionObserver.
 *
 * Props:
 *  - className: the reveal variant class ("reveal", "reveal-left", "reveal-right", "reveal-scale")
 *  - stagger: adds .stagger-children so nth-child delays cascade
 *  - delay: optional extra CSS transition-delay (ms)
 *  - threshold: how much of element must be visible (0–1, default 0.12)
 */
interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  variant?: "reveal" | "reveal-left" | "reveal-right" | "reveal-scale";
  stagger?: boolean;
  delay?: number;
  threshold?: number;
}

export default function ScrollReveal({
  children,
  className = "",
  as: Tag = "div",
  variant = "reveal",
  stagger = false,
  delay = 0,
  threshold = 0.12,
}: ScrollRevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (delay) {
      el.style.transitionDelay = `${delay}ms`;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          observer.unobserve(el); // fire once only
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, threshold]);

  const classes = [variant, stagger ? "stagger-children" : "", className]
    .filter(Boolean)
    .join(" ");

  // @ts-ignore – polymorphic tag is fine here
  return <Tag ref={ref} className={classes}>{children}</Tag>;
}
