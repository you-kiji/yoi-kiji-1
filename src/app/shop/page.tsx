import "../reviews-wishlist.css";
import type { Metadata } from "next";
import Link from "next/link";
import { getActiveCategories, getActiveProducts, getCategoryBranchIds } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Shop the collections",
  description: "Explore the YOI KIJI home textile collections.",
};

type Filters = {
  collection?: string;
  category?: string;
  q?: string;
  sort?: string;
  minPrice?: string;
  maxPrice?: string;
};

export default async function ShopPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const params = await searchParams;
  const [allProducts, categories] = await Promise.all([
    getActiveProducts(params.category),
    getActiveCategories(),
  ]);

  const selected = params.collection
    ? await prisma.storeCollection.findFirst({
        where: { slug: params.collection, isActive: true },
        include: {
          products: {
            orderBy: { sortOrder: "asc" },
            include: {
              product: {
                include: {
                  images: { where: { variantId: null }, orderBy: { isPrimary: "desc" }, take: 1 },
                  category: true,
                  categoryLinks: { include: { category: true } },
                },
              },
            },
          },
        },
      })
    : null;

  let products = selected
    ? selected.products.map((link) => link.product).filter((product) => product.isActive)
    : allProducts;

  if (selected && params.category) {
    const category = await prisma.category.findUnique({
      where: { slug: params.category },
      select: { id: true, isActive: true },
    });
    const ids = category?.isActive ? await getCategoryBranchIds(category.id) : [];
    products = products.filter(
      (product) =>
        (product.categoryId !== null && ids.includes(product.categoryId)) ||
        product.categoryLinks.some((link) => ids.includes(link.categoryId)),
    );
  }

  const query = params.q?.trim().toLowerCase();
  if (query) {
    products = products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query),
    );
  }

  const min = params.minPrice ? Math.max(0, Math.round(Number(params.minPrice) * 100)) : null;
  const max = params.maxPrice ? Math.max(0, Math.round(Number(params.maxPrice) * 100)) : null;
  if (min !== null && Number.isFinite(min)) products = products.filter((product) => product.pricePaise >= min);
  if (max !== null && Number.isFinite(max)) products = products.filter((product) => product.pricePaise <= max);

  if (params.sort === "price-asc") products = [...products].sort((a, b) => a.pricePaise - b.pricePaise);
  else if (params.sort === "price-desc") products = [...products].sort((a, b) => b.pricePaise - a.pricePaise);
  else if (params.sort === "name") products = [...products].sort((a, b) => a.name.localeCompare(b.name));
  else products = [...products].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const categoryOptions = categories;
  const clearHref = selected ? `/shop?collection=${encodeURIComponent(selected.slug)}` : "/shop";

  return (
    <main className="commerce-page shop-page">
      <div className="commerce-breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        {selected?.name ?? "Shop all"}
      </div>

      <header className="commerce-heading shop-heading">
        <p className="eyebrow">{selected ? "CURATED BY YOI KIJI" : "THE YOI KIJI COLLECTIONS"}</p>
        <h1>
          {selected ? selected.name : <>Considered comfort,<br /><em>for every room.</em></>}
        </h1>
        <p>{selected?.description ?? "Explore textiles chosen for the everyday moments that make a home."}</p>
      </header>

      <section className="shop-discovery" aria-label="Find pieces in the collection">
        <div className="shop-filter-heading">
          <div>
            <p className="eyebrow">A MORE CONSIDERED SEARCH</p>
            <h2>Find your piece</h2>
          </div>
          <p>Refine by collection, detail or price.</p>
        </div>

        <form className="shop-filter-form" action="/shop" method="get" role="search">
          {selected && <input type="hidden" name="collection" value={selected.slug} />}

          <label htmlFor="shop-search">
            <span>Search the collection</span>
            <input
              id="shop-search"
              type="search"
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Product name, detail or SKU"
              maxLength={120}
            />
          </label>

          <label htmlFor="shop-category">
            <span>Category</span>
            <select id="shop-category" name="category" defaultValue={params.category ?? ""}>
              <option value="">All categories</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.slug}>{category.parentId ? "— " : ""}{category.name}</option>
              ))}
            </select>
          </label>

          <label htmlFor="shop-min-price">
            <span>Minimum price <em>(₹)</em></span>
            <input
              id="shop-min-price"
              type="number"
              min="0"
              step="1"
              name="minPrice"
              inputMode="numeric"
              defaultValue={params.minPrice ?? ""}
              placeholder="No minimum"
            />
          </label>

          <label htmlFor="shop-max-price">
            <span>Maximum price <em>(₹)</em></span>
            <input
              id="shop-max-price"
              type="number"
              min="0"
              step="1"
              name="maxPrice"
              inputMode="numeric"
              defaultValue={params.maxPrice ?? ""}
              placeholder="No maximum"
            />
          </label>

          <label htmlFor="shop-sort">
            <span>Sort by</span>
            <select id="shop-sort" name="sort" defaultValue={params.sort ?? "newest"}>
              <option value="newest">Newest arrivals</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="name">Name A–Z</option>
            </select>
          </label>

          <div className="shop-filter-actions">
            <button type="submit">Apply filters</button>
            <Link href={clearHref}>Clear all</Link>
          </div>
        </form>
      </section>

      <div className="shop-results-bar" role="status" aria-live="polite">
        <p><strong>{products.length}</strong> {products.length === 1 ? "piece" : "pieces"} to discover</p>
        {query && <p>Showing results for <strong>“{params.q?.trim()}”</strong></p>}
      </div>

      {products.length ? (
        <section className="product-grid shop-product-grid" aria-label="Available products">
          {products.map((product) => (
            <Link className="product-card" href={"/products/" + product.slug} key={product.id}>
              <div className="product-card-image">
                {product.images[0] ? (
                  <img src={product.images[0].url} alt={product.images[0].alt || product.name} />
                ) : (
                  <span>YOI KIJI</span>
                )}
              </div>
              <p className="product-card-category">{product.category?.name ?? "YOI KIJI"}</p>
              <h2>{product.name}</h2>
              <p className="product-card-price">{formatINR(product.pricePaise)}</p>
            </Link>
          ))}
        </section>
      ) : (
        <section className="catalogue-empty shop-empty-state" aria-labelledby="shop-empty-title">
          <span className="empty-mark" aria-hidden="true">✳</span>
          <p className="eyebrow">A QUIETER MOMENT</p>
          <h2 id="shop-empty-title">No pieces match those filters.</h2>
          <p>Try a different search or clear a price range to explore the collection again.</p>
          <Link className="primary-link" href={clearHref}>Clear filters</Link>
        </section>
      )}
    </main>
  );
}
