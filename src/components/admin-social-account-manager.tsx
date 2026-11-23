"use client";
import {useEffect,useState} from "react";
type Account={id:string;platform:string;label:string;url:string;placement:string;sortOrder:number;isActive:boolean};
export function SocialAccountManager(){
 const [items,setItems]=useState<Account[]>([]);const [platform,setPlatform]=useState("Instagram");const [label,setLabel]=useState("Instagram");const [url,setUrl]=useState("");const [placement,setPlacement]=useState("footer");const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 async function load(){const r=await fetch("/api/admin/social-accounts",{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to load social accounts");setItems(d.accounts);}
 useEffect(()=>{void load().catch(e=>setMessage(e.message));},[]);
 async function add(e:React.FormEvent){e.preventDefault();setBusy(true);try{const r=await fetch("/api/admin/social-accounts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({platform,label,url,placement,sortOrder:items.length,isActive:true})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not add account");setItems(old=>[...old,d.account]);setUrl("");setMessage("Social account added.");}catch(e){setMessage(e instanceof Error?e.message:"Save failed");}finally{setBusy(false);}}
 async function hide(id:string){const r=await fetch("/api/admin/social-accounts?id="+id,{method:"DELETE"});if(!r.ok){setMessage("Could not hide account");return;}setItems(old=>old.map(x=>x.id===id?{...x,isActive:false}:x));}
 return <section className="admin-content-panel"><div className="admin-section-heading"><h2>Social media accounts</h2><span>Storefront header and footer links</span></div>
 <form className="admin-content-form" onSubmit={add}>
 <label>Platform<select value={platform} onChange={e=>{setPlatform(e.target.value);setLabel(e.target.value);}}>{["Instagram","Facebook","Pinterest","YouTube","TikTok","X","LinkedIn","Other"].map(x=><option key={x}>{x}</option>)}</select></label>
 <label>Display label<input required value={label} onChange={e=>setLabel(e.target.value)}/></label>
 <label className="wide">Profile URL<input required type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://…"/></label>
 <label>Placement<select value={placement} onChange={e=>setPlacement(e.target.value)}><option value="header">Header</option><option value="footer">Footer</option><option value="both">Header and footer</option></select></label>
 <button disabled={busy}>{busy?"Saving…":"Add social account"}</button></form>
 <div className="admin-content-list">{items.length ? items.map(item=><article key={item.id}><div><strong>{item.label} · {item.platform}</strong><p>{item.url}</p><small>{item.placement} · {item.isActive?"Enabled":"Disabled"}</small></div>{item.isActive&&<button type="button" onClick={()=>void hide(item.id)}>Disable</button>}</article>) : <p className="admin-feedback">No social profiles added yet. Add Instagram, Facebook, Pinterest, YouTube or another profile above. Active accounts assigned to Footer or Header and footer appear as clickable icons on the storefront.</p>}</div>
 {message&&<p role="status" className="admin-feedback">{message}</p>}</section>;
}
