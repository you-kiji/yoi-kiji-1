import Link from "next/link";
import { AdvancedSearch } from "@/components/advanced-search";
import { SearchResults } from "@/components/search-results";
import { getLocaleData } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getLocaleData();
  return { title: locale.labels["seo.searchTitle"] ?? "Search", description: locale.labels["seo.searchDescription"] ?? "Search YOI KIJI products, collections and materials." };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const locale = await getLocaleData();
  const term = q.trim().slice(0, 80);

  return (
    <main className="page">
      <div className="page-content">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span className="separator">/</span>
          <span className="current">Search</span>
        </nav>

        <header className="page-header">
          <p className="section-eyebrow">{locale.labels["search.label"] ?? "FIND YOUR FAVOURITE FEEL"}</p>
          <h1>{locale.labels["home.searchTitle"] ?? <>Search the<br/><em>collections.</em></>}</h1>
          <p>{locale.labels["search.hint"] ?? "Find the textures, colours and considered details you have in mind."}</p>
        </header>

        <div style={{ maxWidth: '600px', margin: 'var(--space-xl) auto 0' }}>
          <AdvancedSearch compact labels={locale.labels} />
        </div>

        {term && <SearchResults query={term} labels={locale.labels} />}
      </div>
    </main>
  );
}