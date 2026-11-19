import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { formatINR,calculateTaxInclusive } from "@/lib/money";
import { calculateCouponDiscount } from "@/lib/promotions";
const schema=z.object({
 items:z.array(z.object({productId:z.string().min(1),variantId:z.string().optional(),quantity:z.number().int().min(1).max(10)})).min(1).max(30),
 couponCode:z.string().trim().min(3).max(32).optional(),
});
export async function POST(request:NextRequest){
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Invalid cart."},{status:400});
 const ids=[...new Set(parsed.data.items.map(i=>i.productId))];
 const products=await prisma.product.findMany({where:{id:{in:ids},isActive:true},include:{images:{where:{variantId:null},orderBy:[{isPrimary:"desc"},{position:"asc"}],take:1},variants:{where:{isActive:true}}}});
 const lines=[];
 for(const item of parsed.data.items){
  const p=products.find(x=>x.id===item.productId);if(!p)return NextResponse.json({error:"A product in your bag is no longer available."},{status:409});
  const v=item.variantId?p.variants.find(x=>x.id===item.variantId):null;
  if(item.variantId&&!v)return NextResponse.json({error:"A selected option is no longer available."},{status:409});
  if(p.hasVariants&&!v)return NextResponse.json({error:"Please select a product option."},{status:400});
  const price=v?.pricePaise??p.pricePaise;
  lines.push({productId:p.id,variantId:v?.id??null,name:p.name,variantLabel:v?.label??null,sku:v?.sku??p.sku,quantity:item.quantity,unitPricePaise:price,lineTotalPaise:price*item.quantity,image:p.images[0]?.url??null,availableQty:v?.inventoryQty??p.inventoryQty,gstRateBps:p.gstRateBps});
 }
 if(lines.some(line=>line.quantity>line.availableQty))return NextResponse.json({error:"One or more selected quantities exceed available stock. Update your bag to continue."},{status:409});
 const subtotalPaise=lines.reduce((sum,line)=>sum+line.lineTotalPaise,0);
 const production=process.env.VERCEL_ENV==="production";
 const shippingRaw=process.env.SHIPPING_FLAT_RATE_PAISE??(production?undefined:"0");
 if(!shippingRaw||!/^\d+$/.test(shippingRaw))return NextResponse.json({error:"Delivery pricing is being configured. Please try again later."},{status:503});
 const shippingPaise=Number(shippingRaw);
 if(!Number.isSafeInteger(shippingPaise)||shippingPaise<0)return NextResponse.json({error:"Delivery pricing is not configured correctly."},{status:503});
 const shippingTaxRaw=process.env.SHIPPING_TAX_RATE_BPS??(production?undefined:"0");
 if(!shippingTaxRaw||!/^\d+$/.test(shippingTaxRaw)||Number(shippingTaxRaw)>10000)return NextResponse.json({error:"Shipping tax treatment is awaiting seller confirmation."},{status:503});
 const shippingTaxRateBps=Number(shippingTaxRaw);
 if(!process.env.SELLER_GSTIN&&shippingTaxRateBps>0)return NextResponse.json({error:"Shipping GST requires the seller's GST registration details."},{status:503});
 if(production&&process.env.GST_PRICES_INCLUDE_TAX!=="true")return NextResponse.json({error:"Tax configuration is pending seller confirmation."},{status:503});
 if(!process.env.SELLER_GSTIN&&lines.some(line=>line.gstRateBps>0))return NextResponse.json({error:"Product GST rates require the seller's GST registration details."},{status:503});
 const productTaxPaise=lines.reduce((sum,line)=>sum+calculateTaxInclusive(line.lineTotalPaise,line.gstRateBps),0);
 let discountPaise=0,appliedCoupon:string|null=null;
 if(parsed.data.couponCode){
  const code=parsed.data.couponCode.toUpperCase();
  const coupon=await prisma.coupon.findUnique({where:{code}});
  const now=new Date();
  if(!coupon||!coupon.isActive||(coupon.startsAt&&coupon.startsAt>now)||(coupon.endsAt&&coupon.endsAt<now)||(coupon.usageLimit!==null&&coupon.usageCount>=coupon.usageLimit))return NextResponse.json({error:"This promotion code is invalid, expired or no longer available."},{status:400});
  if(subtotalPaise<coupon.minimumSubtotalPaise)return NextResponse.json({error:"Your bag does not meet the minimum order value for this promotion."},{status:400});
  discountPaise=calculateCouponDiscount(subtotalPaise,coupon.discountType,coupon.discountValue,coupon.maximumDiscountPaise);
  appliedCoupon=coupon.code;
 }
 const discountTaxPaise=subtotalPaise>0?Math.round(productTaxPaise*discountPaise/subtotalPaise):0;
 const taxPaise=productTaxPaise-discountTaxPaise+calculateTaxInclusive(shippingPaise,shippingTaxRateBps);
 const totalPaise=subtotalPaise+shippingPaise-discountPaise;
 return NextResponse.json({
  items:lines.map(({gstRateBps,...line})=>line),
  subtotalPaise,subtotal:formatINR(subtotalPaise),
  shippingPaise,shipping:formatINR(shippingPaise),
  discountPaise,discount:formatINR(discountPaise),appliedCoupon,
  taxPaise,tax:formatINR(taxPaise),
  totalPaise,total:formatINR(totalPaise),
  currency:"INR",
 });
}
