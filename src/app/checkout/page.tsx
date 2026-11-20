import Link from "next/link";
import { CheckoutForm } from "@/components/checkout-form";
import { getCurrentUser } from "@/lib/auth";
import { getLocaleData } from "@/lib/i18n";
export const dynamic="force-dynamic";
export default async function CheckoutPage(){
 const user=await getCurrentUser();
 const locale=await getLocaleData();
 const t=(key:string,fallback:string)=>locale.labels[key]??fallback;
 return <main className="commerce-page">
  <div className="commerce-breadcrumb"><Link href="/">{t("common.home","Home")}</Link><span>/</span><Link href="/cart">{t("cart.title","Bag")}</Link><span>/</span> {t("checkout.pageTitle","Checkout")}</div>
  <header className="commerce-heading"><p className="eyebrow">{t("checkout.pageEyebrow","A THOUGHTFUL DELIVERY STARTS HERE")}</p><h1>{t("checkout.deliveryTitle","Delivery")}<br/><em>{t("checkout.detailsTitle","details.")}</em></h1>
   <p>{user ? t("checkout.signedInAs","Signed in as") + " " + user.email : t("checkout.guestCheckout","Guest checkout is available with Cash on Delivery.")}</p>
  </header>
  <section className="checkout-panel"><CheckoutForm isAuthenticated={!!user} labels={locale.labels}/></section>
 </main>;
}
