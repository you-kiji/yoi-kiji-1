import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveCategories } from "@/lib/catalog";
import { CookieSettingsButton } from "@/components/cookie-settings-button";
import { getLocaleData } from "@/lib/i18n";

function SocialIcon({ platform }: { platform: string }) {
  const name = platform.trim().toLowerCase();
  if (name === "instagram") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect className="icon-cutout" x="3.5" y="3.5" width="17" height="17" rx="5"/><circle className="icon-cutout" cx="12" cy="12" r="4"/><circle className="icon-fill" cx="17.7" cy="6.5" r="1.1"/></svg>;
  if (name === "facebook") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.7 21v-8h2.8l.4-3.2h-3.2V7.7c0-.9.3-1.5 1.6-1.5H17V3.3c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.3H7.5V13h2.8v8z"/></svg>;
  if (name === "pinterest") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.2 2.5a9.5 9.5 0 0 0-3.5 18.3c0-.8 0-1.8.2-2.7l1.3-5.4s-.3-.6-.3-1.5c0-1.4.8-2.5 1.9-2.5.9 0 1.3.7 1.3 1.5 0 .9-.6 2.3-.9 3.6-.3 1.1.5 2 1.6 2 1.9 0 3.3-2.4 3.3-5.3 0-2.2-1.5-3.8-4.1-3.8-3 0-4.9 2.2-4.9 4.7 0 .9.3 1.9.8 2.4.2.3.3.4.2.7l-.3 1c-.1.3-.3.4-.6.3-1.4-.6-2-2.2-2-4 0-3 2.5-6.7 7.5-6.7 4 0 6.7 2.9 6.7 6.1 0 4.2-2.3 7.4-5.8 7.4-1.2 0-2.3-.7-2.7-1.4l-.8 3.1c-.3 1-.8 1.9-1.3 2.7.9.3 1.8.5 2.8.5a9.5 9.5 0 0 0 0-19z"/></svg>;
  if (name === "youtube") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23 7.1a3 3 0 0 0-2.1-2.2C19 4.4 12 4.4 12 4.4s-7 0-8.9.5A3 3 0 0 0 1 7.1 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.9 3 3 0 0 0 2.1 2.2c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.2 31 31 0 0 0 .5-4.9 31 31 0 0 0-.5-4.9z"/><path className="icon-cutout" d="m9.5 15.5 6-3.5-6-3.5z"/></svg>;
  if (name === "linkedin") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.2 8.4H2V22h3.2zM3.6 2a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8zM22 13.8c0-4.1-2.2-6-5.1-6a4.4 4.4 0 0 0-4 2.2V8.4H9.7V22H13v-6.7c0-1.8.3-3.5 2.5-3.5s2.2 2 2.2 3.6V22H22z"/></svg>;
  if (name === "tiktok") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.6 7.2a6.1 6.1 0 0 1-4-1.5v8.1a5.7 5.7 0 1 1-5.7-5.7c.4 0 .8 0 1.2.1v3.2a2.6 2.6 0 1 0 1.4 2.4V2.5h3.2c.2 2 1.6 3.8 3.9 4.1z"/></svg>;
  if (name === "x" || name === "twitter") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.7 5.6 22H2.4l7.3-8.4L1.8 2h6.5l4.5 6.7zm-1.1 18h1.7L7.3 3.9H5.5z"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle className="icon-cutout" cx="12" cy="12" r="8.5"/><path className="icon-cutout" d="M3.8 12h16.4M12 3.5c2.2 2.4 3.2 5.2 3.2 8.5s-1 6.1-3.2 8.5c-2.2-2.4-3.2-5.2-3.2-8.5s1-6.1 3.2-8.5z"/></svg>;
}

