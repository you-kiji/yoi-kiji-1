import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AdminInventoryAdjustment } from "@/components/admin-inventory-adjustment";
export const dynamic="force-dynamic";
type SearchParams=Promise<Record<string,string|string[]|undefined>>;
const one=(value:string|string[]|undefined)=>Array.isArray(value)?value[0]??"":value??"";
function href(params:Record<string,string>,key:string,value:string){const next=new URLSearchParams(params);if(value)next.set(key,value);else next.delete(key);return "/admin/inventory?"+next.toString();}
export default async function InventoryPage({searchParams}:{searchParams?:SearchParams}){
 const admin=await requireAdmin();if(!admin)redirect("/admin/login");
 const raw=await searchParams??{};
 const q=one(raw.q).trim().slice(0,80),stock=["ALL","LOW","OUT","IN"].includes(one(raw.stock))?one(raw.stock):"ALL";
 const movementQ=one(raw.mq).trim().slice(0,80);
 const page=Math.max(1,Math.min(10000,Number(one(raw.page))||1));
 const movementPage=Math.max(1,Math.min(10000,Number(one(raw.mp))||1));
 const pageSize=25,movementPageSize=50;
 const where={
  isActive:true,
  ...(q?{OR:[{name:{contains:q,mode:"insensitive" as const}},{sku:{contains:q,mode:"insensitive" as const}}]}:{}),
  ...(stock==="LOW"?{inventoryQty:{gt:0,lte:5}}:stock==="OUT"?{inventoryQty:{lte:0}}:stock==="IN"?{inventoryQty:{gt:5}}:{})
 };
 const movementWhere=movementQ?{OR:[{product:{name:{contains:movementQ,mode:"insensitive" as const}}},{product:{sku:{contains:movementQ,mode:"insensitive" as const}}},{reference:{contains:movementQ,mode:"insensitive" as const}}]}:{};
 const [adjustmentProducts,products,totalProducts,movements,totalMovements,lowStock,zeroStock,activeProducts]=await Promise.all([
  prisma.product.findMany({where:{isActive:true},select:{id:true,name:true,sku:true,inventoryQty:true,variants:{where:{isActive:true},select:{id:true,label:true,sku:true,inventoryQty:true},orderBy:{createdAt:"asc"}}},orderBy:{name:"asc"},take:500}),
  prisma.product.findMany({where,select:{id:true,name:true,sku:true,inventoryQty:true,variants:{where:{isActive:true},select:{id:true,label:true,sku:true,inventoryQty:true},orderBy:{createdAt:"asc"}}},orderBy:{name:"asc"},skip:(page-1)*pageSize,take:pageSize}),
  prisma.product.count({where}),
  prisma.inventoryMovement.findMany({where:movementWhere,include:{product:{select:{name:true,sku:true}},variant:{select:{label:true,sku:true}}},orderBy:{createdAt:"desc"},skip:(movementPage-1)*movementPageSize,take:movementPageSize}),
  prisma.inventoryMovement.count({where:movementWhere}),
  prisma.product.count({where:{isActive:true,inventoryQty:{gt:0,lte:5}}}),
  prisma.product.count({where:{isActive:true,inventoryQty:{lte:0}}}),
  prisma.product.count({where:{isActive:true}})
 ]);
 const totalPages=Math.max(1,Math.ceil(totalProducts/pageSize)),movementPages=Math.max(1,Math.ceil(totalMovements/movementPageSize));
 const filters={...(q?{q}:{}),...(stock!=="ALL"?{stock}:{})};
 const movementFilters={...(movementQ?{mq:movementQ}:{})};
 return <main className="commerce-page">
  <div className="commerce-breadcrumb"><Link href="/admin">Admin</Link><span>/</span> Inventory</div>
  <header className="commerce-heading"><p className="eyebrow">STOCK CONTROL / AUDIT TRAIL</p><h1>Every piece,<br/><em>accounted for.</em></h1><p>Adjust stock safely, filter catalogue inventory and audit every recorded movement.</p></header>
  <section className="admin-stats"><article><span>Active products</span><strong>{activeProducts}</strong><small>Tracked catalogue items</small></article><article><span>Low stock</span><strong>{lowStock}</strong><small>1–5 units on hand</small></article><article><span>Out of stock</span><strong>{zeroStock}</strong><small>Zero or negative quantity</small></article></section>
  <AdminInventoryAdjustment products={adjustmentProducts}/>
  <section className="admin-inventory-snapshot">
   <div className="admin-section-heading"><h2>Stock snapshot</h2><span>{totalProducts} matching products · <a href="/api/admin/reports/export?type=inventory">Export inventory CSV</a></span></div>
   <form method="GET" className="admin-order-filters">
    <label>Search product or SKU<input name="q" defaultValue={q} maxLength={80} placeholder="Product name or SKU"/></label>
    <label>Stock level<select name="stock" defaultValue={stock}><option value="ALL">All stock levels</option><option value="LOW">Low stock · 1–5</option><option value="OUT">Out of stock</option><option value="IN">Healthy · 6+</option></select></label>
    <button type="submit">Apply filters</button>{(q||stock!=="ALL")&&<Link href="/admin/inventory">Clear</Link>}
   </form>
   <div className="inventory-list">{products.map(p=><article key={p.id}><div><strong><Link href={"/admin/products/"+p.id}>{p.name}</Link></strong><p>{p.sku} · {p.variants.length} active variant(s)</p></div><strong className={p.inventoryQty<=5?"stock-negative":"stock-positive"}>{p.inventoryQty} units</strong></article>)}{products.length===0&&<p>No products match this stock filter.</p>}</div>
   <div className="admin-order-pagination"><span>Showing {totalProducts?((page-1)*pageSize+1):0}–{Math.min(page*pageSize,totalProducts)} of {totalProducts}</span><div><Link aria-disabled={page<=1} href={href(filters,"page",String(Math.max(1,page-1)))}>Previous</Link><span>Page {page} of {totalPages}</span><Link aria-disabled={page>=totalPages} href={href(filters,"page",String(Math.min(totalPages,page+1)))}>Next</Link></div></div>
  </section>
  <section className="admin-inventory-ledger">
   <div className="admin-section-heading"><h2>Movement ledger</h2><span>{totalMovements} matching entries</span></div>
   <form method="GET" className="admin-order-filters"><label>Search movement history<input name="mq" defaultValue={movementQ} maxLength={80} placeholder="Product, SKU or reference"/></label><button type="submit">Search ledger</button>{movementQ&&<Link href="/admin/inventory">Clear</Link>}</form>
   <div className="inventory-list">{movements.map(m=><article key={m.id}><div><strong><Link href={"/admin/products/"+m.productId}>{m.product.name}</Link></strong><p>{m.variant?.label??m.product.sku} · {m.reason.replaceAll("_"," ").toLowerCase()}{m.reference?" · "+m.reference:""}</p></div><strong className={m.quantityDelta<0?"stock-negative":"stock-positive"}>{m.quantityDelta>0?"+":""}{m.quantityDelta}</strong><time>{new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short"}).format(m.createdAt)}</time></article>)}{movements.length===0&&<p>No inventory movements match this search.</p>}</div>
   <div className="admin-order-pagination"><span>Showing {totalMovements?((movementPage-1)*movementPageSize+1):0}–{Math.min(movementPage*movementPageSize,totalMovements)} of {totalMovements}</span><div><Link aria-disabled={movementPage<=1} href={href(movementFilters,"mp",String(Math.max(1,movementPage-1)))}>Previous</Link><span>Page {movementPage} of {movementPages}</span><Link aria-disabled={movementPage>=movementPages} href={href(movementFilters,"mp",String(Math.min(movementPages,movementPage+1)))}>Next</Link></div></div>
  </section>
 </main>;
}
