"use client";
import { useState } from "react";
type CartLine={productId:string;variantId?:string;quantity:number};
export function AddToCartButton({productId,variantId,disabled=false}:{productId:string;variantId?:string;disabled?:boolean}){
 const [added,setAdded]=useState(false);
 function add(){
  const raw=localStorage.getItem("yoikiji_cart");
  let cart:CartLine[]=[];try{cart=raw?JSON.parse(raw):[]}catch{cart=[]}
  const key=cart.find(x=>x.productId===productId&&x.variantId===variantId);
  if(key)key.quantity=Math.min(10,key.quantity+1);else cart.push({productId,...(variantId?{variantId}:{}),quantity:1});
  localStorage.setItem("yoikiji_cart",JSON.stringify(cart));setAdded(true);
  window.dispatchEvent(new Event("yoikiji-cart-updated"));
 }
 return <button className="primary-link add-to-bag" type="button" disabled={disabled} onClick={add}>{added?"Added to bag":"Add to bag"}</button>;
}
