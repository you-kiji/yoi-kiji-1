import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getActiveCategories, getActiveProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const [categories, products, articles] = await Promise.all([
    getActiveCategories(),
    getActiveProducts(),
    prisma.blogPost.findMany({
      where: { status: "PUBLISHED", publishedAt: { lte: new Date() }, noIndex: false },
      select: { slug: true, updatedAt: true, publishedAt: true },
      orderBy: { publishedAt: "desc" },
      take: 5000,
    }),
  ]);
  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: base + "/shop", lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: base + "/journal", lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    ...categories.map((category) => ({
      url: base + "/shop/" + category.slug,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products.map((product) => ({
      url: base + "/products/" + product.slug,
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...articles.map((article) => ({
      url: base + "/journal/" + article.slug,
      lastModified: article.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
