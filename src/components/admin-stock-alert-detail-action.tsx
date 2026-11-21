"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function AdminStockAlertDetailAction({id,status,available}:{id:string;status:string;available:boolean}){
 const router=useRouter();const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 async function send(){setBusy(true);setMessage("");try{const r=await fetch("/api/admin/stock-alerts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Notification failed.");setMessage("Restock notification sent.");router.refresh();}catch(e){setMessage(e instanceof Error?e.message:"Notification failed.");}finally{setBusy(false);}}
 return <section className="admin-detail-card"><div className="admin-detail-card-heading"><div><p className="eyebrow">NOTIFICATION ACTION</p><h2>Send email</h2></div></div><p className="admin-detail-description">{available?"Stock is available. You can send the back-in-stock email.":"This item is not currently available. Restock it before sending."}</p><button type="button" disabled={busy||!available||status==="SENT"||status==="SENDING"} onClick={send}>{busy?"Sending…":status==="SENT"?"Already sent":"Send back-in-stock email"}</button>{message&&<p role="status">{message}</p>}</section>;
}
