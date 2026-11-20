"use client";
import { useEffect,useState } from "react";
import { useRouter } from "next/navigation";
export function WishlistButton({productId}:{productId:string}){
 const router=useRouter();
 const [saved,setSaved]=useState(false),[signedIn,setSignedIn]=useState(false),[checking,setChecking]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 useEffect(()=>{
  let active=true;
  fetch("/api/account/wishlist",{cache:"no-store"}).then(async response=>{
   if(!active)return;
   if(response.status===401){setSignedIn(false);return;}
   if(!response.ok)throw new Error("Wishlist status unavailable.");
   const data=await response.json();if(!active)return;
   setSignedIn(true);setSaved(data.items.some((item:{productId:string})=>item.productId===productId));
  }).catch(()=>{}).finally(()=>{if(active)setChecking(false);});
  return()=>{active=false;};
 },[productId]);
 async function toggle(){
  if(!signedIn){router.push("/login?next="+encodeURIComponent(window.location.pathname));return;}
  setBusy(true);setMessage("");
  try{
   const response=saved?await fetch("/api/account/wishlist?productId="+encodeURIComponent(productId),{method:"DELETE"}):await fetch("/api/account/wishlist",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId})});
   const data=await response.json().catch(()=>({}));
   if(response.status===401){router.push("/login?next="+encodeURIComponent(window.location.pathname));return;}
   if(!response.ok)throw new Error(data.error??"Wishlist update failed.");
   setSaved(!saved);setMessage(saved?"Removed from your wishlist.":"Saved to your wishlist.");
  }catch(reason){setMessage(reason instanceof Error?reason.message:"Wishlist update failed.");}
  finally{setBusy(false);}
 }
 const label=saved?"Remove from wishlist":"Add to wishlist";
 return <div className="wishlist-control">
  <button type="button" className={saved?"wishlist-icon-button is-saved":"wishlist-icon-button"} disabled={busy||checking} aria-label={busy?"Updating wishlist":label} aria-pressed={saved} title={signedIn?label:"Sign in to save this item"} onClick={toggle}>
   <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z"/></svg>
  </button>
  <span className="wishlist-feedback" role="status" aria-live="polite">{message}</span>
 </div>;
}
