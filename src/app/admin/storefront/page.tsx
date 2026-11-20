import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AdminStorefrontManager } from "@/components/admin-storefront-manager";
import { StorefrontThemeBuilder } from "@/components/storefront-theme-builder";
import { SocialAccountManager } from "@/components/admin-social-account-manager";
export const dynamic="force-dynamic";
export const metadata={title:"Storefront content studio · YOI KIJI"};
export default async function AdminStorefrontPage(){
 const admin=await requireAdmin();if(!admin)redirect("/admin/login");if(admin.role!=="ADMIN")redirect("/admin");
 const [sections,collections,products]=await Promise.all([
  prisma.homepageSection.findMany({orderBy:[{position:"asc"},{key:"asc"}]}),
  prisma.storeCollection.findMany({include:{products:{include:{product:{select:{id:true,name:true,sku:true}}}},_count:{select:{products:true}}},orderBy:[{sortOrder:"asc"},{name:"asc"}]}),
  prisma.product.findMany({where:{isActive:true},select:{id:true,name:true,sku:true},orderBy:{name:"asc"},take:300})
 ]);
 return <main className="commerce-page"><div className="commerce-breadcrumb"><Link href="/admin">Admin</Link><span>/</span> Storefront studio</div><header className="commerce-heading"><p className="eyebrow">BRAND & MERCHANDISING</p><h1>Shape the<br/><em>storefront.</em></h1><p>Control homepage storytelling, campaign imagery and curated product collections without editing code.</p></header><nav className="storefront-admin-shortcuts" aria-label="Storefront content settings"><Link href="/admin/languages">Languages & translations</Link><Link href="/admin/legal">Legal pages & policies</Link><Link href="/admin/media">Media library</Link><Link href="/admin/seo">SEO settings</Link></nav><StorefrontThemeBuilder/><SocialAccountManager/><AdminStorefrontManager initialSections={sections} initialCollections={collections} products={products}/></main>;
}
