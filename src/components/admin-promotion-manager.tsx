"use client";
import Link from "next/link";
import { useState } from "react";
type Coupon={id:string;code:string;description:string|null;discountType:"PERCENTAGE"|"FIXED_AMOUNT";discountValue:number;minimumSubtotalPaise:number;maximumDiscountPaise:number|null;usageLimit:number|null;usageCount:number;startsAt:string|null;endsAt:string|null;isActive:boolean;_count:{redemptions:number}};
export function AdminPromotionManager({initialCoupons}:{initialCoupons:Coupon[]}) {
 const [coupons,setCoupons]=useState(initialCoupons),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const [form,setForm]=useState({code:"",description:"",discountType:"PERCENTAGE" as "PERCENTAGE"|"FIXED_AMOUNT",discountValue:"10",minimumSubtotal:"0",maximumDiscount:"",usageLimit:"",startsAt:"",endsAt:""});
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage("");try{
  const value=Math.round(Number(form.discountValue)*100);
  const payload={code:form.code.trim().toUpperCase(),description:form.description||null,discountType:form.discountType,discountValue:value,minimumSubtotalPaise:Math.round(Number(form.minimumSubtotal)*100),maximumDiscountPaise:form.maximumDiscount?Math.round(Number(form.maximumDiscount)*100):null,usageLimit:form.usageLimit?Number(form.usageLimit):null,startsAt:form.startsAt?new Date(form.startsAt).toISOString():null,endsAt:form.endsAt?new Date(form.endsAt).toISOString():null,isActive:true};
  if(!payload.code||!Number.isFinite(value)||value<=0)throw new Error("Enter a valid code and discount.");
  const res=await fetch("/api/admin/coupons",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const data=await res.json();if(!res.ok)throw new Error(data.error??"Could not create promotion.");
  setCoupons(old=>[{...data.coupon,_count:{redemptions:0}},...old]);setForm({code:"",description:"",discountType:"PERCENTAGE",discountValue:"10",minimumSubtotal:"0",maximumDiscount:"",usageLimit:"",startsAt:"",endsAt:""});setMessage("Promotion created and available according to its schedule.");
 }catch(err){setMessage(err instanceof Error?err.message:"Could not create promotion.");}finally{setBusy(false);}}
 async function disable(id:string){const res=await fetch("/api/admin/coupons?id="+id,{method:"DELETE"});const data=await res.json();if(!res.ok){setMessage(data.error??"Could not disable promotion.");return;}setCoupons(old=>old.map(c=>c.id===id?{...c,isActive:false}:c));setMessage("Promotion disabled.");}
 return <div className="admin-content-workspace">
  <section className="admin-content-panel"><div className="admin-section-heading"><h2>Create a promotion</h2><span>Checkout-validated discounts</span></div>
   <form onSubmit={submit} className="admin-content-form">
    <label>Promotion code<input required minLength={3} maxLength={32} value={form.code} onChange={e=>setForm({...form,code:e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g,"")})} placeholder="WELCOME10"/></label>
    <label>Discount type<select value={form.discountType} onChange={e=>setForm({...form,discountType:e.target.value as "PERCENTAGE"|"FIXED_AMOUNT"})}><option value="PERCENTAGE">Percentage</option><option value="FIXED_AMOUNT">Fixed amount (₹)</option></select></label>
    <label>{form.discountType==="PERCENTAGE"?"Discount (%)":"Discount (₹)"}<input type="number" required min="0.01" step="0.01" max={form.discountType==="PERCENTAGE"?"100":"1000000"} value={form.discountValue} onChange={e=>setForm({...form,discountValue:e.target.value})}/></label>
    <label>Minimum cart value (₹)<input type="number" min="0" step="0.01" value={form.minimumSubtotal} onChange={e=>setForm({...form,minimumSubtotal:e.target.value})}/></label>
    <label>Maximum discount (₹, optional)<input type="number" min="0.01" step="0.01" value={form.maximumDiscount} onChange={e=>setForm({...form,maximumDiscount:e.target.value})}/></label>
    <label>Total uses (optional)<input type="number" min="1" step="1" value={form.usageLimit} onChange={e=>setForm({...form,usageLimit:e.target.value})}/></label>
    <label>Starts at (optional)<input type="datetime-local" value={form.startsAt} onChange={e=>setForm({...form,startsAt:e.target.value})}/></label>
    <label>Ends at (optional)<input type="datetime-local" value={form.endsAt} onChange={e=>setForm({...form,endsAt:e.target.value})}/></label>
    <label className="wide">Internal description<input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="New customer welcome offer"/></label>
    <button disabled={busy}>{busy?"Creating…":"Create promotion"}</button>
   </form>
   <p className="admin-helper">Percentage values are stored as basis points. Discounts apply to merchandise subtotal, not delivery charges. Usage limits are enforced during order creation.</p>
  </section>
  <section className="admin-content-panel"><div className="admin-section-heading"><h2>Promotion register</h2><span>{coupons.length} codes</span></div>
   <div className="admin-content-list">{coupons.map(c=> <article key={c.id}><div><strong><Link href={`/admin/promotions/${c.id}`}>{c.code}</Link></strong><p><Link className="admin-product-open-link" href={`/admin/promotions/${c.id}`}>Open promotion details</Link></p><p>{c.discountType==="PERCENTAGE"?((c.discountValue/100).toFixed(2)+"% off"):("₹"+(c.discountValue/100).toFixed(2)+" off")} · Min ₹{(c.minimumSubtotalPaise/100).toFixed(2)}</p><small>{c.usageCount} / {c.usageLimit??"∞"} uses · {c.isActive?"Active":"Disabled"}</small></div>{c.isActive&&<button type="button" onClick={()=>disable(c.id)}>Disable</button>}</article>)}</div>
  </section>
  {message&&<p role="status" className="admin-feedback">{message}</p>}
 </div>;
}
