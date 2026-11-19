import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateTaxInclusive } from "@/lib/money";
import { calculateCouponDiscount } from "@/lib/promotions";
import { checkDelhiveryServiceability } from "@/lib/shipping/delhivery";
import { sendOrderConfirmation, sendWhatsAppOrderConfirmation } from "@/lib/notifications";

const schema=z.object({
 checkoutKey:z.string().uuid(),
 guestAccessToken:z.string().min(32).max(128),
 paymentMethod:z.enum(["COD","RAZORPAY"]).default("COD"),
 guestEmail:z.string().trim().email().max(254).optional(),
 couponCode:z.string().trim().min(3).max(32).optional(),
 items:z.array(z.object({productId:z.string().min(1),variantId:z.string().optional(),quantity:z.number().int().min(1).max(10)})).min(1).max(30),
 shippingAddress:z.object({fullName:z.string().trim().min(2).max(100),phone:z.string().trim().min(8).max(20),line1:z.string().trim().min(4).max(180),line2:z.string().trim().max(180).optional(),city:z.string().trim().min(2).max(80),state:z.string().trim().min(2).max(80),postalCode:z.string().trim().regex(/^\d{6}$/),countryCode:z.string().length(2).default("IN")})
});
function fail(message:string,status=400){return NextResponse.json({error:message},{status});}
export async function POST(request:NextRequest){
 const user=await getCurrentUser();
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return fail("Please check your contact, delivery details and bag.");
 const input=parsed.data;
 if(input.shippingAddress.countryCode!=="IN")return fail("International delivery is not enabled yet.");
 if(!user&&input.paymentMethod!=="COD")return fail("Please register or sign in before choosing online payment.",401);
 if(!user&&!input.guestEmail)return fail("Enter an email address for your guest order.");
 const guestEmail=input.guestEmail?.toLowerCase()??user?.email??"";
 const guestTokenHash=createHash("sha256").update(input.guestAccessToken).digest("hex");
 const existing=await prisma.order.findUnique({where:{checkoutKey:input.checkoutKey},include:{payment:true}});
 if(existing){
  const ownsOrder=user?existing.userId===user.id:existing.userId===null&&existing.guestAccessTokenHash===guestTokenHash;
  if(!ownsOrder)return fail("This checkout session is already associated with another order.",409);
  if(existing.payment?.provider==="COD")return NextResponse.json({orderId:existing.id,orderNumber:existing.orderNumber,...(!user?{guestAccessToken:input.guestAccessToken}:{})});
  if(existing.payment?.providerOrderId&&existing.payment.status!=="CAPTURED"){
   const keyId=process.env.RAZORPAY_KEY_ID;
   if(!keyId)return fail("Online payment is not configured.",503);
   return NextResponse.json({orderId:existing.id,orderNumber:existing.orderNumber,razorpayOrderId:existing.payment.providerOrderId,amount:existing.totalPaise,currency:existing.currency,keyId});
  }
  return fail("This checkout has already been completed.",409);
 }
 const production=process.env.VERCEL_ENV==="production";
 const shippingRaw=process.env.SHIPPING_FLAT_RATE_PAISE??(production?undefined:"0");
 if(!shippingRaw||!/^\d+$/.test(shippingRaw))return fail("Delivery pricing is being configured. Please try again later.",503);
 const shippingPaise=Number(shippingRaw);if(!Number.isSafeInteger(shippingPaise))return fail("Delivery pricing is not configured correctly.",503);
 const shippingTaxRaw=process.env.SHIPPING_TAX_RATE_BPS??(production?undefined:"0");
 if(!shippingTaxRaw||!/^\d+$/.test(shippingTaxRaw)||Number(shippingTaxRaw)>10000)return fail("Shipping tax treatment is awaiting seller confirmation.",503);
 const shippingTaxRateBps=Number(shippingTaxRaw);
 if(!process.env.SELLER_GSTIN&&shippingTaxRateBps>0)return fail("Shipping GST requires the seller's GST registration details.",503);
 if(production&&process.env.GST_PRICES_INCLUDE_TAX!=="true")return fail("Tax configuration is pending seller confirmation.",503);
 if(process.env.SHIPPING_DEFAULT_PROVIDER==="ATS")return fail("Amazon Shipping integration is awaiting official API credentials.",503);
 if(process.env.SHIPPING_DEFAULT_PROVIDER==="DELHIVERY"){
  try{const service=await checkDelhiveryServiceability(input.shippingAddress.postalCode);if(!service.serviceable)return fail("Delhivery does not currently service this PIN code.",400);}
  catch{return fail("We could not confirm delivery serviceability. Please try again later.",503);}
 }
 const keyId=process.env.RAZORPAY_KEY_ID,secret=process.env.RAZORPAY_KEY_SECRET;
 if(input.paymentMethod==="RAZORPAY"&&(!user||!keyId||!secret))return fail("Online payment is not available. Please use Cash on Delivery or try again later.",503);
 const orderNumber="YK-"+randomUUID().replace(/-/g,"").slice(0,12).toUpperCase();
 try{
  const products=await prisma.product.findMany({where:{id:{in:input.items.map(i=>i.productId)},isActive:true},include:{variants:{where:{isActive:true}}}});
  if(products.length!==new Set(input.items.map(i=>i.productId)).size)return fail("One or more products are unavailable.",409);
  const lineItems=input.items.map(item=>{
   const product=products.find(p=>p.id===item.productId)!;
   const variant=item.variantId?product.variants.find(v=>v.id===item.variantId):null;
   if(item.variantId&&!variant)throw new Error("Selected product option is unavailable.");
   if(product.hasVariants&&!variant)throw new Error("Please select an option for each product.");
   return {product,variant,quantity:item.quantity,price:variant?.pricePaise??product.pricePaise,sku:variant?.sku??product.sku,label:variant?.label??null};
  });
  if(process.env.SELLER_GSTIN&&lineItems.some(l=>!l.product.hsnCode))return fail("A product HSN code is missing. Please contact the store.",503);
  if(!process.env.SELLER_GSTIN&&lineItems.some(l=>l.product.gstRateBps>0))return fail("Product GST rates require the seller's GST registration details.",503);
  const subtotalPaise=lineItems.reduce((sum,line)=>sum+line.price*line.quantity,0);
  const productTaxPaise=lineItems.reduce((sum,line)=>sum+calculateTaxInclusive(line.price*line.quantity,line.product.gstRateBps),0);
  let coupon:{id:string;code:string;discountType:"PERCENTAGE"|"FIXED_AMOUNT";discountValue:number;maximumDiscountPaise:number|null;usageLimit:number|null;usageCount:number;minimumSubtotalPaise:number;startsAt:Date|null;endsAt:Date|null;isActive:boolean}|null=null;
  let discountPaise=0;
  const couponCode=input.couponCode?.trim().toUpperCase();
  if(couponCode){
   coupon=await prisma.coupon.findUnique({where:{code:couponCode}});
   const now=new Date();
   if(!coupon||!coupon.isActive||(coupon.startsAt&&coupon.startsAt>now)||(coupon.endsAt&&coupon.endsAt<now)||(coupon.usageLimit!==null&&coupon.usageCount>=coupon.usageLimit))return fail("This promotion code is invalid, expired or no longer available.",400);
   if(subtotalPaise<coupon.minimumSubtotalPaise)return fail("Your bag does not meet the minimum order value for this promotion.",400);
   discountPaise=calculateCouponDiscount(subtotalPaise,coupon.discountType,coupon.discountValue,coupon.maximumDiscountPaise);
  }
  const discountTaxPaise=subtotalPaise>0?Math.round(productTaxPaise*discountPaise/subtotalPaise):0;
  const taxPaise=productTaxPaise-discountTaxPaise+calculateTaxInclusive(shippingPaise,shippingTaxRateBps);
  const totalPaise=subtotalPaise+shippingPaise-discountPaise;
  if(!Number.isSafeInteger(totalPaise)||totalPaise<100)return fail("The order total is invalid.");
  let gateway:{id:string}|null=null;
  if(input.paymentMethod==="RAZORPAY"){
   const basic=Buffer.from(keyId+":"+secret).toString("base64");
   const response=await fetch("https://api.razorpay.com/v1/orders",{method:"POST",headers:{Authorization:"Basic "+basic,"Content-Type":"application/json"},body:JSON.stringify({amount:totalPaise,currency:"INR",receipt:orderNumber,notes:{customerId:user!.id}}),cache:"no-store"});
   const data=await response.json().catch(()=>({}));
   if(!response.ok||!data.id)return fail("Payment service could not create an order. Please try again.",502);
   gateway={id:data.id};
  }
  const order=await prisma.$transaction(async tx=>{
   for(const line of lineItems){
    const result=line.variant
     ?await tx.productVariant.updateMany({where:{id:line.variant.id,inventoryQty:{gte:line.quantity},isActive:true},data:{inventoryQty:{decrement:line.quantity}}})
     :await tx.product.updateMany({where:{id:line.product.id,inventoryQty:{gte:line.quantity},isActive:true},data:{inventoryQty:{decrement:line.quantity}}});
    if(result.count!==1)throw new Error("Insufficient stock for "+line.product.name+". Please update your bag.");
    await tx.inventoryMovement.create({data:{productId:line.product.id,variantId:line.variant?.id,quantityDelta:-line.quantity,reason:input.paymentMethod==="COD"?"COD_ORDER_PLACED":"ORDER_RESERVATION",reference:orderNumber,createdBy:user?.id??"guest-checkout"}});
   }
   if(user){
    const address=await tx.address.findFirst({where:{userId:user.id,line1:input.shippingAddress.line1,postalCode:input.shippingAddress.postalCode,phone:input.shippingAddress.phone}});
    if(!address)await tx.address.create({data:{userId:user.id,...input.shippingAddress,isDefault:!(await tx.address.count({where:{userId:user.id}}))}});
   }
   const created=await tx.order.create({data:{
    orderNumber,checkoutKey:input.checkoutKey,userId:user?.id??null,
    guestName:user?null:input.shippingAddress.fullName,guestEmail:user?null:guestEmail,guestPhone:user?null:input.shippingAddress.phone,
    guestAccessTokenHash:user?null:guestTokenHash,
    couponCode:coupon?.code??null,discountPaise,reservationExpiresAt:input.paymentMethod==="COD"?null:new Date(Date.now()+30*60*1000),
    status:input.paymentMethod==="COD"?"CONFIRMED":"PENDING",subtotalPaise,taxPaise,shippingPaise,totalPaise,
    shippingAddress:input.shippingAddress,billingAddress:input.shippingAddress,
    items:{create:lineItems.map(line=>({productId:line.product.id,variantId:line.variant?.id,productName:line.product.name,variantLabel:line.label,sku:line.sku,hsnCode:line.product.hsnCode,quantity:line.quantity,unitPricePaise:line.price,gstRateBps:line.product.gstRateBps}))},
    payment:{create:{provider:input.paymentMethod,providerOrderId:gateway?.id??null,amountPaise:totalPaise,currency:"INR",status:"CREATED"}}
   }});
   if(coupon){
    const reserved=await tx.coupon.updateMany({where:{id:coupon.id,isActive:true,...(coupon.usageLimit!==null?{usageCount:{lt:coupon.usageLimit}}:{})},data:{usageCount:{increment:1}}});
    if(reserved.count!==1)throw new Error("This promotion has just reached its usage limit.");
    await tx.couponRedemption.create({data:{couponId:coupon.id,orderId:created.id,userId:user?.id??null,discountPaise}});
   }
   return created;
  });
  if(input.paymentMethod==="COD"){
   await Promise.allSettled([sendOrderConfirmation(order.id),sendWhatsAppOrderConfirmation(order.id)]);
   return NextResponse.json({orderId:order.id,orderNumber:order.orderNumber,...(!user?{guestAccessToken:input.guestAccessToken}:{})},{status:201});
  }
  return NextResponse.json({orderId:order.id,orderNumber:order.orderNumber,razorpayOrderId:gateway!.id,amount:totalPaise,currency:"INR",keyId});
 }catch(error){
  const raced=await prisma.order.findUnique({where:{checkoutKey:input.checkoutKey},include:{payment:true}});
  if(raced&&(user?raced.userId===user.id:raced.userId===null&&raced.guestAccessTokenHash===guestTokenHash)){
   if(raced.payment?.provider==="COD")return NextResponse.json({orderId:raced.id,orderNumber:raced.orderNumber,...(!user?{guestAccessToken:input.guestAccessToken}:{})});
   if(raced.payment?.providerOrderId&&keyId)return NextResponse.json({orderId:raced.id,orderNumber:raced.orderNumber,razorpayOrderId:raced.payment.providerOrderId,amount:raced.totalPaise,currency:raced.currency,keyId});
  }
  return fail(error instanceof Error?error.message:"Could not place your order.",409);
 }
}
