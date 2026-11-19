import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Administrator sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const user = await getCurrentUser();
  if (user?.role === "ADMIN" || user?.role === "STAFF") redirect("/admin");
  if (user) redirect("/account");

  return (
    <main className="commerce-page admin-login-page">
      <div className="commerce-breadcrumb">YOI KIJI <span>/</span> Administration <span>/</span> Sign in</div>
      <header className="commerce-heading">
        <p className="eyebrow">PRIVATE ADMINISTRATION / YOI KIJI</p>
        <h1>Welcome to<br /><em>your workspace.</em></h1>
        <p>Sign in to manage the catalogue, orders, inventory and store experience.</p>
      </header>
      <AuthForm mode="login" redirectTo="/admin" />
      <p className="admin-login-note">This sign-in is reserved for authorised store administrators and staff.</p>
    </main>
  );
}
