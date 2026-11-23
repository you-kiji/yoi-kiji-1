"use client";
import Link from "next/link";
import { useMemo,useState } from "react";
type Customer={id:string;name:string|null;email:string;whatsappOptIn:boolean;createdAt:string;orderCount:number;ltvPaise:number;lastPurchaseAt:string|null;tags:{name:string;color:string}[]};
const money=(paise:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(paise/100);
export function AdminCustomerInsights({customers}:{customers:Customer[]}){
 const [query,setQuery]=useState(""),[segment,setSegment]=useState("ALL"),[page,setPage]=useState(1);
 const [selected,setSelected]=useState<string[]>([]),[tagName,setTagName]=useState(""),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState("");
 const now=Date.now();
 const classify=(c:Customer)=>{if(c.ltvPaise>=5000000)return "VIP";if(c.orderCount>=2)return "REPEAT";if(c.orderCount>0&&c.lastPurchaseAt&&now-new Date(c.lastPurchaseAt).getTime()>90*86400000)return "AT_RISK";if(now-new Date(c.createdAt).getTime()<=30*86400000)return "NEW";return "REGULAR";};
 const rows=useMemo(()=>{
  const normalized=query.toLowerCase();
  return customers.map(c=>({...c,segment:classify(c)})).filter(c=>{
   const matchesSegment=segment==="ALL"||c.segment===segment;
   const matchesQuery=!normalized||[c.name,c.email].some(value=>value?.toLowerCase().includes(normalized));
   return matchesSegment&&matchesQuery;
  });
 },[customers,query,segment]);
 const pageSize=25,totalPages=Math.max(1,Math.ceil(rows.length/pageSize)),pageRows=rows.slice((page-1)*pageSize,page*pageSize);
 const totalLtv=customers.reduce((sum,c)=>sum+c.ltvPaise,0),repeat=customers.filter(c=>c.orderCount>=2).length,vip=customers.filter(c=>c.ltvPaise>=5000000).length,subscribed=customers.filter(c=>c.whatsappOptIn).length;
 const visibleIds=pageRows.map(c=>c.id),allVisibleSelected=visibleIds.length>0&&visibleIds.every(id=>selected.includes(id));
 function toggle(id:string,checked:boolean){setSelected(current=>checked?[...new Set([...current,id])]:current.filter(value=>value!==id));}
 async function applyTag(){
  if(!selected.length||tagName.trim().length<2)return;
  setBusy(true);setFeedback("");
  try{const response=await fetch("/api/admin/customers/bulk",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userIds:selected.slice(0,100),name:tagName.trim()})});const data=await response.json();if(!response.ok)throw new Error(data.error??"Bulk tagging failed.");setFeedback("Tag applied to "+data.selected+" selected customers ("+data.assigned+" new assignments).");setSelected([]);setTagName("");window.location.reload();}
  catch(error){setFeedback(error instanceof Error?error.message:"Bulk tagging failed.");}
  finally{setBusy(false);}
 }
 return <div className="customer-insights">
  <div className="admin-stats"><article><span>Customer lifetime value</span><strong>{money(totalLtv)}</strong><small>Recognised paid-order value</small></article><article><span>Repeat customers</span><strong>{repeat}</strong><small>{customers.length?Math.round(repeat/customers.length*100):0}% of registered customers</small></article><article><span>VIP customers</span><strong>{vip}</strong><small>Lifetime spend ≥ ₹50,000</small></article><article><span>WhatsApp consent</span><strong>{subscribed}</strong><small>Explicitly opted-in accounts</small></article></div>
  <div className="customer-filter-bar"><a className="primary-link" href="/api/admin/reports/export?type=customers">Export customer CSV</a><label>Search customers<input value={query} onChange={e=>{setQuery(e.target.value);setPage(1);setSelected([]);}} placeholder="Name or email address"/></label><label>Customer segment<select value={segment} onChange={e=>{setSegment(e.target.value);setPage(1);setSelected([]);}}><option value="ALL">All customers</option><option value="VIP">VIP · ₹50k+ lifetime spend</option><option value="REPEAT">Repeat · 2+ paid orders</option><option value="AT_RISK">At risk · no purchase in 90 days</option><option value="NEW">New · joined in 30 days</option><option value="REGULAR">Regular</option></select></label><span>{rows.length} shown</span></div>
  <div className="admin-blog-bulkbar"><label><input type="checkbox" checked={allVisibleSelected} onChange={e=>setSelected(current=>e.target.checked?[...new Set([...current,...visibleIds])]:current.filter(id=>!visibleIds.includes(id)))}/> Select page</label><span>{selected.length} selected · maximum 100 per action</span><input aria-label="Customer tag name" value={tagName} onChange={e=>setTagName(e.target.value)} maxLength={40} placeholder="Tag name to apply"/><button type="button" disabled={busy||selected.length===0||tagName.trim().length<2||selected.length>100} onClick={applyTag}>{busy?"Applying…":"Apply tag"}</button></div>
  {feedback&&<p className="admin-feedback" role="status">{feedback}</p>}
  <section className="admin-customer-list">{pageRows.map(c=><article className="order-card" key={c.id}><div className="admin-customer-select"><input type="checkbox" aria-label={"Select "+(c.name??c.email)} checked={selected.includes(c.id)} onChange={e=>toggle(c.id,e.target.checked)}/><div><Link href={"/admin/customers/"+c.id} className="text-link"><strong>{c.name||"Customer"}</strong></Link><p>{c.email}</p><small>Joined {new Intl.DateTimeFormat("en-IN",{dateStyle:"medium"}).format(new Date(c.createdAt))}</small>{c.tags.length>0&&<div className="customer-tag-list">{c.tags.map(tag=><span key={tag.name} style={{borderColor:tag.color,color:tag.color}}>{tag.name}</span>)}</div>}</div></div><div><strong>{money(c.ltvPaise)} lifetime</strong><p>{c.orderCount} paid order(s)</p><small>{c.lastPurchaseAt?"Last purchase "+new Intl.DateTimeFormat("en-IN",{dateStyle:"medium"}).format(new Date(c.lastPurchaseAt)):"No paid orders yet"}</small></div><div><span className="order-status">{c.segment.replace("_"," ").toLowerCase()}</span><small>{c.whatsappOptIn?"WhatsApp opted in":"No WhatsApp consent"}</small></div></article>)}{rows.length===0&&<p>No customers match these filters.</p>}</section>
  <div className="admin-customer-pagination"><span>Showing {rows.length?((page-1)*pageSize+1):0}–{Math.min(page*pageSize,rows.length)} of {rows.length} matching customers</span><div><button type="button" disabled={page<=1} onClick={()=>{setPage(v=>v-1);setSelected([]);}}>Previous</button><span>Page {page} of {totalPages}</span><button type="button" disabled={page>=totalPages} onClick={()=>{setPage(v=>v+1);setSelected([]);}}>Next</button></div></div>
 </div>;
}
