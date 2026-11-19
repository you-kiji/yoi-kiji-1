"use client";
import { useMemo,useState } from "react";
import { formatINR } from "@/lib/money";
import { AdminOrderActions } from "@/components/admin-order-actions";
import { AdminFulfillmentForm } from "@/components/admin-fulfillment-form";
type OrderRow={id:string;orderNumber:string;status:string;totalPaise:number;createdAt:string;trackingNumber:string|null;fulfillmentProvider:string|null;user:{name:string|null;email:string}|null;guestName:string|null;guestEmail:string|null;guestPhone:string|null;items:{id:string;productName:string;quantity:number}[];payment:{status:string;provider:string}|null};
const statuses=["PENDING","CONFIRMED","PROCESSING","SHIPPED","DELIVERED","CANCELLED","REFUNDED"];
export function AdminOrderWorkbench({initialOrders}:{initialOrders:OrderRow[]}){
 const [query,setQuery]=useState(""),[status,setStatus]=useState("ALL"),[payment,setPayment]=useState("ALL");
 const orders=useMemo(()=>initialOrders.filter(o=>(status==="ALL"||o.status===status)&&(payment==="ALL"||(o.payment?.status??"NONE")===payment)&&(!query||[o.orderNumber,o.user?.name,o.user?.email,o.guestName,o.guestEmail].some(v=>v?.toLowerCase().includes(query.toLowerCase())))),[initialOrders,query,status,payment]);
 const exportHref="/api/admin/orders/export?"+new URLSearchParams({...(status!=="ALL"?{status}:{}),...(payment!=="ALL"?{payment}:{})}).toString();
 return <section className="admin-order-workbench">
  <div className="admin-order-filters">
   <label>Search order / customer<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Order number, name or email"/></label>
   <label>Order status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="ALL">All statuses</option>{statuses.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
   <label>Payment status<select value={payment} onChange={e=>setPayment(e.target.value)}><option value="ALL">All payments</option>{["CREATED","AUTHORIZED","CAPTURED","FAILED","REFUNDED","NONE"].map(s=><option key={s} value={s}>{s}</option>)}</select></label>
   <a className="primary-link" href={exportHref}>Export CSV ↗</a>
  </div>
  <div className="admin-section-heading"><h2>Order queue</h2><span>{orders.length} of {initialOrders.length} recent orders</span></div>
  <section className="orders-list">{orders.map(o=><article className="order-card" key={o.id}>
   <div><p className="order-number">{o.orderNumber}</p><p>{o.user?.name??o.user?.email??o.guestName??o.guestEmail??"Guest customer"}</p><p>{o.items.length} line item(s) · {new Intl.DateTimeFormat("en-IN",{dateStyle:"medium"}).format(new Date(o.createdAt))}</p></div>
   <div><strong>{formatINR(o.totalPaise)}</strong><p>Payment: {o.payment?.provider==="COD"?"Cash on Delivery":o.payment?.status.toLowerCase()??"unavailable"}</p></div>
   <div><span className="order-status">{o.status.toLowerCase()}</span><AdminOrderActions id={o.id} status={o.status} paymentStatus={o.payment?.status.toLowerCase()??"none"}/><AdminFulfillmentForm id={o.id} initialProvider={o.fulfillmentProvider} initialTracking={o.trackingNumber}/></div>
  </article>)}{orders.length===0&&<p>No orders match these filters.</p>}</section>
 </section>;
}
