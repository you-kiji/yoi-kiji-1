import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchableProduct = {
  id: string; name: string; slug: string; sku: string; description: string; translatedName?: string; translatedDescription?: string;
  material: string | null; color: string | null; seoKeywords: string[];
  pricePaise: number; category: { id: string; name: string } | null;
  images: { url: string; alt: string }[];
  attributeValues: { value: unknown; attribute: { id: string; name: string; key: string } }[];
};

function normalise(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();
}

function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[b.length];
}

function scoreProduct(product: SearchableProduct, query: string) {
  const fields = [
    { value: product.translatedName ? product.name + " " + product.translatedName : product.name, weight: 12 },
    { value: product.sku, weight: 11 },
    { value: product.category?.name ?? "", weight: 8 },
    { value: product.material ?? "", weight: 6 },
    { value: product.color ?? "", weight: 5 },
    { value: product.seoKeywords.join(" "), weight: 5 },
    { value: product.translatedDescription ? product.description + " " + product.translatedDescription : product.description, weight: 2 },
    { value: product.attributeValues.map(item => `${item.attribute.name} ${item.attribute.key} ${JSON.stringify(item.value)}`).join(" "), weight: 4 },
  ];
  const terms = query.split(" ").filter(Boolean);
  let score = 0;
  for (const term of terms) {
    let best = 0;
    for (const field of fields) {
      const value = normalise(field.value);
      if (!value) continue;
      if (value === term) best = Math.max(best, field.weight + 8);
      else if (value.startsWith(term)) best = Math.max(best, field.weight + 5);
      else if (value.includes(term)) best = Math.max(best, field.weight + 2);
      else if (term.length >= 4) {
        const near = value.split(" ").some(word => word.length >= 4 && editDistance(word, term) <= (term.length > 7 ? 2 : 1));
        if (near) best = Math.max(best, field.weight);
      }
    }
    score += best;
  }
  return score;
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("q") ?? "";
  const query = normalise(raw).slice(0, 80);
  if (request.nextUrl.searchParams.get("popular") === "1") {
    const categories = await prisma.category.findMany({ where: { isActive: true, showInMenu: true }, select: { id: true, name: true, slug: true }, orderBy: { sortOrder: "asc" }, take: 6 });
    const localeCode = request.cookies.get("yk-locale")?.value ?? (await prisma.locale.findFirst({ where: { isDefault: true, isEnabled: true }, select: { code: true } }).catch(() => null))?.code ?? "en";
    const translations = localeCode === "en" ? [] : await prisma.contentTranslation.findMany({ where: { localeCode, entityType: "category", entityId: { in: categories.map(item => item.id) }, fieldKey: "name" }, select: { entityId: true, value: true } }).catch(() => []);
    const names = new Map(translations.map(item => [item.entityId, item.value]));
    return NextResponse.json({ categories: categories.map(item => ({ ...item, name: names.get(item.id) ?? item.name })), products: [], suggestions: [] }, { headers: { "Cache-Control": "private, no-store" } });
  }
  if (query.length < 2) return NextResponse.json({ query, products: [], categories: [], suggestions: [] }, { headers: { "Cache-Control": "private, no-store" } });

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true, slug: true, sku: true, description: true, material: true, color: true,
        seoKeywords: true, pricePaise: true, category: { select: { id: true, name: true } },
        images: { where: { variantId: null }, orderBy: [{ isPrimary: "desc" }, { position: "asc" }], take: 1, select: { url: true, alt: true } },
        attributeValues: { select: { value: true, attribute: { select: { id: true, name: true, key: true } } } },
      },
      take: 1500,
    }) as Promise<SearchableProduct[]>,
    prisma.category.findMany({ where: { isActive: true }, select: { id: true, name: true, slug: true }, orderBy: { sortOrder: "asc" }, take: 100 }),
  ]);

  const localeCode = request.cookies.get("yk-locale")?.value ?? "en";
  const translationTargets = [
    ...products.map(product => ({ entityType: "product", entityId: product.id })),
    ...categories.map(category => ({ entityType: "category", entityId: category.id })),
    ...products.flatMap(product => product.attributeValues.map(item => ({ entityType: "attribute", entityId: item.attribute.id }))),
  ];
  const translations = localeCode === "en" || !translationTargets.length ? [] : await prisma.contentTranslation.findMany({
    where: { localeCode, OR: translationTargets.map(target => ({ entityType: target.entityType, entityId: target.entityId })) },
    select: { entityType: true, entityId: true, fieldKey: true, value: true },
  }).catch(() => []);
  const translated = new Map(translations.map(item => [`${item.entityType}:${item.entityId}:${item.fieldKey}`, item.value]));
  const localizedProducts = products.map(product => ({
    ...product,
    translatedName: translated.get(`product:${product.id}:name`),
    translatedDescription: translated.get(`product:${product.id}:description`),
    material: translated.get(`product:${product.id}:material`) ?? product.material,
    color: translated.get(`product:${product.id}:color`) ?? product.color,
    attributeValues: product.attributeValues.map(item => ({ value: translated.get(`product:${product.id}:attribute_${item.attribute.key}`) ?? item.value, attribute: { ...item.attribute, name: translated.get(`attribute:${item.attribute.id}:name`) ?? item.attribute.name } })),
    category: product.category ? { ...product.category, name: translated.get(`category:${product.category.id}:name`) ?? product.category.name } : null,
  }));

  const ranked = localizedProducts
    .map(product => ({ product, score: scoreProduct(product, query) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name))
    .slice(0, request.nextUrl.searchParams.get("full") === "1" ? 60 : 8)
    .map(({ product, score }) => ({ id: product.id, name: product.translatedName ?? product.name, slug: product.slug, sku: product.sku, category: product.category?.name ?? "YOI KIJI", pricePaise: product.pricePaise, image: product.images[0] ?? null, score }));

  const categoryMatches = categories
    .map(category => { const name = translated.get(`category:${category.id}:name`) ?? category.name; return { ...category, name, score: scoreProduct({ id: category.id, name, slug: category.slug, sku: "", description: "", material: null, color: null, seoKeywords: [], pricePaise: 0, category: null, images: [], attributeValues: [] }, query) }; })
    .filter(category => category.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, request.nextUrl.searchParams.get("full") === "1" ? 20 : 4);

  const suggestions = [...new Set([
    ...ranked.slice(0, 4).map(item => item.name),
    ...categoryMatches.map(item => item.name),
  ])].slice(0, 6);

  return NextResponse.json(
    { query, products: ranked, categories: categoryMatches, suggestions, totalMatches: ranked.length },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
