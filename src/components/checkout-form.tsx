"use client";
import Link from "next/link";
import Script from "next/script";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
declare global { interface Window { Razorpay?: new (options: Record<string, unknown>) => { open: () => void }; } }
type CartLine={productId:string;variantId?:string;quantity:number};
type QuoteLine={productId:string;variantId:string|null;name:string;variantLabel:string|null;quantity:number;unitPricePaise:number;lineTotalPaise:number;image:string|null;availableQty:number};
type ShippingForm={fullName:string;phone:string;line1:string;line2:string;city:string;state:string;postalCode:string;countryCode:string};
const emptyForm:ShippingForm={fullName:"",phone:"",line1:"",line2:"",city:"",state:"",postalCode:"",countryCode:"IN"};
function formatPrice(paise:number){return "₹"+(paise/100).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});}
export function CheckoutForm({isAuthenticated,labels={}}:{isAuthenticated:boolean;labels?:Record<string,string>}){
 const router=useRouter();\n const t=(key:string,fallback:string)=>labels[key]??fallback;
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[couponCode,setCouponCode]=useState("");
 const [guestEmail,setGuestEmail]=useState(""),[paymentMethod,setPaymentMethod]=useState<"COD"|"RAZORPAY">("COD");
 const [summaryLines,setSummaryLines]=useState<QuoteLine[]>([]),[summarySubtotal,setSummarySubtotal]=useState(0),[summaryShipping,setSummaryShipping]=useState(0),[summaryDiscount,setSummaryDiscount]=useState(0),[summaryTax,setSummaryTax]=useState(0),[summaryTotal,setSummaryTotal]=useState(0),[appliedCoupon,setAppliedCoupon]=useState<string|null>(null),[summaryLoading,setSummaryLoading]=useState(true),[summaryError,setSummaryError]=useState("");
 const [form,setForm]=useState<ShippingForm>(emptyForm);
 function change(key:keyof ShippingForm,value:string){setForm(previous=>({...previous,[key]:value}));}
 useEffect(()=>{
  const controller=new AbortController();let active=true;
  async function load(){
   const code=couponCode.trim().toUpperCase();
   if(code&&code.length<3){setSummaryError(t("checkout.couponMin","Enter at least 3 characters for the promotion code, or clear the field."));setSummaryLoading(false);return;}
   setSummaryLoading(true);
   try{
    const items:CartLine[]=JSON.parse(localStorage.getItem("yoikiji_cart")??"[]");
    if(!Array.isArray(items)||!items.length){if(active)setSummaryLines([]);return;}
    const response=await fetch("/api/cart/quote",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({items,...(code?{couponCode:code}:{})}),signal:controller.signal});
    const data=await response.json();if(!response.ok)throw new Error(data.error??t("checkout.quoteError","Your bag could not be verified."));
    if(active){setSummaryLines(data.items??[]);setSummarySubtotal(data.subtotalPaise??0);setSummaryShipping(data.shippingPaise??0);setSummaryDiscount(data.discountPaise??0);setSummaryTax(data.taxPaise??0);setSummaryTotal(data.totalPaise??0);setAppliedCoupon(data.appliedCoupon??null);setSummaryError("");}
   }catch(reason){if(!active||(reason instanceof DOMException&&reason.name==="AbortError"))return;setSummaryError(reason instanceof Error?reason.message:t("checkout.quoteError","Your bag could not be verified."));}
   finally{if(active)setSummaryLoading(false);}
  }
  void load();return()=>{active=false;controller.abort();};
 },[couponCode]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setError("");
  try{
   if(!isAuthenticated&&paymentMethod!=="COD")throw new Error(t("checkout.onlineAccountRequired","Please create an account or sign in before choosing online payment."));
   const items:CartLine[]=JSON.parse(localStorage.getItem("yoikiji_cart")??"[]");
   if(!Array.isArray(items)||!items.length)throw new Error(t("checkout.emptyBag","Your bag is empty."));
   let checkoutKey=localStorage.getItem("yoikiji_checkout_key");if(!checkoutKey){checkoutKey=crypto.randomUUID();localStorage.setItem("yoikiji_checkout_key",checkoutKey);}
   let guestAccessToken=localStorage.getItem("yoikiji_checkout_access_token");
   if(!guestAccessToken){guestAccessToken=crypto.randomUUID()+crypto.randomUUID();localStorage.setItem("yoikiji_checkout_access_token",guestAccessToken);}
   const response=await fetch("/api/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
    checkoutKey,guestAccessToken,paymentMethod,items,
    ...(!isAuthenticated?{guestEmail:guestEmail.trim().toLowerCase()}:{}),
    shippingAddress:{...form,fullName:form.fullName.trim(),phone:form.phone.trim(),line1:form.line1.trim(),line2:form.line2.trim(),city:form.city.trim(),state:form.state.trim(),postalCode:form.postalCode.trim()},
    ...(couponCode.trim()?{couponCode:couponCode.trim().toUpperCase()}:{}),
   })});
   const data=await response.json();if(!response.ok)throw new Error(data.error??t("checkout.startError","Checkout could not start."));
   if(paymentMethod==="COD"){
    localStorage.removeItem("yoikiji_cart");localStorage.removeItem("yoikiji_checkout_key");window.dispatchEvent(new Event("yoikiji-cart-updated"));
    if(!isAuthenticated&&data.guestAccessToken){localStorage.removeItem("yoikiji_checkout_access_token");router.push("/order-confirmation/"+encodeURIComponent(data.orderNumber)+"?token="+encodeURIComponent(data.guestAccessToken));}
    else router.push("/account/orders?placed="+encodeURIComponent(data.orderNumber));
    router.refresh();return;
   }
   if(!window.Razorpay)throw new Error(t("checkout.paymentLoading","Payment window is still loading. Please try again."));
   const payment=new window.Razorpay({key:data.keyId,amount:data.amount,currency:data.currency,name:"YOI KIJI",description:"Order "+data.orderNumber,order_id:data.razorpayOrderId,prefill:{name:form.fullName,contact:form.phone},theme:{color:"#0e300e"},handler:async(result:Record<string,string>)=>{
    try{const verified=await fetch("/api/payments/razorpay/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(result)});const resultData=await verified.json();if(!verified.ok||resultData.verified!==true){setError(resultData.error??resultData.message??t("checkout.paymentPending","Payment is awaiting confirmation. Check your order history shortly."));return;}localStorage.removeItem("yoikiji_cart");localStorage.removeItem("yoikiji_checkout_key");window.dispatchEvent(new Event("yoikiji-cart-updated"));router.push("/account/orders?placed="+encodeURIComponent(resultData.orderNumber));router.refresh();}
    catch{setError(t("checkout.paymentVerifyError","We could not confirm the payment response. Please check your order history before trying again."));}
   }});
   payment.open();
  }catch(reason){setError(reason instanceof Error?reason.message:t("checkout.startError","Unable to start checkout."));}
  finally{setBusy(false);}
 }
 const noItems=!summaryLoading&&summaryLines.length===0;
 return <>
  <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive"/>
  <form className="checkout-form premium-form" onSubmit={submit}>
   <section className="checkout-summary" aria-labelledby="checkout-summary-heading">
    <div className="checkout-summary-heading"><div><p className="eyebrow">{t("checkout.summaryEyebrow","BEFORE WE SEND IT HOME")}</p><h2 id="checkout-summary-heading">{t("checkout.yourOrder","Your order")}</h2></div><span>{summaryLines.reduce((n,line)=>n+line.quantity,0)} {t("checkout.items","items")}</span></div>
    {summaryLoading?<p className="checkout-summary-message" role="status">{t("checkout.checking","Checking availability and current prices…")}</p>:summaryError?<div className="checkout-summary-message" role="alert"><p>{summaryError}</p>{!couponCode&&<Link href="/cart">Return to your bag</Link>}</div>:noItems?<div className="checkout-summary-message"><p>{t("checkout.emptyBagHint","Your bag is empty. Add a piece before continuing.")}</p><Link href="/shop">{t("cart.explore","Explore the collections")}</Link></div>:<>
     <div className="checkout-summary-lines">{summaryLines.map(line=><article className="checkout-summary-line" key={line.productId+(line.variantId??"")}><div className="checkout-summary-image">{line.image?<img src={line.image} alt=""/>:<span>YK</span>}</div><div className="checkout-summary-copy"><strong>{line.name}</strong>{line.variantLabel&&<span>{line.variantLabel}</span>}<small>Qty {line.quantity}</small></div><strong className="checkout-summary-price">{formatPrice(line.lineTotalPaise)}</strong></article>)}</div>
     <div className="checkout-summary-breakdown"><div><span>{t("checkout.itemsSubtotal","Items subtotal")}</span><strong>{formatPrice(summarySubtotal)}</strong></div><div><span>{t("checkout.delivery","Delivery")}</span><strong>{summaryShipping===0?t("checkout.complimentary","Complimentary"):formatPrice(summaryShipping)}</strong></div>{summaryDiscount>0&&<div className="checkout-summary-discount"><span>{t("checkout.promotion","Promotion")} {appliedCoupon?"("+appliedCoupon+")":""}</span><strong>−{formatPrice(summaryDiscount)}</strong></div>}<div><span>{t("checkout.taxEstimate","Included tax estimate")}</span><strong>{formatPrice(summaryTax)}</strong></div><div className="checkout-summary-total"><span>{t("checkout.orderTotal","Order total")}</span><strong>{formatPrice(summaryTotal)}</strong></div></div><p className="checkout-summary-note">{t("checkout.orderNote","The order total is recalculated and stock is reserved securely when you place the order.")}</p>
    </>}
   </section>
   {!isAuthenticated&&<section className="checkout-form-section" aria-labelledby="guest-email-heading"><div className="checkout-section-heading"><span className="checkout-step">01</span><div><h2 id="guest-email-heading">{t("checkout.guestContact","Guest contact")}</h2><p>{t("checkout.guestEmailHint","We will use this email to share your order confirmation and updates.")}</p></div></div><label htmlFor="checkout-guest-email"><span>{t("checkout.email","Email address")}</span><input id="checkout-guest-email" type="email" required maxLength={254} autoComplete="email" placeholder="you@example.com" value={guestEmail} onChange={e=>setGuestEmail(e.target.value)}/></label><p className="field-hint">{t("checkout.alreadyAccount","Already have an account?")} <Link href="/login?next=/checkout">{t("header.account","Sign in")}</Link>. {t("checkout.guestCodHint","You can place a COD order without registering.")}</p></section>}
   <section className="checkout-form-section" aria-labelledby="delivery-contact-heading"><div className="checkout-section-heading"><span className="checkout-step">{isAuthenticated?"01":"02"}</span><div><h2 id="delivery-contact-heading">{t("checkout.contactDetails","Contact details")}</h2><p>{t("checkout.contactHint","Who should we contact about this delivery?")}</p></div></div><div className="checkout-fields">
    <label htmlFor="checkout-full-name"><span>{t("checkout.fullName","Full name")}</span><input id="checkout-full-name" required minLength={2} maxLength={100} autoComplete="name" placeholder={t("checkout.namePlaceholder","Name of the recipient")} value={form.fullName} onChange={e=>change("fullName",e.target.value)}/></label>
    <label htmlFor="checkout-phone"><span>{t("checkout.phone","Phone number")}</span><input id="checkout-phone" type="tel" required minLength={8} maxLength={20} autoComplete="tel" inputMode="tel" placeholder={t("checkout.phonePlaceholder","Your contact number")} value={form.phone} onChange={e=>change("phone",e.target.value)}/></label>
   </div></section>
   <section className="checkout-form-section" aria-labelledby="delivery-address-heading"><div className="checkout-section-heading"><span className="checkout-step">{isAuthenticated?"02":"03"}</span><div><h2 id="delivery-address-heading">{t("checkout.deliveryAddress","Delivery address")}</h2><p>{t("checkout.addressHint","Enter the address where you would like your order delivered.")}</p></div></div><div className="checkout-fields">
    <label className="wide" htmlFor="checkout-address-line1"><span>{t("checkout.address1","Address line 1")}</span><input id="checkout-address-line1" required minLength={4} maxLength={180} autoComplete="address-line1" placeholder={t("checkout.address1Placeholder","House number, building and street")} value={form.line1} onChange={e=>change("line1",e.target.value)}/></label>
    <label className="wide" htmlFor="checkout-address-line2"><span>{t("checkout.address2","Address line 2")} <em>{t("common.optional","Optional")}</em></span><input id="checkout-address-line2" maxLength={180} autoComplete="address-line2" placeholder={t("checkout.address2Placeholder","Apartment, landmark or area")} value={form.line2} onChange={e=>change("line2",e.target.value)}/></label>
    <label htmlFor="checkout-city"><span>{t("checkout.city","City")}</span><input id="checkout-city" required minLength={2} maxLength={80} autoComplete="address-level2" placeholder={t("checkout.cityPlaceholder","City")} value={form.city} onChange={e=>change("city",e.target.value)}/></label>
    <label htmlFor="checkout-state"><span>{t("checkout.state","State")}</span><input id="checkout-state" required minLength={2} maxLength={80} autoComplete="address-level1" placeholder={t("checkout.statePlaceholder","State")} value={form.state} onChange={e=>change("state",e.target.value)}/></label>
    <label htmlFor="checkout-postal-code"><span>{t("checkout.pin","PIN code")}</span><input id="checkout-postal-code" required minLength={6} maxLength={6} pattern="[0-9]{6}" title={t("checkout.pinValidation","Enter a valid 6-digit Indian PIN code.")} autoComplete="postal-code" inputMode="numeric" placeholder={t("checkout.pinPlaceholder","6-digit PIN code")} value={form.postalCode} onChange={e=>change("postalCode",e.target.value)}/></label>
   </div></section>
   <section className="checkout-form-section checkout-promotion-section" aria-labelledby="promotion-heading"><div className="checkout-section-heading"><span className="checkout-step">{isAuthenticated?"03":"04"}</span><div><h2 id="promotion-heading">{t("checkout.promotionTitle","A little something extra")}</h2><p>{t("checkout.promotionHint","Have a promotion code? Add it here.")}</p></div></div><label className="checkout-coupon" htmlFor="checkout-coupon"><span>{t("checkout.promotionCode","Promotion code")} <em>{t("common.optional","Optional")}</em></span><input id="checkout-coupon" value={couponCode} onChange={e=>setCouponCode(e.target.value.toUpperCase())} maxLength={32} placeholder={t("checkout.couponPlaceholder","ENTER YOUR CODE")} autoComplete="off"/></label></section>
   <section className="checkout-form-section" aria-labelledby="payment-method-heading"><div className="checkout-section-heading"><span className="checkout-step">{isAuthenticated?"04":"05"}</span><div><h2 id="payment-method-heading">{t("checkout.paymentMethod","Payment method")}</h2><p>{t("checkout.paymentHint","Choose how you would like to pay for your order.")}</p></div></div><div className="checkout-payment-options">
    <label className={paymentMethod==="COD"?"checkout-payment-option is-selected":"checkout-payment-option"}><input type="radio" name="paymentMethod" value="COD" checked={paymentMethod==="COD"} onChange={()=>setPaymentMethod("COD")}/><span><strong>{t("checkout.cod","Cash on Delivery")}</strong><small>{t("checkout.codHint","Pay when your order reaches you. Available for guest checkout.")}</small></span></label>
    <label className={!isAuthenticated?"checkout-payment-option is-disabled":paymentMethod==="RAZORPAY"?"checkout-payment-option is-selected":"checkout-payment-option"}><input type="radio" name="paymentMethod" value="RAZORPAY" checked={paymentMethod==="RAZORPAY"} disabled={!isAuthenticated} onChange={()=>setPaymentMethod("RAZORPAY")}/><span><strong>{t("checkout.onlinePayment","Online payment")}</strong><small>{isAuthenticated?t("checkout.razorpayHint","Secure payment through Razorpay."):t("checkout.onlineAccountHint","Create an account or sign in to unlock online payment.")}</small></span></label>
   </div>{!isAuthenticated&&<p className="field-hint">{t("checkout.onlineAccountRequiredHint","Online payment and wishlist access require an account.")} <Link href="/register?next=/checkout">{t("checkout.createAccount","Create an account")}</Link>.</p>}</section>
   {error&&<p className="form-error checkout-error" role="alert">{error}</p>}
   <div className="checkout-submit-area"><button className="primary-link checkout-submit" type="submit" disabled={busy||summaryLoading||!!summaryError||noItems||summaryLines.some(line=>line.quantity>line.availableQty)}>{busy?t("checkout.placing","Placing your order…"):paymentMethod==="COD"?t("checkout.placeCod","Place COD order"):t("checkout.continuePayment","Continue to secure payment")}</button><p className="checkout-disclaimer">{paymentMethod==="COD"?"{t("checkout.codDisclaimer","Your order is confirmed after stock and delivery details are validated. Pay the delivery partner when your parcel arrives.")}":"{t("checkout.onlineDisclaimer","Online payments are securely processed by Razorpay. Your order is confirmed only after payment verification.")}"}</p></div>
  </form>
 </>;
}
