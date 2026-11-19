import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AdminCustomerProfile } from "@/components/admin-customer-profile";
export const dynamic = "force-dynamic";
export default async function CustomerProfilePage({params}:{params:Promise<{id:string}>}) {
 const admin=await requireAdmin();if(!admin)redirect("/admin/login");if(admin.role!=="ADMIN")redirect("/admin");
 const {id}=await params;const customer=await prisma.user.findFirst({where:{id,role:"CUSTOMER"},select:{id:true,name:true,email:true}});if(!customer)notFound();
 return <main className="commerce-page"><div className="commerce-breadcrumb"><Link href="/admin">Admin</Link><span>/</span><Link href="/admin/customers">Customers</Link><span>/</span>{customer.name||customer.email}</div><header className="commerce-heading"><p className="eyebrow">CUSTOMER RELATIONSHIP MANAGEMENT</p><h1>{customer.name||"Customer"}<br/><em>profile.</em></h1><p>{customer.email}</p></header><AdminCustomerProfile customerId={customer.id}/></main>;
}