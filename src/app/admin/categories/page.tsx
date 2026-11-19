import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { AdminCategoryManager } from "@/components/admin-category-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Category management" };

export default async function AdminCategoriesPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.role !== "ADMIN") redirect("/admin");
  return <main className="commerce-page">
    <div className="commerce-breadcrumb"><Link href="/admin">Admin</Link><span>/</span> Categories</div>
    <header className="commerce-heading"><p className="eyebrow">CATALOGUE ARCHITECTURE</p><h1>Every layer,<br/><em>in its place.</em></h1><p>Create and organise the YOI KIJI catalogue. Category depth is not limited.</p></header>
    <AdminCategoryManager />
  </main>;
}
