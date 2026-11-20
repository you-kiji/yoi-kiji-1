"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
type Review={id:string;rating:number;title:string|null;body:string;status:string;verifiedPurchase:boolean;createdAt:string;user:{name:string|null;email:string};product:{name:string;slug:string;sku:string};adminNote:string|null};
type Filter="PENDING"|"APPROVED"|"REJECTED"|"ALL";
export function AdminReviewManager({initialReviews}:{initialReviews:Review[]}){
 const [reviews,setReviews]=useState(initialReviews),[filter,setFilter]=useState<Filter>("PENDING"),[query,setQuery]=useState(""),[minimumRating,setMinimumRating]=useState("ALL"),[busy,setBusy]=useState<string|null>(null),[message,setMessage]=useState(""),[notes,setNotes]=useState<Record<string,string>>({});
 const counts=useMemo(()=>({all:reviews.length,pending:reviews.filter(r=>r.status==="PENDING").length,approved:reviews.filter(r=>r.status==="APPROVED").length,rejected:reviews.filter(r=>r.status==="REJECTED").length,verified:reviews.filter(r=>r.verifiedPurchase).length}),[reviews]);
 const visible=reviews.filter(r=>(filter==="ALL"||r.status===filter)&&r.rating>=(minimumRating==="ALL"?1:Number(minimumRating))&&(!query||[r.product.name,r.product.sku,r.user.name??"",r.user.email,r.title??"",r.body].some(v=>v.toLowerCase().includes(query.toLowerCase()))));
 async function save(id:string,status?:"APPROVED"|"REJECTED"){
  setBusy(id);setMessage("");
  try{
   const payload={id,...(status?{status}:{}),adminNote:notes[id]??reviews.find(r=>r.id===id)?.adminNote??""};
   const response=await fetch("/api/admin/reviews",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
   const data=await response.json();if(!response.ok)throw new Error(data.error??"Review update failed.");
   setReviews(old=>old.map(r=>r.id===id?{...r,status:data.review.status,adminNote:data.review.adminNote}:r));
   setNotes(old=>({...old,[id]:data.review.adminNote??""}));
   setMessage(status?"Review "+status.toLowerCase()+".":"Internal moderation note saved.");
  }catch(e){setMessage(e instanceof Error?e.message:"Review update failed.");}finally{setBusy(null);}
 }
 return <section className="admin-review-workspace">
  <div className="admin-stats" aria-label="Review overview">
   <article><span>Total reviews</span><strong>{counts.all}</strong><small>All submitted reviews</small></article>
   <article><span>Awaiting moderation</span><strong>{counts.pending}</strong><small>Not visible on storefront</small></article>
   <article><span>Published</span><strong>{counts.approved}</strong><small>Approved customer feedback</small></article>
   <article><span>Verified purchases</span><strong>{counts.verified}</strong><small>Linked to an order</small></article>
  </div>
  <div className="admin-review-filters">
   <label>Review status<select value={filter} onChange={e=>setFilter(e.target.value as Filter)}><option value="PENDING">Pending moderation</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="ALL">All reviews</option></select></label>
   <label>Minimum rating<select value={minimumRating} onChange={e=>setMinimumRating(e.target.value)}><option value="ALL">Any rating</option><option value="5">5 stars</option><option value="4">4+ stars</option><option value="3">3+ stars</option><option value="2">2+ stars</option><option value="1">1+ stars</option></select></label>
   <label>Search<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Product, SKU, customer or review"/></label>
   <span>{visible.length} review(s)</span>
  </div>
  <div className="admin-review-list">{visible.map(r=><article key={r.id}>
   <div className="admin-review-top"><div><strong><Link href={`/admin/reviews/${r.id}`}>{r.product.name}</Link></strong><Link className="admin-product-open-link" href={`/admin/reviews/${r.id}`}>Open review details</Link><small>{r.product.sku} · {r.product.slug}</small></div><span className="order-status">{r.status.toLowerCase()}</span></div>
   <p className="admin-review-stars">{"★".repeat(r.rating)}{"☆".repeat(5-r.rating)} {r.verifiedPurchase?"· Verified purchase":"· Purchase not verified"}</p>
   {r.title&&<h3>{r.title}</h3>}<p>{r.body}</p>
   <small>{r.user.name??r.user.email} · {r.user.email} · {new Intl.DateTimeFormat("en-IN",{dateStyle:"medium"}).format(new Date(r.createdAt))}</small>
   <label className="admin-review-note">Internal moderation note<textarea rows={2} maxLength={1000} value={notes[r.id]??r.adminNote??""} onChange={e=>setNotes(old=>({...old,[r.id]:e.target.value}))} placeholder="Record a private moderation reason or follow-up"/></label>
   <div className="admin-review-actions">
    <button type="button" disabled={busy===r.id} onClick={()=>save(r.id)}>{busy===r.id?"Saving…":"Save internal note"}</button>
    {r.status!=="APPROVED"&&<button type="button" disabled={busy===r.id} onClick={()=>save(r.id,"APPROVED")}>Approve & publish</button>}
    {r.status!=="REJECTED"&&<button type="button" className="secondary" disabled={busy===r.id} onClick={()=>save(r.id,"REJECTED")}>Reject</button>}
   </div>
  </article>)}{visible.length===0&&<p>No reviews match these filters.</p>}</div>
  {message&&<p role="status" className="admin-feedback">{message}</p>}
 </section>;
}
