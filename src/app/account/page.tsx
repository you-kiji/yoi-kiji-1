import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { WhatsAppPreference } from "@/components/whatsapp-preference";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();

  return (
    <main className="commerce-page account-page">
      <div className="commerce-breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        Account
      </div>

      <section className="account-panel">
        <p className="eyebrow">YOUR YOI KIJI ACCOUNT</p>
        <h1>{user ? `Welcome, ${user.name ?? "back"}.` : "A more personal way to shop."}</h1>

        {user ? (
          <>
            <p className="account-intro">
              You are signed in as <strong>{user.email}</strong>. Your orders and saved details are gathered here.
            </p>
            <div className="account-actions">
              <Link className="primary-link" href="/account/orders">View your orders</Link>
              <Link className="text-link" href="/account/addresses">Saved addresses</Link>
              <Link className="text-link" href="/account/wishlist">Saved wishlist</Link>
              <LogoutButton />
            </div>
            <div className="account-preferences">
              <h2>Order communication</h2>
              <p>Choose whether you would like transactional order updates on WhatsApp.</p>
              <WhatsAppPreference initialValue={user.whatsappOptIn} />
            </div>
          </>
        ) : (
          <>
            <p className="account-intro">
              Sign in or create an account to manage your details, saved addresses and orders.
            </p>
            <div className="account-actions">
              <Link className="primary-link" href="/login">Sign in</Link>
              <Link className="text-link" href="/register">Create an account</Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
