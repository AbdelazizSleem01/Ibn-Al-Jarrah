"use client";

import React, { useEffect, useRef } from "react";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
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
