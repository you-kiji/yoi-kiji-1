import Link from "next/link";
import { CartCount } from "@/components/cart-count";
import { getActiveCategories } from "@/lib/catalog";

const fallbackCategories = [
  { id: "fallback-bedsheets", name: "Bedsheets", slug: "bedsheets", parentId: null, showInMenu: true },
  { id: "fallback-curtains", name: "Curtains", slug: "curtains", parentId: null, showInMenu: true },
  { id: "fallback-upholstery", name: "Upholstery", slug: "upholstery", parentId: null, showInMenu: true },
  { id: "fallback-bath-linen", name: "Bath linen", slug: "bath-linen", parentId: null, showInMenu: true },
  { id: "fallback-kitchen-linen", name: "Kitchen linen", slug: "kitchen-linen", parentId: null, showInMenu: true },
];

export async function SiteHeader() {
  let categories: Awaited<ReturnType<typeof getActiveCategories>> = [];
  try {
    categories = await getActiveCategories();
  } catch {
    // Keep the primary navigation available even if catalogue data is temporarily unavailable.
  }
  const roots = (categories.length ? categories : fallbackCategories)
    .filter(category => category.parentId === null && category.showInMenu);

  return (
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label="YOI KIJI home">
        <span className="wordmark-main">YOI KIJI</span>
        <span className="wordmark-sub">THE ART OF TEXTILE LIVING</span>
      </Link>

      <nav className="desktop-navigation" aria-label="Main navigation">
        <Link href="/shop">Shop</Link>
        <details className="header-collections">
          <summary>Collections</summary>
          <div className="header-collections-menu">
            {roots.map(category => (
              <Link key={category.id} href={`/shop?category=${encodeURIComponent(category.slug)}`}>{category.name}</Link>
            ))}
          </div>
        </details>
        <Link href="/our-story">Our story</Link>
        <Link href="/journal">Journal</Link>
      </nav>

      <details className="mobile-navigation">
        <summary aria-label="Open navigation menu">Menu</summary>
        <nav aria-label="Mobile navigation">
          <Link href="/shop">Shop all</Link>
          <p>Collections</p>
          {roots.map(category => (
            <Link key={category.id} href={`/shop?category=${encodeURIComponent(category.slug)}`}>{category.name}</Link>
          ))}
          <Link href="/our-story">Our story</Link>
          <Link href="/journal">Journal</Link>
          <Link href="/search">Search</Link>
          <Link href="/account">Account</Link>
        </nav>
      </details>

      <div className="header-actions">
        <Link href="/search">Search</Link>
        <Link href="/account">Account</Link>
        <Link className="bag-link" href="/cart">Bag <CartCount /></Link>
      </div>
    </header>
  );
}
