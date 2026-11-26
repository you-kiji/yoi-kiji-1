import { createHmac,timingSafeEqual } from "node:crypto";
import { NextRequest,NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOrderConfirmation,sendWhatsAppOrderConfirmation,sendOrderStatusUpdate } from "@/lib/notifications";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 const secret=process.env.RAZORPAY_WEBHOOK_SECRET;if(!secret)return NextResponse.json({error:"Webhook is not configured."},{status:503});
 const raw=await request.text();const signature=request.headers.get("x-razorpay-signature")??"";
 const expected=createHmac("sha256",secret).update(raw).digest("hex");const a=Buffer.from(expected),b=Buffer.from(signature);
 if(a.length!==b.length||!timingSafeEqual(a,b))return NextResponse.json({error:"Invalid signature."},{status:400});
 const eventId=request.headers.get("x-razorpay-event-id");let event:any;try{event=JSON.parse(raw)}catch{return NextResponse.json({error:"Invalid payload."},{status:400})}
 if(event.event==="refund.processed"||event.event==="refund.failed"){
  const refund=event?.payload?.refund?.entity;const paymentRef=refund?.payment_id;
  if(!refund?.id||!paymentRef||!Number.isSafeInteger(refund.amount)||!refund.currency){
   return NextResponse.json({error:"Refund reference, amount or currency is missing."},{status:400});
  }
  const matched=await prisma.payment.findUnique({where:{providerPaymentId:paymentRef}});
  if(!matched)return NextResponse.json({received:true});
  if(refund.amount!==matched.amountPaise||refund.currency!==matched.currency){
   return NextResponse.json({error:"Refund amount or currency does not match the captured payment."},{status:400});
  }
  if(matched.refundId&&matched.refundId!==refund.id){
   return NextResponse.json({error:"Refund reference does not match the payment's active refund."},{status:409});
  }
  if(eventId&&matched.webhookEventId===eventId)return NextResponse.json({received:true,duplicate:true});
  const processed=event.event==="refund.processed";
  await prisma.$transaction([
   prisma.payment.update({where:{id:matched.id},data:{refundId:refund.id,refundStatus:processed?"processed":"failed",status:processed?"REFUNDED":matched.status,webhookEventId:eventId??undefined}}),
   ...(processed?[prisma.order.update({where:{id:matched.orderId},data:{status:"REFUNDED"}})]:[])
  ]);
  if(processed)await sendOrderStatusUpdate(matched.orderId,"REFUNDED").catch(()=>undefined);
  return NextResponse.json({received:true});
 }
 const providerPayment=event?.payload?.payment?.entity;
 const gatewayOrderId=providerPayment?.order_id??event?.payload?.order?.entity?.id;
 const paymentId=providerPayment?.id;
 if(!gatewayOrderId)return NextResponse.json({received:true});
 const payment=await prisma.payment.findUnique({where:{providerOrderId:gatewayOrderId},include:{order:{include:{items:true}}}});
 if(!payment)return NextResponse.json({received:true});
 // A valid webhook signature authenticates the payload, but it does not replace
 // checking that the payment belongs to this exact order and matches its amount.
 if(providerPayment&&(
  providerPayment.order_id!==payment.providerOrderId||
  providerPayment.amount!==payment.amountPaise||
  providerPayment.currency!==payment.currency
 ))return NextResponse.json({error:"Payment amount, currency or order reference does not match."},{status:400});
 if((eventId&&payment.webhookEventId===eventId)||payment.status==="CAPTURED"||payment.status==="REFUNDED")return NextResponse.json({received:true,duplicate:true});
 if(event.event==="payment.captured"||event.event==="order.paid"){
  if(!paymentId||providerPayment?.status!=="captured")return NextResponse.json({error:"Razorpay has not confirmed a captured payment."},{status:400});
  if(payment.order.status==="CANCELLED"){
   const keyId=process.env.RAZORPAY_KEY_ID,apiSecret=process.env.RAZORPAY_KEY_SECRET;
   if(!keyId||!apiSecret)return NextResponse.json({error:"Late payment requires manual refund."},{status:503});
   const auth=Buffer.from(keyId+":"+apiSecret).toString("base64");
   const refundResponse=await fetch("https://api.razorpay.com/v1/payments/"+paymentId+"/refund",{method:"POST",headers:{Authorization:"Basic "+auth,"Content-Type":"application/json"},body:JSON.stringify({amount:payment.amountPaise,receipt:"late-"+payment.order.orderNumber}),cache:"no-store"});
   if(!refundResponse.ok)return NextResponse.json({error:"Automatic refund of a late payment failed; reconciliation required."},{status:503});
   const refundData=await refundResponse.json();const processed=refundData.status==="processed";
   await prisma.$transaction([prisma.payment.update({where:{id:payment.id},data:{status:processed?"REFUNDED":"CAPTURED",providerPaymentId:paymentId,webhookEventId:eventId??undefined,refundId:refundData.id,refundStatus:refundData.status,refundAmountPaise:refundData.amount}}),...(processed?[prisma.order.update({where:{id:payment.orderId},data:{status:"REFUNDED"}})]:[])]);
  }else{
   const transition=await prisma.$transaction(async tx=>{
    const claimed=await tx.order.updateMany({where:{id:payment.orderId,status:"PENDING"},data:{status:"CONFIRMED"}});
    if(claimed.count!==1){
     const current=await tx.order.findUnique({where:{id:payment.orderId},select:{status:true,payment:{select:{status:true}}}});
     if(current?.status==="CANCELLED")return "CANCELLED";
     if(current?.status==="CONFIRMED"&&current.payment?.status==="CAPTURED")return "CONFIRMED";
     return "UNCHANGED";
    }
    await tx.payment.update({where:{id:payment.id},data:{status:"CAPTURED",providerPaymentId:paymentId,webhookEventId:eventId??undefined}});
    return "CONFIRMED";
   });
   if(transition==="CANCELLED")return NextResponse.json({error:"Order expired during payment confirmation; retry required for refund reconciliation."},{status:503});
   if(transition==="UNCHANGED")return NextResponse.json({error:"Order state changed during payment confirmation; reconciliation required."},{status:503});
   await Promise.allSettled([sendOrderConfirmation(payment.orderId),sendWhatsAppOrderConfirmation(payment.orderId)]);
  }
 }else if(event.event==="payment.failed"){
  if(providerPayment?.status!=="failed")return NextResponse.json({error:"Razorpay has not confirmed a failed payment."},{status:400});
  // A failed attempt does not release reserved stock: the same Razorpay order may be retried.
  await prisma.payment.update({where:{id:payment.id},data:{status:"FAILED",providerPaymentId:paymentId??undefined,webhookEventId:eventId??undefined}});
 }
 return NextResponse.json({received:true});
}
