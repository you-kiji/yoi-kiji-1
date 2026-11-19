import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { AdminProductTypeManager } from "@/components/admin-product-type-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Product types & attributes" };

export default async function AdminProductTypesPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.role !== "ADMIN") redirect("/admin");
  return <main className="commerce-page">
    <div className="commerce-breadcrumb"><Link href="/admin">Admin</Link><span>/</span> Product types</div>
    <header className="commerce-heading"><p className="eyebrow">PRODUCT DATA ARCHITECTURE</p><h1>Every product,<br/><em>its own language.</em></h1><p>Define product-specific fields, units, filters and variant options.</p></header>
    <AdminProductTypeManager />
  </main>;
}
