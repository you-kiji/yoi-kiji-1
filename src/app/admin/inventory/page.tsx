import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AdminInventoryAdjustment } from "@/components/admin-inventory-adjustment";
export const dynamic="force-dynamic";
export default async function InventoryPage(){
 const admin=await requireAdmin();if(!admin)redirect("/admin/login");
 const [products,movements,lowStock,zeroStock]=await Promise.all([
  prisma.product.findMany({where:{isActive:true},select:{id:true,name:true,sku:true,inventoryQty:true,variants:{where:{isActive:true},select:{id:true,label:true,sku:true,inventoryQty:true},orderBy:{createdAt:"asc"}}},orderBy:{name:"asc"},take:500}),
  prisma.inventoryMovement.findMany({include:{product:{select:{name:true,sku:true}},variant:{select:{label:true,sku:true}}},orderBy:{createdAt:"desc"},take:200}),
  prisma.product.count({where:{isActive:true,inventoryQty:{gt:0,lte:5}}}),
  prisma.product.count({where:{isActive:true,inventoryQty:{lte:0}}}),
 ]);
 return <main className="commerce-page">
  <div className="commerce-breadcrumb"><Link href="/admin">Admin</Link><span>/</span> Inventory</div>
  <header className="commerce-heading"><p className="eyebrow">STOCK CONTROL / AUDIT TRAIL</p><h1>Every piece,<br/><em>accounted for.</em></h1><p>Adjust stock safely, see low-stock exposure and review every movement.</p></header>
  <section className="admin-stats"><article><span>Active products</span><strong>{products.length}</strong><small>Tracked catalogue items</small></article><article><span>Low stock</span><strong>{lowStock}</strong><small>1–5 units on hand</small></article><article><span>Out of stock</span><strong>{zeroStock}</strong><small>Zero or negative quantity</small></article></section>
  <AdminInventoryAdjustment products={products}/>
  <section className="admin-inventory-snapshot"><div className="admin-section-heading"><h2>Stock snapshot</h2><span>Active products</span></div><div className="inventory-list">{products.map(p=><article key={p.id}><div><strong>{p.name}</strong><p>{p.sku} · {p.variants.length} variant(s)</p></div><strong className={p.inventoryQty<=5?"stock-negative":"stock-positive"}>{p.inventoryQty} units</strong></article>)}</div></section>
  <section className="admin-inventory-ledger"><div className="admin-section-heading"><h2>Movement ledger</h2><span>Latest 200 entries</span></div><div className="inventory-list">{movements.map(m=><article key={m.id}><div><strong>{m.product.name}</strong><p>{m.variant?.label??m.product.sku} · {m.reason.replaceAll("_"," ").toLowerCase()}{m.reference?" · "+m.reference:""}</p></div><strong className={m.quantityDelta<0?"stock-negative":"stock-positive"}>{m.quantityDelta>0?"+":""}{m.quantityDelta}</strong><time>{new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short"}).format(m.createdAt)}</time></article>)}</div></section>
 </main>;
}
