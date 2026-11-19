import Link from "next/link";
import { CartCount } from "@/components/cart-count";
import { getActiveCategories } from "@/lib/catalog";

export async function SiteHeader() {
  const categories = await getActiveCategories();
  const roots = categories.filter(category => category.parentId === null && category.showInMenu);
  const navigation = <>
    <Link href="/shop">Shop all</Link>
    {roots.map(category => {
      const children = categories.filter(child => child.parentId === category.id && child.showInMenu);
      return <div className="nav-category" key={category.id}>
        <Link href={`/shop?category=${encodeURIComponent(category.slug)}`}>{category.name}</Link>
        {children.length > 0 && <div className="nav-submenu">{children.map(child => <Link key={child.id} href={`/shop?category=${encodeURIComponent(child.slug)}`}>{child.name}</Link>)}</div>}
      </div>;
    })}
    <Link href="/our-story">Our story</Link>
    <Link href="/journal">Journal</Link>
  </>;
  return <header className="site-header">
    <Link className="wordmark" href="/" aria-label="YOI KIJI home"><span className="wordmark-main">YOI KIJI</span><span className="wordmark-sub">THE ART OF TEXTILE LIVING</span></Link>
    <nav className="desktop-navigation" aria-label="Main navigation">{navigation}</nav>
    <details className="mobile-navigation">
      <summary aria-label="Open navigation menu">Menu</summary>
      <nav aria-label="Mobile navigation">{navigation}</nav>
    </details>
    <div className="header-actions"><Link href="/search" aria-label="Search">Search</Link><Link href="/account">Account</Link><Link className="bag-link" href="/cart">Bag <CartCount/></Link></div>
  </header>;
}
