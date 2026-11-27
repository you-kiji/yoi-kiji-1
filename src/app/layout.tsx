import type { Metadata } from "next";
import { getLocaleData } from "@/lib/i18n";
import "./design-system.css";
import "./homepage-intro-media.css";
import "./homepage-product-cards.css";
import { SiteChrome } from "@/components/site-chrome";
import { AnnouncementBar } from "@/components/announcement-bar";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

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
  const locale = await getLocaleData();
  return (
    <html lang={locale.code} dir={locale.direction}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body>
        <SiteChrome announcement={<AnnouncementBar />} header={<SiteHeader />} footer={<SiteFooter />}>{children}</SiteChrome>
      </body>
    </html>
  );
}