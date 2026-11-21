import "../../admin-insights.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
export const dynamic="force-dynamic";
export default async function AdminSeoPage(){
 const admin=await requireAdmin();if(!admin)redirect("/admin/login");if(admin.role!=="ADMIN")redirect("/admin");
 const [products,categories]=await Promise.all([
  prisma.product.findMany({where:{isActive:true},select:{id:true,name:true,slug:true,seoTitle:true,seoDescription:true,seoKeywords:true,canonicalUrl:true,noIndex:true,images:{select:{alt:true,url:true},orderBy:{position:"asc"}}},orderBy:{name:"asc"},take:1000}),
  prisma.category.findMany({where:{isActive:true},select:{id:true,name:true,slug:true,seoTitle:true,seoDescription:true},orderBy:{name:"asc"},take:500})
 ]);
 const issues=products.map(p=>({id:p.id,name:p.name,slug:p.slug,missing:[!p.seoTitle?"SEO title":null,!p.seoDescription?"SEO description":null,!p.seoKeywords.length?"Keywords":null,!p.images.length?"Product image":null,p.images.some(i=>!i.alt.trim())?"Image alt text":null,p.noIndex?"No-index enabled":null].filter(Boolean) as string[]})).filter(p=>p.missing.length);
 const categoryIssues=categories.filter(c=>!c.seoTitle||!c.seoDescription);
 const total=products.length+categories.length,complete=total-issues.length-categoryIssues.length,score=total?Math.round(complete/total*100):100;
 return <main className="commerce-page"><div className="commerce-breadcrumb"><Link href="/admin">Admin</Link><span>/</span> SEO audit</div><header className="commerce-heading"><p className="eyebrow">DISCOVERABILITY / TECHNICAL CONTENT</p><h1>Be found for<br/><em>what matters.</em></h1><p>Review product and category metadata, image accessibility and indexing settings. This is a content audit, not a live Google ranking report.</p></header>
  <section className="admin-stats"><article><span>Metadata coverage</span><strong>{score}%</strong><small>{complete} of {total} catalogue records complete</small></article><article><span>Products needing work</span><strong>{issues.length}</strong><small>Out of {products.length} published products</small></article><article><span>Categories needing work</span><strong>{categoryIssues.length}</strong><small>Out of {categories.length} active categories</small></article><article><span>No-index products</span><strong>{products.filter(p=>p.noIndex).length}</strong><small>Excluded from search indexing</small></article></section>
  <section className="admin-report-panel"><div className="admin-section-heading"><h2>Product SEO issues</h2><Link className="text-link" href="/admin/products">Open product editor ↗</Link></div>{issues.length?issues.map(p=><article className="admin-seo-row" key={p.id}><div><strong><Link href={"/admin/products/"+p.id}>{p.name}</Link></strong><small>/{p.slug}</small><p>{p.missing.join(" · ")}</p></div><Link href={"/admin/products/"+p.id}>Open product details</Link></article>):<p>All published products have the tracked SEO fields completed.</p>}</section>
  <section className="admin-report-panel"><div className="admin-section-heading"><h2>Category SEO issues</h2><Link className="text-link" href="/admin/categories">Open category manager ↗</Link></div>{categoryIssues.length?categoryIssues.map(c=><article className="admin-seo-row" key={c.id}><div><strong>{c.name}</strong><small>/{c.slug}</small><p>{[!c.seoTitle?"SEO title":null,!c.seoDescription?"SEO description":null].filter(Boolean).join(" · ")}</p></div><Link href={"/admin/categories/"+c.id}>Open category details</Link></article>):<p>All active categories have SEO titles and descriptions.</p>}</section>
 </main>;
}
