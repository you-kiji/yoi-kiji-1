import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveCategories, getActiveCategoryBySlug, getActiveProducts } from "@/lib/catalog";
import { formatINR } from "@/lib/money";
import { getLocaleData } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

type SearchParams = Record<string, string | string[] | undefined>;
type Props = { params: Promise<{ category: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const item = await getActiveCategoryBySlug(category);
  if (!item) return {};
  const locale = await getLocaleData();
  const translations = locale.code === "en" ? [] : await prisma.contentTranslation.findMany({ where: { localeCode: locale.code, entityType: "category", entityId: item.id, fieldKey: { in: ["name", "description", "seoTitle", "seoDescription"] } } });
  const text = new Map(translations.map(entry => [entry.fieldKey, entry.value]));
  return { title: text.get("seoTitle") ?? text.get("name") ?? item.seoTitle ?? item.name, description: text.get("seoDescription") ?? text.get("description") ?? item.seoDescription ?? item.description ?? undefined };
}

function asValues(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function displayValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ category }, query] = await Promise.all([params, searchParams]);
  const [item, categories, catalogueProducts] = await Promise.all([
    getActiveCategoryBySlug(category),
    getActiveCategories(),
    getActiveProducts(category),
  ]);
  if (!item) notFound();
  const locale = await getLocaleData();
  const t = (key: string, fallback: string) => locale.labels[key] ?? fallback;
  const translationTargets = [
    ...categories.map(category => ({ entityType: "category", entityId: category.id })),
    ...catalogueProducts.map(product => ({ entityType: "product", entityId: product.id })),
    ...catalogueProducts.flatMap(product => product.productType?.attributes.map(link => ({ entityType: "attribute", entityId: link.attribute.id })) ?? []),
  ];
  const translations = locale.code === "en" || !translationTargets.length ? [] : await prisma.contentTranslation.findMany({
    where: { localeCode: locale.code, OR: translationTargets.map(target => ({ entityType: target.entityType, entityId: target.entityId })) },
    select: { entityType: true, entityId: true, fieldKey: true, value: true },
  }).catch(() => []);
  const localized = new Map(translations.map(entry => [`${entry.entityType}:${entry.entityId}:${entry.fieldKey}`, entry.value]));
  const displayCategoryName = localized.get(`category:${item.id}:name`) ?? item.name;
  const displayCategoryDescription = localized.get(`category:${item.id}:description`) ?? item.description;

  const children = categories.filter(c => c.parentId === item.id).map(c => ({ ...c, name: localized.get(`category:${c.id}:name`) ?? c.name }));
  const siblings = categories.filter(c => c.parentId === item.parentId && c.id !== item.id).map(c => ({ ...c, name: localized.get(`category:${c.id}:name`) ?? c.name }));
  const ancestors: { name: string; slug: string }[] = [];
  let parentId = item.parentId;
  while (parentId) {
    const parent = categories.find(c => c.id === parentId);
    if (!parent || ancestors.some(a => a.slug === parent.slug)) break;
    ancestors.unshift({ name: localized.get(`category:${parent.id}:name`) ?? parent.name, slug: parent.slug });
    parentId = parent.parentId;
  }

  const facetsByKey = new Map<string, { key: string; name: string; unit: string | null; options: string[] }>();
  for (const product of catalogueProducts) {
    for (const link of product.productType?.attributes ?? []) {
      const attribute = link.attribute;
      if (!(link.isFilterable || attribute.isFilterable)) continue;
      const configured = Array.isArray(attribute.options) ? attribute.options.filter((value): value is string => typeof value === "string") : [];
      const currentValue = product.attributeValues.find(value => value.attributeId === attribute.id)?.value;
      const variantValues = attribute.isVariantAxis ? product.variants.flatMap(variant => {
        const attributes = variant.attributes;
        if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) return [];
        return [(attributes as Record<string, unknown>)[attribute.key]];
      }) : [];
      const observed = attribute.isVariantAxis
        ? variantValues.flatMap(value => value === null || value === undefined ? [] : Array.isArray(value) ? value.map(displayValue) : [displayValue(value)])
        : Array.isArray(currentValue) ? currentValue.map(displayValue) : currentValue === null || currentValue === undefined ? [] : [displayValue(currentValue)];
      const existing = facetsByKey.get(attribute.key);
      const options = existing?.options ?? [];
      const candidates = configured.length ? configured : observed;
      for (const option of candidates) if (!options.includes(option)) options.push(option);
      facetsByKey.set(attribute.key, { key: attribute.key, name: localized.get(`attribute:${attribute.id}:name`) ?? attribute.name, unit: attribute.unit, options });
    }
  }
  const facets = [...facetsByKey.values()].filter(facet => facet.options.length > 0).sort((a, b) => a.name.localeCompare(b.name));
  const activeFilters = Object.fromEntries(facets.map(facet => [facet.key, asValues(query[`f_${facet.key}`])]).filter(([, values]) => values.length > 0)) as Record<string, string[]>;

  const variantAxisKeys = new Set(catalogueProducts.flatMap(product =>
    product.productType?.attributes.filter(link => link.attribute.isVariantAxis).map(link => link.attribute.key) ?? []
  ));
  const parentFilters = Object.entries(activeFilters).filter(([key]) => !variantAxisKeys.has(key));
  const variantFilters = Object.entries(activeFilters).filter(([key]) => variantAxisKeys.has(key));
  let products = catalogueProducts.filter(product => {
    const matchesParentAttributes = parentFilters.every(([key, selected]) => {
      const value = product.attributeValues.find(item => item.attribute.key === key)?.value;
      const values = Array.isArray(value) ? value.map(displayValue) : value === null || value === undefined ? [] : [displayValue(value)];
      return selected.some(option => values.includes(option));
    });
    if (!matchesParentAttributes) return false;
    if (!variantFilters.length) return true;
    return product.variants.some(variant => {
      const attributes = variant.attributes && typeof variant.attributes === "object" && !Array.isArray(variant.attributes)
        ? variant.attributes as Record<string, unknown>
        : {};
      return variantFilters.every(([key, selected]) => {
        const value = attributes[key];
        const values = Array.isArray(value) ? value.map(displayValue) : value === null || value === undefined ? [] : [displayValue(value)];
        return selected.some(option => values.includes(option));
      });
    });
  });

  const sort = typeof query.sort === "string" ? query.sort : "newest";
  products = [...products].sort((a, b) => {
    if (sort === "price-asc") return a.pricePaise - b.pricePaise;
    if (sort === "price-desc") return b.pricePaise - a.pricePaise;
    if (sort === "name") return a.name.localeCompare(b.name);
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return <main className="commerce-page">
    <div className="commerce-breadcrumb"><Link href="/">{t("common.home","Home")}</Link><span>/</span><Link href="/shop">{t("common.shop","Shop")}</Link>{ancestors.map(a=><span key={a.slug}>/ <Link href={`/shop/${a.slug}`}>{a.name}</Link></span>)}<span>/</span> {displayCategoryName}</div>
    <header className="commerce-heading commerce-heading--catalogue">
      <p className="eyebrow">{t("category.eyebrow","YOI KIJI / THE COLLECTION")}</p>
      <h1>{displayCategoryName}</h1>
      {displayCategoryDescription && <p className="catalogue-intro-copy">{displayCategoryDescription}</p>}
    </header>
    {children.length > 0 && <section className="category-subcollections category-subcollections--compact">
      <p className="eyebrow">{t("category.explore","EXPLORE THIS COLLECTION")}</p>
      <nav className="category-pills" aria-label={`Browse ${displayCategoryName} subcategories`}>{children.map(child=><Link key={child.id} href={`/shop/${child.slug}`}>{child.name}</Link>)}</nav>
    </section>}
    {siblings.length > 0 && <nav className="category-pills category-pills--related" aria-label="Related categories">{siblings.map(c=><Link key={c.id} href={`/shop/${c.slug}`}>{c.name}</Link>)}</nav>}
    <div className="catalogue-layout">
      {facets.length > 0 && <aside className="catalogue-filter-sidebar" aria-label={t("category.refine","Filter products")}>
        <form method="get" className="catalogue-filters">
          <div className="catalogue-filter-heading">
            <p className="eyebrow">{t("category.refine","FILTER PRODUCTS")}</p>
            <Link href={`/shop/${item.slug}`}>{t("category.clearFilters","Clear all")}</Link>
          </div>
          <input type="hidden" name="sort" value={sort}/>
          <div className="catalogue-filter-grid">{facets.map(facet => <fieldset key={facet.key}>
            <legend>{facet.name}{facet.unit ? ` · ${facet.unit}` : ""}</legend>
            {facet.options.map(option => <label key={option}><input type="checkbox" name={`f_${facet.key}`} value={option} defaultChecked={activeFilters[facet.key]?.includes(option) ?? false}/><span>{option}</span></label>)}
          </fieldset>)}</div>
          <button className="catalogue-apply-button" type="submit">{t("shop.applyFilters","Apply filters")}</button>
        </form>
      </aside>}
      <section className="catalogue-results" aria-label={t("shop.products","Products")}>
        <div className="catalogue-toolbar">
          <p>{products.length} {products.length === 1 ? t("shop.piece","piece") : t("shop.pieces","pieces")}</p>
          <form method="get" className="catalogue-sort">
            {Object.entries(activeFilters).flatMap(([key, values]) => values.map(value => <input key={key + value} type="hidden" name={`f_${key}`} value={value}/>))}
            <label>{t("shop.sortBy","Sort by")} <select name="sort" defaultValue={sort}><option value="newest">{t("shop.newest","Newest")}</option><option value="price-asc">{t("shop.priceLow","Price: low to high")}</option><option value="price-desc">{t("shop.priceHigh","Price: high to low")}</option><option value="name">{t("shop.nameSort","Name")}</option></select></label>
            <button type="submit">{t("shop.sortBy","Sort")}</button>
          </form>
        </div>
        {products.length ? <section className="product-grid catalogue-product-grid">{products.map(p=><Link className="product-card" href={`/products/${p.slug}`} key={p.id}>
          <div className="product-card-image">{p.images[0] ? <img src={p.images[0].url} alt={p.images[0].alt} loading="lazy" decoding="async"/> : <span>YOI KIJI</span>}</div>
          <p className="product-card-category">{displayCategoryName}</p>
          <h2>{localized.get(`product:${p.id}:name`) ?? p.name}</h2>
          <p className="product-card-price">{formatINR(p.pricePaise)}</p>
        </Link>)}</section> : <section className="catalogue-empty"><span className="empty-mark">✳</span><h2>{catalogueProducts.length ? t("category.noFilterMatches","No pieces match these filters.") : t("category.comingSoon","Something thoughtful is on its way.")}</h2><p>{catalogueProducts.length ? t("category.removeFilters","Try removing one or more filters to see more of this collection.") : t("category.preparing",`We are preparing the ${displayCategoryName.toLowerCase()} collection. In the meantime, explore the other collections.`)}</p><Link className="primary-link" href={catalogueProducts.length ? `/shop/${item.slug}` : "/shop"}>{catalogueProducts.length ? t("category.clearFilters","Clear filters") : t("shop.allCollections","Explore all collections")} <span>↗</span></Link></section>}
      </section>
    </div>
  </main>;
}
