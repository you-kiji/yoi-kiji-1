import Link from "next/link";
import { createHash } from "node:crypto";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
export const dynamic="force-dynamic";
export const metadata={title:"Order confirmation",robots:{index:false,follow:false}};
export default async function GuestOrderConfirmation({params,searchParams}:{params:Promise<{orderNumber:string}>;searchParams:Promise<{token?:string}>}){
 const [{orderNumber},{token}]=await Promise.all([params,searchParams]);
 if(!token||token.length<32||token.length>128)notFound();
 const tokenHash=createHash("sha256").update(token).digest("hex");
 const order=await prisma.order.findFirst({where:{orderNumber, userId:null, guestAccessTokenHash:tokenHash},include:{items:true,payment:true}});
 if(!order)notFound();
 const address=order.shippingAddress as {fullName?:string;line1?:string;line2?:string;city?:string;state?:string;postalCode?:string};
 const money=(value:number)=>"₹"+(value/100).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
 return <main className="commerce-page guest-order-confirmation">
  <div className="commerce-breadcrumb"><Link href="/">Home</Link><span>/</span> Order confirmation</div>
  <section className="guest-order-card">
   <p className="eyebrow">YOI KIJI / ORDER RECEIVED</p><h1>Thank you.<br/><em>Your order is in.</em></h1>
   <p className="guest-order-intro">We have received your Cash on Delivery order. Keep this secure page link to check your order details.</p>
   <div className="guest-order-reference"><span>ORDER NUMBER</span><strong>{order.orderNumber}</strong><span className="guest-order-status">{order.status}</span></div>
   <div className="guest-order-lines">{order.items.map(item=><div className="guest-order-line" key={item.id}><span>{item.productName}{item.variantLabel?" · "+item.variantLabel:""} × {item.quantity}</span><strong>{money(item.unitPricePaise*item.quantity)}</strong></div>)}</div>
   <div className="guest-order-total"><span>Order total</span><strong>{money(order.totalPaise)}</strong></div>
   <div className="guest-order-address"><h2>Delivery address</h2><p>{address.fullName}<br/>{address.line1}{address.line2?", "+address.line2:""}<br/>{address.city}, {address.state} {address.postalCode}</p><p>Confirmation email: {order.guestEmail}</p></div>
   <div className="guest-order-payment"><strong>Cash on Delivery</strong><span>Payment is due to the delivery partner when your parcel arrives.</span></div>
   <p className="guest-order-security">This page is protected by a private order-access token. Do not share its URL publicly.</p>
   <Link className="primary-link" href="/shop">Continue exploring</Link>
  </section>
 </main>;
}
