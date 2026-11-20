import Link from "next/link";
import { AdvancedSearch } from "@/components/advanced-search";
import { SearchResults } from "@/components/search-results";
import { getLocaleData } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const locale = await getLocaleData();
  const term = q.trim().slice(0, 80);
  return (
    <main className="commerce-page search-page">
      <div className="commerce-breadcrumb"><Link href="/">Home</Link><span>/</span>Search</div>
      <header className="commerce-heading search-heading">
        <p className="eyebrow">{locale.labels["search.label"] ?? "FIND YOUR FAVOURITE FEEL"}</p>
        <h1>{locale.labels["home.searchTitle"] ?? <>Search the<br/><em>collections.</em></>}</h1>
        <p>{locale.labels["search.hint"] ?? "Find the textures, colours and considered details you have in mind."}</p>
        <AdvancedSearch compact labels={locale.labels}/>
      </header>
      {term && <SearchResults query={term} labels={locale.labels}/>}
    </main>
  );
}
