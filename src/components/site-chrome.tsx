"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Analytics } from "@/components/analytics";
import { CookieConsent } from "@/components/cookie-consent";
import { ScrollMotion } from "@/components/scroll-motion";

export function SiteChrome({ children, announcement, header, footer }: { children: ReactNode; announcement: ReactNode; header: ReactNode; footer: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  if (isAdmin) return <>{children}</>;
  return <>
    <ScrollMotion />
    {announcement}
    {header}
    {children}
    {footer}
    <Analytics />
    <CookieConsent />
  </>;
}
