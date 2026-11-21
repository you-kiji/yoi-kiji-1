import "../../admin-insights.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/money";
export const dynamic="force-dynamic";
const paidStatuses=["CONFIRMED","PROCESSING","SHIPPED","DELIVERED"] as const;
export default async function AdminReportsPage({searchParams}:{searchParams:Promise<{period?:string}>}){
 const admin=await requireAdmin();if(!admin)redirect("/admin/login");if(admin.role!=="ADMIN")redirect("/admin");
 const params=await searchParams;const periodMonths=params.period==="3"?3:params.period==="6"?6:12;
 const start=new Date();start.setMonth(start.getMonth()-(periodMonths-1));start.setDate(1);start.setHours(0,0,0,0);
 const [orders,items,inventoryProducts,customers]=await Promise.all([
  prisma.order.findMany({where:{createdAt:{gte:start},status:{in:[...paidStatuses]}},select:{id:true,orderNumber:true,createdAt:true,totalPaise:true,subtotalPaise:true,discountPaise:true,shippingPaise:true},orderBy:{createdAt:"asc"},take:10000}),
  prisma.orderItem.findMany({where:{order:{createdAt:{gte:start},status:{in:[...paidStatuses]}}},select:{productId:true,productName:true,quantity:true,unitPricePaise:true},take:20000}),
  prisma.product.findMany({where:{isActive:true},select:{id:true,name:true,sku:true,inventoryQty:true,pricePaise:true},orderBy:{inventoryQty:"asc"},take:500}),
  prisma.user.count({where:{role:"CUSTOMER"}}),
 ]);
 const monthKeys=Array.from({length:periodMonths},(_,i)=>{const d=new Date(start);d.setMonth(start.getMonth()+i);return d.toISOString().slice(0,7);});
 const monthly=monthKeys.map(key=>{const rows=orders.filter(order=>order.createdAt.toISOString().slice(0,7)===key);return {key,label:new Intl.DateTimeFormat("en-IN",{month:"short"}).format(new Date(key+"-01T00:00:00Z")),revenue:rows.reduce((sum,o)=>sum+o.totalPaise,0),count:rows.length};});
 const topMap=new Map<string,{id:string;name:string;quantity:number;revenue:number}>();
 for(const item of items){const current=topMap.get(item.productId)??{id:item.productId,name:item.productName,quantity:0,revenue:0};current.quantity+=item.quantity;current.revenue+=item.unitPricePaise*item.quantity;topMap.set(item.productId,current);}
 const topProducts=[...topMap.values()].sort((a,b)=>b.quantity-a.quantity).slice(0,8);
 const revenue=orders.reduce((sum,o)=>sum+o.totalPaise,0),discounts=orders.reduce((sum,o)=>sum+o.discountPaise,0),maxRevenue=Math.max(1,...monthly.map(m=>m.revenue));
 const lowStock=inventoryProducts.filter(p=>p.inventoryQty<=5);
 return <main className="commerce-page"><div className="commerce-breadcrumb"><Link href="/admin">Admin</Link><span>/</span> Reports & analytics</div>
  <header className="commerce-heading"><p className="eyebrow">BUSINESS INTELLIGENCE</p><h1>See the whole<br/><em>picture.</em></h1><p>Review paid-order revenue, product performance and current stock exposure. Pending and cancelled orders are excluded.</p></header>
  <form className="admin-report-period" method="get"><label htmlFor="report-period">Reporting period</label><select id="report-period" name="period" defaultValue={String(periodMonths)}><option value="3">Last 3 months</option><option value="6">Last 6 months</option><option value="12">Last 12 months</option></select><button type="submit">Apply period</button></form>
  <section className="admin-stats"><article><span>Paid revenue</span><strong>{formatINR(revenue)}</strong><small>Last {periodMonths} months</small></article><article><span>Paid orders</span><strong>{orders.length}</strong><small>Confirmed through delivered</small></article><article><span>Average order value</span><strong>{formatINR(orders.length?Math.round(revenue/orders.length):0)}</strong><small>Paid revenue ÷ paid orders</small></article><article><span>Discounts given</span><strong>{formatINR(discounts)}</strong><small>Recorded coupon discounts</small></article></section>
  <section className="admin-report-panel"><div className="admin-section-heading"><h2>Revenue by month</h2><span>INR · paid order value · {periodMonths} months</span></div><div className="admin-monthly-chart">{monthly.map(month=><div className="admin-month-bar" key={month.key}><div className="admin-month-bar__track"><span style={{height:(month.revenue/maxRevenue*100)+"%"}}/></div><strong>{month.revenue?formatINR(month.revenue):"—"}</strong><small>{month.label}</small><small>{month.count} orders</small></div>)}</div></section>
  <div className="admin-report-grid"><section className="admin-report-panel"><div className="admin-section-heading"><h2>Best-selling products</h2><span>By units sold</span></div>{topProducts.length?topProducts.map((p,i)=><article className="admin-report-row" key={p.name}><span>{String(i+1).padStart(2,"0")}</span><div><strong><Link href={"/admin/products/"+p.id}>{p.name}</Link></strong><small>{p.quantity} units</small></div><strong>{formatINR(p.revenue)}</strong></article>):<p>No paid product sales in this period.</p>}</section>
  <section className="admin-report-panel"><div className="admin-section-heading"><h2>Stock exposure</h2><span>Current inventory</span></div><p>{lowStock.length} active products have 5 or fewer units on hand.</p>{lowStock.slice(0,8).map(p=><article className="admin-report-row" key={p.id}><div><strong><Link href={"/admin/products/"+p.id}>{p.name}</Link></strong><small>{p.sku}</small></div><strong className={p.inventoryQty<=0?"stock-negative":"stock-positive"}>{p.inventoryQty} units</strong></article>)}<p><Link className="text-link" href="/admin/inventory">Open inventory control ↗</Link></p></section></div>
  <section className="admin-report-panel"><div className="admin-section-heading"><h2>Export centre</h2><span>Download operational data</span></div><div className="admin-export-links"><a href="/api/admin/reports/export?type=sales">Sales & order lines ↗</a><a href="/api/admin/reports/export?type=products">Product catalogue ↗</a><a href="/api/admin/reports/export?type=inventory">Inventory snapshot ↗</a><a href="/api/admin/reports/export?type=customers">Customer directory ↗</a></div><small>{customers} registered customer accounts · Product and inventory reports reflect the current catalogue.</small></section>
 </main>;
}
