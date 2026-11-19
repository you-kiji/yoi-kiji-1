import { NextRequest,NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
function cell(value:unknown){const text=value===null||value===undefined?"":String(value);const safe=/^[=+\-@\t\r]/.test(text)?"'"+text:text;return '"'+safe.replace(/"/g,'""')+'"';}
function download(rows:unknown[][],filename:string){const body=rows.map(row=>row.map(cell).join(",")).join("\r\n");return new NextResponse(body,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="'+filename+'"',"Cache-Control":"no-store"}});}
export async function GET(request:NextRequest){
 const admin=await requireAdmin();if(!admin||admin.role!=="ADMIN")return NextResponse.json({error:"Administrator permission required."},{status:403});
 const type=request.nextUrl.searchParams.get("type");
 if(type==="sales"){
  const start=new Date();start.setFullYear(start.getFullYear()-1);
  const orders=await prisma.order.findMany({where:{createdAt:{gte:start},status:{in:["CONFIRMED","PROCESSING","SHIPPED","DELIVERED"]}},include:{user:{select:{name:true,email:true}},items:true,payment:true},orderBy:{createdAt:"desc"},take:10000});
  return download([["Order","Customer","Email","Status","Payment method","Product","SKU","Quantity","Unit price paise","Subtotal paise","Discount paise","Shipping paise","Total paise","Created at"],...orders.flatMap(o=>o.items.length?o.items.map(i=>[o.orderNumber,o.user?.name??o.guestName??"",o.user?.email??o.guestEmail??"",o.status,o.payment?.provider??"",i.productName,i.sku,i.quantity,i.unitPricePaise,o.subtotalPaise,o.discountPaise,o.shippingPaise,o.totalPaise,o.createdAt.toISOString()]):[[o.orderNumber,o.user?.name??o.guestName??"",o.user?.email??o.guestEmail??"",o.status,o.payment?.provider??"","","",0,0,o.subtotalPaise,o.discountPaise,o.shippingPaise,o.totalPaise,o.createdAt.toISOString()]])],"yoi-kiji-sales.csv");
 }
 if(type==="products"){
  const products=await prisma.product.findMany({include:{category:true,variants:true,images:true},orderBy:{name:"asc"},take:5000});
  return download([["Name","Slug","SKU","Category","Price paise","Compare at paise","GST bps","Active","Stock","Variants","SEO title","SEO description","SEO keywords","Canonical URL","No index","Image count"],...products.map(p=>[p.name,p.slug,p.sku,p.category?.name??"",p.pricePaise,p.compareAtPaise,p.gstRateBps,p.isActive,p.inventoryQty,p.variants.length,p.seoTitle,p.seoDescription,p.seoKeywords.join("; "),p.canonicalUrl,p.noIndex,p.images.length])],"yoi-kiji-products.csv");
 }
 if(type==="inventory"){
  const products=await prisma.product.findMany({include:{variants:true},orderBy:{name:"asc"},take:5000});
  return download([["Product","SKU","Stock","Variant","Variant SKU","Variant stock"],...products.flatMap(p=>p.variants.length?p.variants.map(v=>[p.name,p.sku,p.inventoryQty,v.label,v.sku,v.inventoryQty]):[[p.name,p.sku,p.inventoryQty,"","", ""]])],"yoi-kiji-inventory.csv");
 }
 if(type==="customers"){
  const customers=await prisma.user.findMany({where:{role:"CUSTOMER"},select:{name:true,email:true,whatsappOptIn:true,createdAt:true,_count:{select:{orders:true}}},orderBy:{createdAt:"desc"},take:10000});
  return download([["Name","Email","WhatsApp consent","Registered at","Orders"],...customers.map(c=>[c.name,c.email,c.whatsappOptIn,c.createdAt.toISOString(),c._count.orders])],"yoi-kiji-customers.csv");
 }
 return NextResponse.json({error:"Choose sales, products, inventory or customers report."},{status:400});
}
