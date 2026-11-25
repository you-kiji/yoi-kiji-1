import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/money";
import { WishlistButton } from "@/components/wishlist-button";
import { getLocaleData } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your wishlist" };

export default async function WishlistPage() {
  const user = await getCurrentUser();
  const locale = await getLocaleData();
  const t = (key: string, fallback: string) => locale.labels[key] ?? fallback;
  if (!user) redirect("/login");

  const items = await prisma.wishlistItem.findMany({
    where: { userId: user.id, product: { isActive: true } },
    include: {
      product: {
        include: {
          images: { where: { variantId: null }, orderBy: { isPrimary: "desc" }, take: 1 },
          category: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="page">
      <div className="page-content">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">{t("common.home","Home")}</Link>
          <span className="separator">/</span>
          <Link href="/account">{t("account.title","Account")}</Link>
          <span className="separator">/</span>
          <span className="current">{t("account.wishlist","Wishlist")}</span>
        </nav>

        <header className="page-header" style={{ marginBottom: 'var(--space-2xl)' }}>
          <p className="section-eyebrow">YOUR SAVED PIECES</p>
          <h1>Keep what<br /><em>you love.</em></h1>
          <p>Your considered pieces, gathered in one place.</p>
        </header>

        {items.length ? (
          <section className="grid-4" aria-label="Your saved products" style={{ gap: 'var(--space-lg)' }}>
            {items.map((item: typeof items[0]) => (
              <article key={item.id} className="product-card">
                <Link href={"/products/" + item.product.slug} className="w-full">
                  <div className="product-card-image">
                    {item.product.images[0] ? (
                      <img src={item.product.images[0].url} alt={item.product.images[0].alt || item.product.name} loading="lazy" />
                    ) : (
                      <span>YOI KIJI</span>
                    )}
                  </div>
                  <div className="product-card-info">
                    <p className="product-card-category">{item.product.category?.name ?? "YOI KIJI"}</p>
                    <h3 className="product-card-title">{item.product.name}</h3>
                    <p className="product-card-price">{formatINR(item.product.pricePaise)}</p>
                  </div>
                </Link>
                <WishlistButton productId={item.product.id} />
              </article>
            ))}
          </section>
        ) : (
          <section className="empty-state" style={{ marginTop: 'var(--space-xl)' }}>
            <div className="empty-state-icon">✳</div>
            <p className="section-eyebrow">A PLACE FOR FUTURE FAVOURITES</p>
            <h2>Your wishlist is waiting.</h2>
            <p>Save the pieces you love and return to them whenever you are ready.</p>
            <Link href="/shop" className="btn btn-primary mt-lg">{t("account.exploreCollections","Explore the collections")}</Link>
          </section>
        )}
      </div>
    </main>
  );
}