"use client";

import { useEffect, useRef } from "react";

type LazyBackgroundProps = {
  backgroundImage: string;
  className?: string;
  role?: "img";
  ariaLabel?: string;
};

export function LazyBackground({
  backgroundImage,
  className,
  role,
  ariaLabel,
}: LazyBackgroundProps) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    if (!("IntersectionObserver" in window)) {
      element.style.backgroundImage = backgroundImage;
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          element.style.backgroundImage = backgroundImage;
          observer.disconnect();
        }
      },
      { rootMargin: "500px 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [backgroundImage]);

  return <div ref={elementRef} className={className} role={role} aria-label={ariaLabel} />;
}
