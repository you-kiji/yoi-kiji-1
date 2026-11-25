import Link from "next/link";
import { PasswordRecoveryForm } from "@/components/password-recovery-form";
import { getLocaleData } from "@/lib/i18n";

export const metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage() {
  const locale = await getLocaleData();
  const t = (key: string, fallback: string) => locale.labels[key] ?? fallback;

  return (
    <main className="page">
      <div className="page-content" style={{ maxWidth: '420px' }}>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">{t("common.home","Home")}</Link>
          <span className="separator">/</span>
          <span className="current">{t("auth.forgotPassword","Forgot password")}</span>
        </nav>

        <header className="page-header" style={{ marginBottom: 'var(--space-xl)' }}>
          <p className="section-eyebrow">ACCOUNT SECURITY</p>
          <h1>Find your way<br/><em>back in.</em></h1>
          <p>Enter the email address linked to your YOI KIJI account. If an account exists, we will send a secure reset link that expires after 30 minutes.</p>
        </header>

        <div className="card">
          <div className="p-xl">
            <PasswordRecoveryForm mode="request" labels={locale.labels} />
            <p className="text-center mt-lg">
              <Link href="/login" className="btn btn-secondary">{t("auth.backToSignIn","Back to sign in")}</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}