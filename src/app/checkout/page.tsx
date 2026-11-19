import Link from "next/link";
import { CheckoutForm } from "@/components/checkout-form";
import { getCurrentUser } from "@/lib/auth";
export const metadata={title:"Secure checkout"};
export const dynamic="force-dynamic";
export default async function CheckoutPage(){
 const user=await getCurrentUser();
 return <main className="commerce-page">
  <div className="commerce-breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/cart">Bag</Link><span>/</span> Checkout</div>
  <header className="commerce-heading"><p className="eyebrow">A THOUGHTFUL DELIVERY STARTS HERE</p><h1>Delivery<br/><em>details.</em></h1>
   <p>{user ? "Signed in as " + user.email : "Guest checkout is available with Cash on Delivery."}</p>
  </header>
  <section className="checkout-panel"><CheckoutForm isAuthenticated={!!user}/></section>
 </main>;
}
