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
    <main className="page">
      <div className="page-content" style={{ maxWidth: '640px' }}>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">{t("common.home","Home")}</Link>
          <span className="separator">/</span>
          <span className="current">{t("account.title","Account")}</span>
        </nav>

        <header className="page-header" style={{ marginBottom: 'var(--space-2xl)' }}>
          <p className="section-eyebrow">{t("account.eyebrow","YOUR YOI KIJI ACCOUNT")}</p>
          <h1>{user ? t("account.welcome","Welcome") + ", " + (user.name ?? t("account.back","back")) + "." : t("account.guestTitle","A more personal way to shop.")}</h1>
        </header>

        {user ? (
          <>
            <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
              <div className="p-xl">
                <p style={{ color: 'var(--color-forest)', marginBottom: 'var(--space-xl)' }}>
                  {t("account.signedIn","You are signed in as")} <strong>{user.email}</strong>. {t("account.signedInTail","Your orders and saved details are gathered here.")}
                </p>
                <div className="flex flex-wrap gap-md">
                  <Link href="/account/orders" className="btn btn-primary">{t("account.orders","View your orders")}</Link>
                  <Link href="/account/addresses" className="btn btn-secondary">{t("account.addresses","Saved addresses")}</Link>
                  <Link href="/account/wishlist" className="btn btn-secondary">{t("account.wishlist","Saved wishlist")}</Link>
                </div>
                <div style={{ marginTop: 'var(--space-xl)' }}>
                  <LogoutButton labels={locale.labels} />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="p-xl">
                <h2 style={{ marginBottom: 'var(--space-sm)' }}>{t("account.communication","Order communication")}</h2>
                <p style={{ color: 'var(--color-moss)', marginBottom: 'var(--space-lg)' }}>{t("account.whatsappHint","Choose whether you would like transactional order updates on WhatsApp.")}</p>
                <WhatsAppPreference initialValue={user.whatsappOptIn} labels={locale.labels} />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
              <div className="p-xl text-center">
                <p style={{ color: 'var(--color-forest)', marginBottom: 'var(--space-xl)' }}>{t("account.guestHint","Sign in or create an account to manage your details, saved addresses and orders.")}</p>
                <div className="flex flex-wrap gap-md justify-center">
                  <Link href="/login" className="btn btn-primary">{t("header.account","Sign in")}</Link>
                  <Link href="/register" className="btn btn-secondary">{t("checkout.createAccount","Create an account")}</Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}