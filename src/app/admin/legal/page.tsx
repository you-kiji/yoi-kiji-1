import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AdminLegalManager } from "@/components/admin-legal-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Legal pages · YOI KIJI Admin" };

export default async function AdminLegalPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.role !== "ADMIN") redirect("/admin");
  const pages = await prisma.legalPage.findMany({ include: { _count: { select: { revisions: true } } }, orderBy: { updatedAt: "desc" } });
  return <main className="commerce-page"><div className="commerce-breadcrumb"><Link href="/admin">Admin</Link><span>/</span> Legal pages</div><header className="commerce-heading"><p className="eyebrow">POLICY & COMPLIANCE CONTENT</p><h1>Legal, made<br/><em>manageable.</em></h1><p>Create, edit, publish and archive storefront policies without code changes. Every meaningful content update keeps a revision snapshot.</p></header><AdminLegalManager initialPages={pages}/></main>;
}
