import { getActiveCategories } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { SiteHeaderClient } from "@/components/site-header-client";
import { getLocaleData } from "@/lib/i18n";



export async function SiteHeader() {
  let categories: Awaited<ReturnType<typeof getActiveCategories>> = [];
  try {
    categories = await getActiveCategories();
  } catch {
    // Keep navigation available when catalogue data is temporarily unavailable.
  }
  const roots = categories
    .filter(category => category.showInMenu)
    .map(({ id, name, slug }) => ({ id, name, slug }));

  const locale = await getLocaleData();
  const categoryTranslations = locale.code === "en" ? [] : await prisma.contentTranslation.findMany({ where: { localeCode: locale.code, entityType: "category", entityId: { in: roots.map(item => item.id) }, fieldKey: "name" }, select: { entityId: true, value: true } }).catch(() => []);
  const names = new Map(categoryTranslations.map(item => [item.entityId, item.value]));
  const localizedRoots = roots.map(item => ({ ...item, name: names.get(item.id) ?? item.name }));
  return <SiteHeaderClient categories={localizedRoots} labels={locale.labels} />;
}
