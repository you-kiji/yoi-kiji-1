import type { Metadata, CSSProperties } from "next";
import { prisma } from "@/lib/prisma";
import "./globals.css";
import "./ui-overhaul.css";
import "./admin-operations.css";
import "./journal.css";
import "./visual-stability.css";
import "./premium-system.css";
import "./experience-overrides.css";
import "./advanced-search.css";
import "./content-management.css";
import "./quality-pass.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Analytics } from "@/components/analytics";
import { CookieConsent } from "@/components/cookie-consent";
import { ScrollMotion } from "@/components/scroll-motion";
import { getLocaleData } from "@/lib/i18n";
import { AnnouncementBar } from "@/components/announcement-bar";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocaleData();
  const title = locale.labels["seo.homeTitle"] ?? "YOI KIJI — Textiles for the Way You Live";
  const description = locale.labels["seo.homeDescription"] ?? "Thoughtfully chosen bedsheets, curtains, upholstery, bath linen and kitchen linen. Comfort, considered.";
  return {
    title: { default: title, template: "%s | YOI KIJI" },
    description,
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    openGraph: { title, description, type: "website" },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [locale, brand] = await Promise.all([
    getLocaleData(),
    prisma.storefrontBrandSettings.findUnique({ where: { id: "global" } }).catch(() => null),
  ]);
  const brandStyle = {
    "--green": brand?.background ?? "#0e300e",
    "--green-2": brand?.surface ?? "#19451b",
    "--cream": brand?.text ?? "#e9e9e9",
    "--cream-dim": brand?.muted ?? "#c8d0c5",
    "--accent": brand?.accent ?? "#c9a878",
    "--yk-content-max-width": `${brand?.contentMaxWidth ?? 1440}px`,
    "--yk-section-space": `${brand?.sectionSpacing ?? 96}px`,
    "--yk-button-radius": `${brand?.buttonRadius ?? 8}px`,
  } as CSSProperties;
  return (
    <html lang={locale.code} dir={locale.direction} style={brandStyle}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body>
        <ScrollMotion />
        <AnnouncementBar />
        <SiteHeader />
        {children}
        <SiteFooter />
        <Analytics />
        <CookieConsent />
      </body>
    </html>
  );
}
