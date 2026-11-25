import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";
import { getLocaleData } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Administrator sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const user = await getCurrentUser();
  if (user?.role === "ADMIN" || user?.role === "STAFF") redirect("/admin");
  if (user) redirect("/account");
  const locale = await getLocaleData();
  const t = (key: string, fallback: string) => locale.labels[key] ?? fallback;

  return (
    <main className="page" style={{ background: 'var(--color-off-white)' }}>
      <div className="page-content" style={{ maxWidth: '420px' }}>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <span>YOI KIJI</span>
          <span className="separator">/</span>
          <span>{t("admin.administration","Administration")}</span>
          <span className="separator">/</span>
          <span className="current">{t("header.account","Sign in")}</span>
        </nav>

        <header className="page-header" style={{ marginBottom: 'var(--space-xl)' }}>
          <p className="section-eyebrow">PRIVATE ADMINISTRATION / YOI KIJI</p>
          <h1>Welcome to<br /><em>your workspace.</em></h1>
          <p>Sign in to manage the catalogue, orders, inventory and store experience.</p>
        </header>

        <div className="card">
          <div className="p-xl">
            <AuthForm mode="login" redirectTo="/admin" labels={locale.labels} />
            <p style={{ textAlign: 'center', color: 'var(--color-sage)', fontSize: '0.875rem', marginTop: 'var(--space-lg)' }}>This sign-in is reserved for authorised store administrators and staff.</p>
          </div>
        </div>
      </div>
    </main>
  );
}