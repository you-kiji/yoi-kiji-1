import "../../reviews-wishlist.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AdminReviewManager } from "@/components/admin-review-manager";
export const dynamic="force-dynamic";
export default async function AdminReviewsPage(){
 const admin=await requireAdmin();if(!admin)redirect("/admin/login");if(admin.role!=="ADMIN")redirect("/admin");
 const reviews=await prisma.review.findMany({include:{user:{select:{name:true,email:true}},product:{select:{name:true,slug:true,sku:true}}},orderBy:{createdAt:"desc"},take:500});
 return <main className="commerce-page"><div className="commerce-breadcrumb"><Link href="/admin">Admin</Link><span>/</span> Reviews</div><header className="commerce-heading"><p className="eyebrow">CUSTOMER VOICE / TRUST & PROOF</p><h1>Let good words<br/><em>be heard.</em></h1><p>Moderate verified-purchase reviews before they appear on the storefront.</p></header><AdminReviewManager initialReviews={reviews.map(r=>({...r,createdAt:r.createdAt.toISOString()}))}/></main>;
}
