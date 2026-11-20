"use client";

import { useEffect } from "react";

export function ScrollMotion() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches || !("IntersectionObserver" in window)) return;

    const selector = [
      "main > section",
      ".editorial-collection",
      ".product-card",
      ".product-detail-gallery",
      ".product-detail-info",
      ".shop-filter-form",
      ".admin-metric-card",
      ".admin-module-card",
      ".admin-attention-grid > article",
      ".admin-recent-list > article",
      ".site-footer .footer-top > *",
    ].join(",");

    const targets = Array.from(document.querySelectorAll<HTMLElement>(selector))
      .filter((node) => !node.closest("[data-motion-reveal='visible']"));
    if (!targets.length) return;

    targets.forEach((node, index) => {
      node.dataset.motionReveal = "pending";
      node.style.setProperty("--motion-delay", `${Math.min(index % 5, 4) * 55}ms`);
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const node = entry.target as HTMLElement;
        node.dataset.motionReveal = "visible";
        observer.unobserve(node);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -5% 0px" });

    targets.forEach((node) => observer.observe(node));
    const onMotionPreferenceChange = (event: MediaQueryListEvent) => {
      if (!event.matches) return;
      observer.disconnect();
      targets.forEach((node) => {
        node.dataset.motionReveal = "visible";
        node.style.removeProperty("--motion-delay");
      });
    };
    reducedMotion.addEventListener("change", onMotionPreferenceChange);

    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener("change", onMotionPreferenceChange);
    };
  }, []);

  return null;
}
