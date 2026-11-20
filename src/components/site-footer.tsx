import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CookieSettingsButton } from "@/components/cookie-settings-button";
export async function SiteFooter() {
  const legalPages = await prisma.legalPage.findMany({ where: { status: "PUBLISHED" }, select: { id: true, slug: true, title: true }, orderBy: { title: "asc" } }).catch(() => []);
  return <footer className="site-footer"><div className="footer-top"><div><Link className="wordmark footer-wordmark" href="/">YOI KIJI</Link><p>Textiles for the way you live.</p></div><div className="footer-links"><Link href="/shop">Shop all</Link><Link href="/our-story">Our story</Link><Link href="/journal">Journal</Link><Link href="/contact">Contact</Link>{legalPages.map(page=><Link href={`/legal/${page.slug}`} key={page.id}>{page.title}</Link>)}</div><Link className="back-top" href="#">BACK TO TOP</Link></div><div className="footer-bottom"><span>© {new Date().getFullYear()} YOI KIJI</span><span>COMFORT, CONSIDERED.</span><div>{legalPages.map(page=><Link href={`/legal/${page.slug}`} key={page.id}>{page.title}</Link>)}<CookieSettingsButton/></div></div></footer>;
}