export async function SiteFooter() {
  const locale = await getLocaleData();
  const [legalPages, socialAccounts, navigationItems, categoryRecords] = await Promise.all([
    prisma.legalPage.findMany({ where: { status: "PUBLISHED" }, select: { id: true, slug: true, title: true }, orderBy: { title: "asc" } }).catch(() => []),
    prisma.socialAccount.findMany({ where: { isActive: true, placement: { in: ["footer", "both"] } }, orderBy: { sortOrder: "asc" }, select: { id: true, label: true, url: true, platform: true } }).catch(() => []),
    prisma.storeNavigationItem.findMany({ where: { isActive: true, location: "FOOTER" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, label: true, href: true, openInNewTab: true } }).catch(() => []),
    getActiveCategories().catch(() => []),
  ]);
  const legalTranslations = locale.code === "en" || !legalPages.length ? [] : await prisma.contentTranslation.findMany({
    where: { localeCode: locale.code, entityType: "legalPage", entityId: { in: legalPages.map(page => page.id) }, fieldKey: "title" },
    select: { entityId: true, value: true },
  }).catch(() => []);
  const legalNames = new Map(legalTranslations.map(item => [item.entityId, item.value]));
  const rootCategories = categoryRecords.filter(category => category.parentId === null);
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="footer-brand-copy">
          <Link className="wordmark footer-wordmark" href="/">YOI KIJI</Link>
          <p>Textiles for the way you live. Thoughtfully considered home textiles for everyday comfort, quiet moments and the everyday rituals that make a space feel like home.</p>
          <span className="footer-brand-note">BED LINEN · BATH LINEN · KITCHEN · LIVING</span>
        </div>
        <nav className="footer-column" aria-label="Explore YOI KIJI">
          <h3>Explore</h3>
          {navigationItems.length ? navigationItems.map(item => <Link href={item.href} key={item.id} target={item.openInNewTab ? "_blank" : undefined} rel={item.openInNewTab ? "noopener noreferrer" : undefined}>{item.label}</Link>) : <><Link href="/">Home</Link><Link href="/shop">All Collections</Link><Link href="/journal">Journal</Link><Link href="/our-story">Our Story</Link></>}
        </nav>
        <nav className="footer-column" aria-label="Shop categories">
          <h3>Shop</h3>
          {rootCategories.map(category => <Link href={"/shop?category=" + encodeURIComponent(category.slug)} key={category.id}>{category.name}</Link>)}
        </nav>
        <nav className="footer-column" aria-label="Discover YOI KIJI">
          <h3>Discover</h3>
          <Link href="/our-story">Our Story</Link>
          <Link href="/journal">Journal & Ideas</Link>
          <Link href="/reviews">Customer Reviews</Link>
          <Link href="/contact">Get in Touch</Link>
        </nav>
        <nav className="footer-column" aria-label="Help and order support">
          <h3>Help & Support</h3>
          <Link href="/contact">Contact Us</Link>
          <Link href="/shipping">Shipping Information</Link>
          <Link href="/returns">Returns & Exchanges</Link>
          <Link href="/cancellation">Cancellation Policy</Link>
          <Link href="/account/orders">Track Your Order</Link>
        </nav>
        <nav className="footer-column" aria-label="Customer care and policies">
          <h3>Customer Care</h3>
          {legalPages.map(page => <Link href={"/legal/" + page.slug} key={page.id}>{legalNames.get(page.id) ?? page.title}</Link>)}
        </nav>
        <div className="footer-column footer-social-column">
          <h3>Follow YOI KIJI</h3>
          <div className="footer-social-list">
            {socialAccounts.map(account => <a className="footer-social-link" href={account.url} key={account.id} target="_blank" rel="noopener noreferrer" aria-label={account.label} title={account.label}><SocialIcon platform={account.platform}/></a>)}
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} YOI KIJI</span>
        <span>COMFORT, CONSIDERED.</span>
        <div>{legalPages.map(page => <Link href={"/legal/" + page.slug} key={page.id}>{legalNames.get(page.id) ?? page.title}</Link>)}<CookieSettingsButton/><Link href="#">Back to top</Link></div>
      </div>
    </footer>
  );
}
