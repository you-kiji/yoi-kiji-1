import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { getLocaleData } from "@/lib/i18n";

export const metadata = { title: "Create an account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
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
          <span className="current">{t("checkout.createAccount","Create account")}</span>
        </nav>

        <header className="page-header" style={{ marginBottom: 'var(--space-xl)' }}>
          <p className="section-eyebrow">JOIN YOI KIJI</p>
          <h1>Make yourself<br/><em>at home.</em></h1>
        </header>

        <div className="card">
          <div className="p-xl">
            <AuthForm mode="register" redirectTo={redirectTo} labels={locale.labels} />
            <p className="text-center mt-lg" style={{ color: 'var(--color-moss)', fontSize: '0.9375rem' }}>
              {t("auth.alreadyHaveAccount","Already have an account?")} <Link href={"/login?next=" + encodeURIComponent(redirectTo)}>{t("header.account","Sign in")}</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}