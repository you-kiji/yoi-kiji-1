import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AdminLanguageManager } from "@/components/admin-language-manager";
export const dynamic="force-dynamic";
export const metadata={title:"Languages & translations · YOI KIJI Admin"};
export default async function AdminLanguagesPage(){const admin=await requireAdmin();if(!admin)redirect("/admin/login");if(admin.role!=="ADMIN")redirect("/admin");const locales=await prisma.locale.findMany({include:{_count:{select:{translations:true}}},orderBy:[{sortOrder:"asc"},{name:"asc"}]});return <main className="commerce-page"><div className="commerce-breadcrumb"><Link href="/admin">Admin</Link><span>/</span> Languages</div><header className="commerce-heading"><p className="eyebrow">GLOBAL STOREFRONT</p><h1>Speak every<br/><em>language.</em></h1><p>Manage enabled locales and content translations. English and Japanese are provisioned by the database migration; new languages can be added without changing application code.</p></header><AdminLanguageManager initialLocales={locales}/></main>;}