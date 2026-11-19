import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AdminStockAlertManager } from "@/components/admin-stock-alert-manager";
export const dynamic="force-dynamic";
export default async function AdminStockAlertsPage(){
 const admin=await requireAdmin();if(!admin)redirect("/admin/login");if(admin.role!=="ADMIN")redirect("/admin");
 const alerts=await prisma.stockAlert.findMany({include:{product:{select:{name:true,slug:true,sku:true,inventoryQty:true,hasVariants:true,variants:{where:{isActive:true},select:{inventoryQty:true}}}}},orderBy:{createdAt:"desc"},take:500});
 return <main className="commerce-page"><div className="commerce-breadcrumb"><Link href="/admin">Admin</Link><span>/</span> Back-in-stock alerts</div><header className="commerce-heading"><p className="eyebrow">CUSTOMER CARE / INVENTORY</p><h1>When a favourite<br/><em>returns.</em></h1><p>Manage customer requests and send restock notifications once inventory is available.</p></header><AdminStockAlertManager initialAlerts={alerts.map(a=>({...a,createdAt:a.createdAt.toISOString(),sentAt:a.sentAt?.toISOString()??null}))}/></main>;
}
