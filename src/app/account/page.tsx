import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { WhatsAppPreference } from "@/components/whatsapp-preference";
import { getLocaleData } from "@/lib/i18n";



export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  const locale = await getLocaleData();
  const t = (key: string, fallback: string) => locale.labels[key] ?? fallback;

  return (
    <main className="commerce-page account-page">
      <div className="commerce-breadcrumb">
        <Link href="/">{t("common.home","Home")}</Link>
        <span>/</span>
        {t("account.title","Account")}
      </div>

      <section className="account-panel">
        <p className="eyebrow">{t("account.eyebrow","YOUR YOI KIJI ACCOUNT")}</p>
        <h1>{user ? t("account.welcome","Welcome") + ", " + (user.name ?? t("account.back","back")) + "." : t("account.guestTitle","A more personal way to shop.")}</h1>

        {user ? (
          <>
            <p className="account-intro">
              {t("account.signedIn","You are signed in as")} <strong>{user.email}</strong>. {t("account.signedInTail","Your orders and saved details are gathered here.")}
            </p>
            <div className="account-actions">
              <Link className="primary-link" href="/account/orders">{t("account.orders","View your orders")}</Link>
              <Link className="text-link" href="/account/addresses">{t("account.addresses","Saved addresses")}</Link>
              <Link className="text-link" href="/account/wishlist">{t("account.wishlist","Saved wishlist")}</Link>
              <LogoutButton labels={locale.labels} />
            </div>
            <div className="account-preferences">
              <h2>{t("account.communication","Order communication")}</h2>
              <p>{t("account.whatsappHint","Choose whether you would like transactional order updates on WhatsApp.")}</p>
              <WhatsAppPreference initialValue={user.whatsappOptIn} labels={locale.labels} />
            </div>
          </>
        ) : (
          <>
            <p className="account-intro">
              {t("account.guestHint","Sign in or create an account to manage your details, saved addresses and orders.")}
            </p>
            <div className="account-actions">
              <Link className="primary-link" href="/login">{t("header.account","Sign in")}</Link>
              <Link className="text-link" href="/register">{t("checkout.createAccount","Create an account")}</Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
