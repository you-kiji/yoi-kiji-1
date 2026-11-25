import Link from "next/link";
import { CheckoutForm } from "@/components/checkout-form";
import { getCurrentUser } from "@/lib/auth";
import { getLocaleData } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  const locale = await getLocaleData();
  const t = (key: string, fallback: string) => locale.labels[key] ?? fallback;

  return (
    <main className="page">
      <div className="page-content">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">{t("common.home","Home")}</Link>
          <span className="separator">/</span>
          <Link href="/cart">{t("cart.title","Bag")}</Link>
          <span className="separator">/</span>
          <span className="current">{t("checkout.pageTitle","Checkout")}</span>
        </nav>
        <header className="page-header">
          <p className="section-eyebrow">{t("checkout.pageEyebrow","A THOUGHTFUL DELIVERY STARTS HERE")}</p>
          <h1>{t("checkout.deliveryTitle","Delivery")}<br/><em>{t("checkout.detailsTitle","details.")}</em></h1>
          <p>{user ? t("checkout.signedInAs","Signed in as") + " " + user.email : t("checkout.guestCheckout","Guest checkout is available with Cash on Delivery.")}</p>
        </header>
        <section style={{ maxWidth: '750px', margin: '0 auto' }}>
          <CheckoutForm isAuthenticated={!!user} labels={locale.labels} />
        </section>
      </div>
    </main>
  );
}