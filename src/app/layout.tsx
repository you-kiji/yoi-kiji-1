import type { Metadata } from "next";
import "./globals.css";
import "./ui-overhaul.css";
import "./admin-operations.css";
import "./journal.css";
import "./visual-stability.css";
import "./premium-system.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Analytics } from "@/components/analytics";
import { CookieConsent } from "@/components/cookie-consent";
import { ScrollMotion } from "@/components/scroll-motion";

export const metadata: Metadata = {
  title: { default: "YOI KIJI — Textiles for the Way You Live", template: "%s | YOI KIJI" },
  description: "Thoughtfully chosen bedsheets, curtains, upholstery, bath linen and kitchen linen. Comfort, considered.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "YOI KIJI — Textiles for the Way You Live",
    description: "Thoughtfully chosen home textiles. Comfort, considered.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><ScrollMotion/><div className="announcement"><span>TEXTILES FOR THE WAY YOU LIVE</span><i>✳</i><span>COMFORT, CONSIDERED</span></div><SiteHeader/>{children}<SiteFooter/><Analytics/><CookieConsent/></body>
    </html>
  );
}
