"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
import { formatINR } from "@/lib/money";
import { AdminOrderActions } from "@/components/admin-order-actions";
import { AdminFulfillmentForm } from "@/components/admin-fulfillment-form";
type OrderRow={id:string;orderNumber:string;status:string;totalPaise:number;createdAt:string;trackingNumber:string|null;fulfillmentProvider:string|null;user:{name:string|null;email:string}|null;guestName:string|null;guestEmail:string|null;guestPhone:string|null;items:{id:string;productName:string;quantity:number}[];payment:{status:string;provider:string}|null};
const statuses=["PENDING","CONFIRMED","PROCESSING","SHIPPED","DELIVERED","CANCELLED","REFUNDED"];
export function AdminOrderWorkbench({initialOrders,initialTotal}:{initialOrders:OrderRow[];initialTotal:number}){
 const [orders,setOrders]=useState(initialOrders),[total,setTotal]=useState(initialTotal);
 const [query,setQuery]=useState(""),[status,setStatus]=useState("ALL"),[payment,setPayment]=useState("ALL"),[page,setPage]=useState(1);
 const [loading,setLoading]=useState(false),[error,setError]=useState("");
 const [selected,setSelected]=useState<string[]>([]),[bulkBusy,setBulkBusy]=useState(false),[bulkMessage,setBulkMessage]=useState("");
 const pageSize=20,totalPages=Math.max(1,Math.ceil(total/pageSize));
 useEffect(()=>{
  const controller=new AbortController();
  async function load(){
   setLoading(true);setError("");
   try{
    const params=new URLSearchParams({page:String(page),status,payment,...(query.trim()?{q:query.trim()}:{})});
    const response=await fetch("/api/admin/orders?"+params.toString(),{signal:controller.signal,cache:"no-store"});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error??"Could not load orders.");
    setOrders(data.orders??[]);setTotal(data.total??0);
   }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Could not load orders.");}
   finally{if(!controller.signal.aborted)setLoading(false);}
  }
  void load();
  return ()=>controller.abort();
 },[page,status,payment,query]);
 const exportHref="/api/admin/orders/export?"+new URLSearchParams({...(status!=="ALL"?{status}:{}),...(payment!=="ALL"?{payment}:{}),...(query.trim()?{q:query.trim()}:{})}).toString();
 const eligible=orders.filter(o=>selected.includes(o.id)&&(o.status==="PENDING"||o.status==="CONFIRMED")&&o.payment?.status!=="CAPTURED");
 const visibleIds=orders.map(o=>o.id),allVisibleSelected=visibleIds.length>0&&visibleIds.every(id=>selected.includes(id));
 function resetFilters(){setSelected([]);setPage(1);}
 async function bulkCancel(){
  if(!eligible.length||!window.confirm("Cancel "+eligible.length+" selected eligible order(s)? Stock and coupon reservations will be released using the normal order cancellation workflow."))return;
  setBulkBusy(true);setBulkMessage("");const failed:string[]=[];let cancelled=0;
  try{
   for(const order of eligible){
    try{const response=await fetch("/api/admin/orders/"+order.id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:"CANCELLED"})});const data=await response.json();if(!response.ok)throw new Error(data.error??"Cancellation failed.");cancelled++;}
    catch{failed.push(order.id);}
   }
   setBulkMessage(failed.length?"Cancelled "+cancelled+" order(s); "+failed.length+" need review.":"Successfully cancelled "+cancelled+" order(s).");
   setSelected(failed);
   if(!failed.length)window.location.reload();
  }finally{setBulkBusy(false);}
 }
 return <section className="admin-order-workbench">
  <div className="admin-order-filters">
   <label>Search order / customer<input value={query} onChange={e=>{setQuery(e.target.value);resetFilters();}} placeholder="Order number, name or email"/></label>
   <label>Order status<select value={status} onChange={e=>{setStatus(e.target.value);resetFilters();}}><option value="ALL">All statuses</option>{statuses.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
   <label>Payment status<select value={payment} onChange={e=>{setPayment(e.target.value);resetFilters();}}><option value="ALL">All payments</option>{["CREATED","AUTHORIZED","CAPTURED","FAILED","REFUNDED","NONE"].map(s=><option key={s} value={s}>{s}</option>)}</select></label>
   <a className="primary-link" href={exportHref}>Export CSV</a>
  </div>
  <div className="admin-section-heading"><h2>Order queue</h2><span>{total} matching orders</span></div>
  <div className="admin-order-bulkbar"><label><input type="checkbox" checked={allVisibleSelected} onChange={e=>setSelected(current=>e.target.checked?[...new Set([...current,...visibleIds])]:current.filter(id=>!visibleIds.includes(id)))}/> Select page</label><span>{selected.length} selected · {eligible.length} eligible to cancel</span><button type="button" disabled={bulkBusy||eligible.length===0} onClick={bulkCancel}>{bulkBusy?"Cancelling…":"Cancel selected"}</button></div>
  {bulkMessage&&<p className="admin-feedback" role="status">{bulkMessage}</p>}
  {error&&<p role="alert" className="admin-feedback">{error}</p>}
  <section className="orders-list" aria-busy={loading}>{orders.map(o=><article className="order-card" key={o.id}>
   <div className="admin-order-select"><input type="checkbox" aria-label={"Select order "+o.orderNumber} checked={selected.includes(o.id)} onChange={e=>setSelected(current=>e.target.checked?[...new Set([...current,o.id])]:current.filter(id=>id!==o.id))}/><div><p className="order-number"><Link href={`/admin/orders/${o.id}`}>{o.orderNumber}</Link></p><Link className="admin-product-open-link" href={`/admin/orders/${o.id}`}>Open order details</Link><p>{o.user?.name??o.user?.email??o.guestName??o.guestEmail??"Guest customer"}</p><p>{o.items.length} line item(s) · {new Intl.DateTimeFormat("en-IN",{dateStyle:"medium"}).format(new Date(o.createdAt))}</p></div></div>
   <div><strong>{formatINR(o.totalPaise)}</strong><p>Payment: {o.payment?.provider==="COD"?"Cash on Delivery":o.payment?.status.toLowerCase()??"unavailable"}</p></div>
   <div><span className="order-status">{o.status.toLowerCase()}</span><AdminOrderActions id={o.id} status={o.status} paymentStatus={o.payment?.status.toLowerCase()??"none"} paymentProvider={o.payment?.provider??"none"}/><AdminFulfillmentForm id={o.id} initialProvider={o.fulfillmentProvider} initialTracking={o.trackingNumber}/></div>
  </article>)}{orders.length===0&&!loading&&<p>No orders match these filters.</p>}</section>
  <div className="admin-order-pagination"><span>Showing {total?((page-1)*pageSize+1):0}–{Math.min(page*pageSize,total)} of {total} orders</span><div><button type="button" disabled={page<=1||loading} onClick={()=>{setPage(v=>v-1);setSelected([]);}}>Previous</button><span>Page {page} of {totalPages}</span><button type="button" disabled={page>=totalPages||loading} onClick={()=>{setPage(v=>v+1);setSelected([]);}}>Next</button></div></div>
 </section>;
}
