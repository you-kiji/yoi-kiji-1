"use client";

import { usePathname } from "next/navigation";
import { AnnouncementBar } from "@/components/announcement-bar";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Analytics } from "@/components/analytics";
import { CookieConsent } from "@/components/cookie-consent";
import { ScrollMotion } from "@/components/scroll-motion";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  if (isAdmin) return <>{children}</>;
  return <>
    <ScrollMotion />
    <AnnouncementBar />
    <SiteHeader />
    {children}
    <SiteFooter />
    <Analytics />
    <CookieConsent />
  </>;
}
