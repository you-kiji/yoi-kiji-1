import { getActiveCategories } from "@/lib/catalog";
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
  return <SiteHeaderClient categories={roots} labels={locale.labels} />;
}
