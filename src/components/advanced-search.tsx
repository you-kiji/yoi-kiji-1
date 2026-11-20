"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

type Result = {
  id: string; name: string; slug: string; sku: string; category: string;
  pricePaise: number; image: { url: string; alt: string } | null;
};
type SearchResponse = { products: Result[]; categories: { id: string; name: string; slug: string }[]; suggestions: string[]; totalMatches: number };

const RECENT_KEY = "yk-recent-searches-v1";

function formatPrice(paise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
}

export function AdvancedSearch({ compact = false, labels = {} }: { compact?: boolean; labels?: Record<string,string> }) {
  const text = (key: string, fallback: string) => labels[key] ?? fallback;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [popular, setPopular] = useState<{id:string;name:string;slug:string}[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try { setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]").slice(0, 5)); } catch { setRecent([]); }
    fetch("/api/search?popular=1").then(response=>response.ok?response.json():null).then(data=>{if(data?.categories)setPopular(data.categories);}).catch(()=>{});
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) { setResults(null); setLoading(false); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: controller.signal, headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error("Search unavailable");
        setResults(await response.json());
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setResults(null);
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  function remember(term: string) {
    const value = term.trim().slice(0, 80);
    if (!value) return;
    const next = [value, ...recent.filter(item => item.toLowerCase() !== value.toLowerCase())].slice(0, 5);
    setRecent(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* Private browsing storage may be unavailable. */ }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) { input.current?.focus(); return; }
    remember(query);
    window.location.assign(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  const items = [
    ...(results?.products ?? []).map(item => ({ label: item.name, href: `/products/${item.slug}` })),
    ...(results?.categories ?? []).map(item => ({ label: item.name, href: `/shop/${item.slug}` })),
  ];

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") { event.preventDefault(); setActive(value => Math.min(value + 1, items.length - 1)); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActive(value => Math.max(value - 1, 0)); }
    if (event.key === "Enter" && active >= 0 && items[active]) { event.preventDefault(); window.location.assign(items[active].href); }
  }

  return (
    <div className={`advanced-search ${compact ? "advanced-search--compact" : ""}`} ref={root}>
      <form role="search" onSubmit={submit} className="advanced-search__form">
        <label className="advanced-search__label" htmlFor={compact ? "yk-search-compact" : "yk-search-main"}>{text("search.label","Search the collection")}</label>
        <div className="advanced-search__control">
          <span aria-hidden="true" className="advanced-search__icon">⌕</span>
          <input
            ref={input}
            id={compact ? "yk-search-compact" : "yk-search-main"}
            type="search"
            value={query}
            onChange={event => { setQuery(event.target.value); setOpen(true); setActive(-1); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={text("search.placeholder","Search products, categories, materials or SKU")}
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={open && query.trim().length >= 2}
            aria-controls="yk-search-suggestions"
          />
          {query && <button type="button" className="advanced-search__clear" onClick={() => { setQuery(""); setResults(null); input.current?.focus(); }} aria-label="Clear search">×</button>}
          <button className="advanced-search__submit" type="submit">{text("search.button","Search")}</button>
        </div>
        <p className="advanced-search__hint">{text("search.hint","Search by product name, SKU, category, colour, material or product specifications.")}</p>
      </form>

      {open && query.trim().length >= 2 && (
        <div className="advanced-search__panel" id="yk-search-suggestions" role="listbox" aria-label="Search suggestions">
          <div className="advanced-search__panel-heading"><span>{loading ? "Searching…" : results?.products.length ? "Suggested pieces" : "Search suggestions"}</span>{results && <small>{results.totalMatches} matching pieces</small>}</div>
          {results?.products.map((item, index) => (
            <Link key={item.id} href={`/products/${item.slug}`} role="option" aria-selected={active === index} className="advanced-search__result" onClick={() => { remember(query); setOpen(false); }}>
              {item.image ? <img src={item.image.url} alt={item.image.alt || item.name} /> : <span className="advanced-search__placeholder">YK</span>}
              <span><strong>{item.name}</strong><small>{item.category} · {item.sku}</small></span>
              <b>{formatPrice(item.pricePaise)}</b>
            </Link>
          ))}
          {results?.categories.map((item, index) => (
            <Link key={item.id} href={`/shop/${item.slug}`} role="option" aria-selected={active === (results?.products.length ?? 0) + index} className="advanced-search__category" onClick={() => { remember(query); setOpen(false); }}>
              <span>Collection</span><strong>{item.name}</strong>
            </Link>
          ))}
          {!loading && results && !results.products.length && !results.categories.length && <p className="advanced-search__empty">{text("search.noMatches","No exact matches. Try a material, colour or a shorter phrase.")}</p>}
          <button type="button" className="advanced-search__all" onClick={() => { remember(query); window.location.assign(`/search?q=${encodeURIComponent(query.trim())}`); }}>{text("search.viewAll","View all search results")}</button>
        </div>
      )}

      {open && query.trim().length < 2 && recent.length > 0 && (
        <div className="advanced-search__panel advanced-search__recent">
          <div className="advanced-search__panel-heading"><span>{text("search.recent","Recent searches")}</span><button type="button" onClick={() => { setRecent([]); try { localStorage.removeItem(RECENT_KEY); } catch {} }}>Clear</button></div>
          {recent.map(item => <button type="button" key={item} onClick={() => { setQuery(item); setOpen(true); }}>{item}</button>)}
        </div>
      )}
      {open && query.trim().length < 2 && recent.length === 0 && popular.length > 0 && (
        <div className="advanced-search__panel advanced-search__recent">
          <div className="advanced-search__panel-heading"><span>{text("search.popular","Popular collections")}</span></div>
          {popular.map(item => <Link key={item.id} href={`/shop/${item.slug}`} onClick={()=>setOpen(false)}>{item.name}</Link>)}
        </div>
      )}
    </div>
  );
}
