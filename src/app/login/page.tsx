import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { getLocaleData } from "@/lib/i18n";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const redirectTo = next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
  const locale = await getLocaleData();
  const t = (key: string, fallback: string) => locale.labels[key] ?? fallback;

  return (
    <main className="page">
      <div className="page-content" style={{ maxWidth: '420px' }}>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">{t("common.home","Home")}</Link>
          <span className="separator">/</span>
          <span className="current">{t("header.account","Sign in")}</span>
        </nav>

        <header className="page-header" style={{ marginBottom: 'var(--space-xl)' }}>
          <p className="section-eyebrow">WELCOME BACK</p>
          <h1>Good to have<br/><em>you here.</em></h1>
        </header>

        <div className="card">
          <div className="p-xl">
            <AuthForm mode="login" redirectTo={redirectTo} labels={locale.labels} />
            <p className="text-center mt-lg" style={{ color: 'var(--color-moss)', fontSize: '0.9375rem' }}>
              <Link href="/forgot-password">{t("auth.forgotPassword","Forgot your password?")}</Link>
            </p>
            <p className="text-center mt-md" style={{ color: 'var(--color-moss)', fontSize: '0.9375rem' }}>
              {t("auth.newHere","New to YOI KIJI?")} <Link href={"/register?next=" + encodeURIComponent(redirectTo)}>{t("auth.createAccount","Create an account")}</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}