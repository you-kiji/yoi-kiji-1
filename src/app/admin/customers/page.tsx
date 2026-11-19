import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AdminCustomerInsights } from "@/components/admin-customer-insights";
export const dynamic="force-dynamic";
export const metadata={title:"Customer intelligence · YOI KIJI"};
export default async function AdminCustomersPage(){
 const admin=await requireAdmin();if(!admin)redirect("/admin/login");if(admin.role!=="ADMIN")redirect("/admin");
 const [users,spend]=await Promise.all([
  prisma.user.findMany({where:{role:"CUSTOMER"},select:{id:true,name:true,email:true,whatsappOptIn:true,createdAt:true},orderBy:{createdAt:"desc"},take:1000}),
  prisma.order.groupBy({by:["userId"],where:{status:{in:["CONFIRMED","PROCESSING","SHIPPED","DELIVERED"]}},_sum:{totalPaise:true},_count:{_all:true},_max:{createdAt:true}})
 ]);
 const spendByUser=new Map(spend.map(item=>[item.userId,{ltvPaise:item._sum.totalPaise??0,orderCount:item._count._all,lastPurchaseAt:item._max.createdAt?.toISOString()??null}]));
 const customers=users.map(user=>({id:user.id,name:user.name,email:user.email,whatsappOptIn:user.whatsappOptIn,createdAt:user.createdAt.toISOString(),...(spendByUser.get(user.id)??{ltvPaise:0,orderCount:0,lastPurchaseAt:null})}));
 return <main className="commerce-page"><div className="commerce-breadcrumb"><Link href="/admin">Admin</Link><span>/</span> Customer intelligence</div><header className="commerce-heading"><p className="eyebrow">CUSTOMER RELATIONSHIPS & RETENTION</p><h1>Know the people<br/><em>behind each order.</em></h1><p>Search customers, understand lifetime value and identify repeat, VIP and at-risk relationships. Customer purchase value excludes pending, cancelled and refunded orders.</p></header><AdminCustomerInsights customers={customers}/></main>;
}
