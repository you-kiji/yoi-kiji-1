import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AdminPromotionManager } from "@/components/admin-promotion-manager";
export const dynamic="force-dynamic";
export const metadata={title:"Promotions · YOI KIJI"};
export default async function AdminPromotionsPage(){
 const admin=await requireAdmin();if(!admin)redirect("/admin/login");if(admin.role!=="ADMIN")redirect("/admin");
 const coupons=await prisma.coupon.findMany({include:{_count:{select:{redemptions:true}}},orderBy:{createdAt:"desc"},take:200});
 return <main className="commerce-page"><div className="commerce-breadcrumb"><Link href="/admin">Admin</Link><span>/</span> Promotions</div><header className="commerce-heading"><p className="eyebrow">CAMPAIGNS & CONVERSION</p><h1>Make every<br/><em>offer count.</em></h1><p>Create scheduled discount codes and track their use at checkout.</p></header><AdminPromotionManager initialCoupons={coupons.map(c=>({...c,startsAt:c.startsAt?.toISOString()??null,endsAt:c.endsAt?.toISOString()??null}))}/></main>;
}
