"use client";

import { useEffect, useState, type ReactNode } from "react";

export function FilterDrawer({
  label,
  closeLabel,
  count = 0,
  children,
}: {
  label: string;
  closeLabel: string;
  count?: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="catalogue-filter-drawer-root">
      <button
        type="button"
        className="catalogue-filter-trigger"
        aria-expanded={open}
        aria-controls="catalogue-filter-drawer"
        onClick={() => setOpen(true)}
      >
        <span className="catalogue-filter-icon" aria-hidden="true"><i/><i/><i/></span>
        <span>{label}</span>
        {count > 0 && <span className="catalogue-filter-count">{count}</span>}
      </button>
      {open && (
        <>
          <button
            type="button"
            className="catalogue-filter-backdrop"
            aria-label={closeLabel}
            onClick={() => setOpen(false)}
          />
          <aside
            id="catalogue-filter-drawer"
            className="catalogue-filter-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={label}
          >
            <div className="catalogue-filter-drawer-heading">
              <span className="eyebrow">YOI KIJI</span>
              <button type="button" className="catalogue-filter-close" onClick={() => setOpen(false)} aria-label={closeLabel}>×</button>
            </div>
            {children}
          </aside>
        </>
      )}
    </div>
  );
}
