import Link from "next/link";
import { PasswordRecoveryForm } from "@/components/password-recovery-form";
import { getLocaleData } from "@/lib/i18n";

export const metadata = { title: "Reset password" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const validToken = /^[a-f0-9]{64}$/i.test(token) ? token : "";
  const locale = await getLocaleData();
  const t = (key: string, fallback: string) => locale.labels[key] ?? fallback;

  return (
    <main className="page">
      <div className="page-content" style={{ maxWidth: '420px' }}>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">{t("common.home","Home")}</Link>
          <span className="separator">/</span>
          <span className="current">{t("auth.resetPassword","Reset password")}</span>
        </nav>

        <header className="page-header" style={{ marginBottom: 'var(--space-xl)' }}>
          <p className="section-eyebrow">ACCOUNT SECURITY</p>
          <h1>A fresh<br/><em>start.</em></h1>
          <p>Choose a new password for your YOI KIJI account. Reset links can only be used once and expire after 30 minutes.</p>
        </header>

        <div className="card">
          <div className="p-xl">
            <PasswordRecoveryForm mode="reset" token={validToken} labels={locale.labels} />
            {!validToken && <p className="alert alert-error" role="alert" style={{ marginBottom: 'var(--space-lg)' }}>This reset link is missing or malformed. Request a new link to continue.</p>}
            <p className="text-center">
              <Link href="/login" className="btn btn-secondary">{t("auth.backToSignIn","Back to sign in")}</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}