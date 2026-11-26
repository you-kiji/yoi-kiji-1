import type { Metadata } from "next";
import { getLocaleData } from "@/lib/i18n";
import "./design-system.css";
import "./japanese-luxury.css";
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
        <style>{`.storefront-gallery-section .storefront-photo-collage{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important}.storefront-gallery-section .storefront-photo-collage a{aspect-ratio:1/1;overflow:hidden}.storefront-gallery-section .storefront-photo-collage img{width:100%;height:100%;object-fit:cover}.yk-marquee{overflow:hidden;width:100%;position:relative}.yk-marquee__track{display:flex;width:max-content;animation:yk-marquee-scroll 48s linear infinite}.yk-marquee:hover .yk-marquee__track,.yk-marquee:focus-within .yk-marquee__track{animation-play-state:paused}.yk-marquee__track>*{flex:0 0 auto;margin-right:18px}.yk-marquee__track .storefront-living-review{width:min(340px,78vw)}.yk-marquee__track .storefront-article-card{width:min(320px,78vw)}@keyframes yk-marquee-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}@media(max-width:700px){.storefront-gallery-section .storefront-photo-collage{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:5px!important}}@media(prefers-reduced-motion:reduce){.yk-marquee__track{animation:none}}`}</style>
      </head>
      <body>
        <SiteChrome announcement={<AnnouncementBar />} header={<SiteHeader />} footer={<SiteFooter />}>{children}</SiteChrome>
      </body>
    </html>
  );
}