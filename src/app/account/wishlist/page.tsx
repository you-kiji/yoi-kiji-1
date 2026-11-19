import "../../reviews-wishlist.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/money";
import { WishlistButton } from "@/components/wishlist-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your wishlist" };

export default async function WishlistPage() {
  const user = await getCurrentUser();
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
    <main className="commerce-page account-wishlist-page">
      <div className="commerce-breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/account">Account</Link>
        <span>/</span>
        Wishlist
      </div>

      <header className="commerce-heading account-subpage-heading">
        <p className="eyebrow">YOUR SAVED PIECES</p>
        <h1>Keep what<br /><em>you love.</em></h1>
        <p>Your considered pieces, gathered in one place.</p>
      </header>

      {items.length ? (
        <section className="product-grid wishlist-product-grid" aria-label="Your saved products">
          {items.map((item) => (
            <article className="wishlist-card" key={item.id}>
              <Link href={"/products/" + item.product.slug} className="wishlist-card__product">
                <div className="product-card-image">
                  {item.product.images[0] ? (
                    <img
                      src={item.product.images[0].url}
                      alt={item.product.images[0].alt || item.product.name}
                    />
                  ) : (
                    <span>YOI KIJI</span>
                  )}
                </div>
                <p className="product-card-category">{item.product.category?.name ?? "YOI KIJI"}</p>
                <h2>{item.product.name}</h2>
                <p className="wishlist-card-price">{formatINR(item.product.pricePaise)}</p>
              </Link>
              <WishlistButton productId={item.product.id} />
            </article>
          ))}
        </section>
      ) : (
        <section className="catalogue-empty account-empty-state">
          <p className="eyebrow">A PLACE FOR FUTURE FAVOURITES</p>
          <h2>Your wishlist is waiting.</h2>
          <p>Save the pieces you love and return to them whenever you are ready.</p>
          <Link className="primary-link" href="/shop">Explore the collections</Link>
        </section>
      )}
    </main>
  );
}
