import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AdminOrderWorkbench } from "@/components/admin-order-workbench";
export const dynamic="force-dynamic";
export default async function AdminOrders(){
 const admin=await requireAdmin();if(!admin)redirect("/admin/login");
 const [orders,total]=await Promise.all([prisma.order.findMany({include:{user:{select:{name:true,email:true}},items:true,payment:true},orderBy:{createdAt:"desc"},take:20}),prisma.order.count()]);
 const serialised=orders.map(order=>({...order,createdAt:order.createdAt.toISOString()}));
 return <main className="commerce-page"><div className="commerce-breadcrumb"><Link href="/admin">Admin</Link><span>/</span> Orders</div><header className="commerce-heading"><p className="eyebrow">STORE OPERATIONS / FULFILMENT</p><h1>Every order,<br/><em>in good hands.</em></h1><p>Search the order queue, filter by operational status and export order data for reconciliation.</p></header><AdminOrderWorkbench initialOrders={serialised} initialTotal={total}/></main>;
}
