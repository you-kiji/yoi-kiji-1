import Link from "next/link";
import { notFound,redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/money";
import { CancelOrderButton } from "@/components/cancel-order-button";

export const dynamic="force-dynamic";
export const metadata={title:"Track your order"};

const milestones=[
 {status:"CONFIRMED",title:"Order confirmed",description:"Your order has been confirmed and is being prepared."},
 {status:"PROCESSING",title:"Preparing your order",description:"Our team is carefully preparing your selected pieces."},
 {status:"SHIPPED",title:"On its way",description:"Your parcel has been handed over for delivery."},
 {status:"DELIVERED",title:"Delivered",description:"Your order has reached its destination."}
];
const rank:Record<string,number>={CONFIRMED:0,PROCESSING:1,SHIPPED:2,DELIVERED:3};

export default async function OrderTrackingPage({params}:{params:Promise<{id:string}>}){
 const user=await getCurrentUser();
 if(!user)redirect("/login");
 const {id}=await params;
 const order=await prisma.order.findFirst({where:{id,userId:user.id},include:{items:true,payment:true}});
 if(!order)notFound();
 const currentRank=rank[order.status]??-1;
 const address=order.shippingAddress as Record<string,string>;
 const terminal=order.status==="CANCELLED"||order.status==="REFUNDED";
 return <main className="commerce-page">
  <div className="commerce-breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/account">Account</Link><span>/</span><Link href="/account/orders">Orders</Link><span>/</span> {order.orderNumber}</div>
  <header className="commerce-heading"><p className="eyebrow">YOUR YOI KIJI ORDER</p><h1>Every detail,<br/><em>thoughtfully tracked.</em></h1><p>Order {order.orderNumber} · Placed {new Intl.DateTimeFormat("en-IN",{dateStyle:"long"}).format(order.createdAt)}</p></header>
  <section className="order-tracking-layout">
   <article className="order-tracking-main">
    <div className="order-tracking-summary"><div><span className="eyebrow">CURRENT STATUS</span><h2>{order.status.replaceAll("_"," ").toLowerCase()}</h2></div><strong>{formatINR(order.totalPaise)}</strong></div>
    {["PENDING","CONFIRMED","PROCESSING"].includes(order.status) && order.payment?.status !== "CAPTURED" && order.payment?.status !== "REFUNDED" && !order.fulfillmentOrderId && !order.trackingNumber && <CancelOrderButton orderId={order.id} />}
    {terminal?<div className="order-tracking-terminal"><h3>{order.status==="CANCELLED"?"This order was cancelled":"This order was refunded"}</h3><p>For any questions about this order, please contact the store team.</p></div>:order.status==="PENDING"?<div className="order-tracking-terminal"><h3>Payment confirmation pending</h3><p>We’ll begin preparing your order once payment is confirmed.</p></div>:<ol className="order-tracking-timeline">{milestones.map((step,index)=>{const complete=index<=currentRank;const active=index===currentRank;return <li key={step.status} className={[complete?"is-complete":"",active?"is-current":""].filter(Boolean).join(" ")}><span className="order-tracking-marker">{complete?"✓":String(index+1).padStart(2,"0")}</span><div><h3>{step.title}</h3><p>{step.description}</p>{active&&<small>Current stage</small>}</div></li>})}</ol>}
    {order.status==="SHIPPED"&&<div className="order-tracking-carrier"><h3>Shipment details</h3><p><span>Carrier</span><strong>{order.fulfillmentProvider??"Shipping partner"}</strong></p>{order.trackingNumber&&<p><span>Tracking / AWB number</span><strong>{order.trackingNumber}</strong></p>}{order.trackingUrl&&<a className="primary-link" href={order.trackingUrl} target="_blank" rel="noreferrer">Track with carrier ↗</a>}</div>}
   </article>
   <aside className="order-tracking-side">
    <section><h3>Items in this order</h3>{order.items.map(item=><div className="order-tracking-item" key={item.id}><div><strong>{item.productName}</strong>{item.variantLabel&&<p>{item.variantLabel}</p>}<small>Qty {item.quantity}</small></div><strong>{formatINR(item.unitPricePaise*item.quantity)}</strong></div>)}</section>
    <section><h3>Delivering to</h3><p>{address.fullName}</p><p>{address.line1}</p>{address.line2&&<p>{address.line2}</p>}<p>{address.city}, {address.state} {address.postalCode}</p><p>{address.phone}</p></section>
    <section><h3>Payment</h3><p>{order.payment?.status??"Not available"}</p><strong>{formatINR(order.totalPaise)}</strong></section>
   </aside>
  </section>
  <div className="order-tracking-back"><Link href="/account/orders">← Back to all orders</Link><span> · </span><Link href={"/account/orders/"+order.id+"/invoice"}>View order summary ↗</Link></div>
 </main>;
}
