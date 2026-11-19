import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { AdminMediaLibrary } from "@/components/admin-media-library";
export const dynamic = "force-dynamic";
export const metadata = { title: "Media library · YOI KIJI" };
export default async function MediaPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.role !== "ADMIN") redirect("/admin");
  return <main className="commerce-page">
    <div className="commerce-breadcrumb"><Link href="/admin">Admin</Link><span>/</span> Media library</div>
    <header className="commerce-heading"><p className="eyebrow">CREATIVE ASSET MANAGEMENT</p><h1>One library.<br/><em>Every story.</em></h1><p>Upload and organise reusable product photography, editorial images, audio and video. Assets are stored in Cloudinary and indexed here for the team.</p></header>
    <AdminMediaLibrary />
  </main>;
}