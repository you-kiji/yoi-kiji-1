import Link from "next/link";
import { getActiveProducts } from "@/lib/catalog";
import { formatINR } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const term = q.trim().slice(0, 80);
  const all = term ? await getActiveProducts() : [];
  const products = all.filter((product) =>
    (product.name + " " + product.description + " " + (product.category?.name ?? ""))
      .toLowerCase()
      .includes(term.toLowerCase()),
  );

  return (
    <main className="commerce-page search-page">
      <div className="commerce-breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        Search
      </div>

      <header className="commerce-heading search-heading">
        <p className="eyebrow">FIND YOUR FAVOURITE FEEL</p>
        <h1>Search the<br /><em>collections.</em></h1>
        <p>Find the textures, colours and considered details you have in mind.</p>

        <form className="search-form premium-search-form" role="search" action="/search" method="get">
          <label htmlFor="site-search">What are you looking for?</label>
          <div className="search-form-controls">
            <input
              id="site-search"
              type="search"
              name="q"
              maxLength={80}
              defaultValue={term}
              placeholder="Try bedsheets, curtains, bath linen…"
              autoComplete="off"
            />
            <button className="primary-link" type="submit">Search</button>
          </div>
        </form>
      </header>

      {term && (
        <>
          <p className="search-count" role="status" aria-live="polite">
            {products.length} {products.length === 1 ? "result" : "results"} for “{term}”
          </p>

          {products.length ? (
            <section className="product-grid search-product-grid" aria-label="Search results">
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
            <section className="catalogue-empty account-empty-state">
              <p className="eyebrow">NOT FOUND THIS TIME</p>
              <h2>No matching pieces yet.</h2>
              <p>Try another search or browse the full collection to discover something different.</p>
              <Link className="primary-link" href="/shop">Shop all</Link>
            </section>
          )}
        </>
      )}
    </main>
  );
}
