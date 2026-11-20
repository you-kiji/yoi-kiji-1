import { getActiveCategories } from "@/lib/catalog";
import { SiteHeaderClient } from "@/components/site-header-client";

const fallbackCategories = [
  { id: "fallback-bedsheets", name: "Bedsheets", slug: "bedsheets", parentId: null, showInMenu: true },
  { id: "fallback-curtains", name: "Curtains", slug: "curtains", parentId: null, showInMenu: true },
  { id: "fallback-upholstery", name: "Upholstery", slug: "upholstery", parentId: null, showInMenu: true },
  { id: "fallback-bath-linen", name: "Bath linen", slug: "bath-linen", parentId: null, showInMenu: true },
  { id: "fallback-kitchen-linen", name: "Kitchen linen", slug: "kitchen-linen", parentId: null, showInMenu: true },
];

export async function SiteHeader() {
  let categories: Awaited<ReturnType<typeof getActiveCategories>> = [];
  try {
    categories = await getActiveCategories();
  } catch {
    // Keep navigation available when catalogue data is temporarily unavailable.
  }
  const roots = (categories.length ? categories : fallbackCategories)
    .filter(category => category.showInMenu)
    .map(({ id, name, slug }) => ({ id, name, slug }));

  return <SiteHeaderClient categories={roots} />;
}
