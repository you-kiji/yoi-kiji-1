"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function JapaneseLoader() {
  const pathname = usePathname();
  const initialPath = useRef(pathname);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const delay = pathname === initialPath.current ? 850 : 420;
    const timeout = window.setTimeout(() => setVisible(false), delay);
    initialPath.current = pathname;
    return () => window.clearTimeout(timeout);
  }, [pathname]);

  if (!visible) return null;

  return (
    <div className="yk-loader" role="status" aria-live="polite" aria-label="Loading YOI KIJI">
      <div className="yk-loader__pattern" aria-hidden="true" />
      <div className="yk-loader__content">
        <div className="yk-loader__enso" aria-hidden="true"><span /></div>
        <p className="yk-loader__brand">YOI KIJI</p>
        <p className="yk-loader__japanese" lang="ja">暮らしに、心地よさを。</p>
        <span className="yk-loader__rule" aria-hidden="true"><i /></span>
        <p className="yk-loader__caption">THE ART OF TEXTILE LIVING</p>
      </div>
    </div>
  );
}
