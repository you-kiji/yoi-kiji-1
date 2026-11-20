import Link from "next/link";
import { SearchResults } from "@/components/search-results";
import { AdvancedSearch } from "@/components/advanced-search";
import { getLocaleData } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const locale = await getLocaleData();
  const term = q.trim().slice(0, 80);

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

        <AdvancedSearch compact labels={locale.labels} />     </header>

      {term && <SearchResults query={term} />}
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
