import type { ReactNode } from "react";
import { Analytics } from "@/components/analytics";
import { CookieConsent } from "@/components/cookie-consent";
import { ScrollMotion } from "@/components/scroll-motion";

export function SiteChrome({ children, announcement, header, footer, isAdmin }: { children: ReactNode; announcement: ReactNode; header: ReactNode; footer: ReactNode; isAdmin: boolean }) {
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
