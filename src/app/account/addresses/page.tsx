import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLocaleData } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata = { title: "Saved addresses" };

export default async function AddressesPage() {
  const user = await getCurrentUser();
  const locale = await getLocaleData();
  const t = (key: string, fallback: string) => locale.labels[key] ?? fallback;
  if (!user) redirect("/login");

  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return (
    <main className="page">
      <div className="page-content" style={{ maxWidth: '800px' }}>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span className="separator">/</span>
          <Link href="/account">{t("account.title","Account")}</Link>
          <span className="separator">/</span>
          <span className="current">{t("account.addresses","Saved addresses")}</span>
        </nav>

        <header className="page-header" style={{ marginBottom: 'var(--space-2xl)' }}>
          <p className="section-eyebrow">YOUR DETAILS</p>
          <h1>Places that<br /><em>feel like home.</em></h1>
          <p>Your saved delivery details, kept together for a smoother checkout.</p>
        </header>

        {addresses.length ? (
          <section aria-label="Saved delivery addresses" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            {addresses.map((address: typeof addresses[0]) => (
              <article key={address.id} className="card" style={{ position: 'relative' }}>
                <div className="p-lg" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                  <div className="flex items-start justify-between gap-md">
                    <div>
                      <p style={{ fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-moss)', marginBottom: 'var(--space-xs)' }}>DELIVERY ADDRESS</p>
                      <h2 style={{ margin: 0 }}>{address.fullName}</h2>
                    </div>
                    {address.isDefault && <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>Default address</span>}
                  </div>
                  <address style={{ fontStyle: 'normal', color: 'var(--color-forest)', lineHeight: 1.8 }}>
                    <p>{address.line1}</p>
                    {address.line2 && <p>{address.line2}</p>}
                    <p>{address.city}, {address.state} {address.postalCode}</p>
                    <p>{address.phone}</p>
                  </address>
                </div>
              </article>
            ))}
            <p style={{ color: 'var(--color-sage)', fontSize: '0.875rem', textAlign: 'center', marginTop: 'var(--space-lg)' }}>
              Address editing and default-address management are not currently available in your account.
            </p>
          </section>
        ) : (
          <section className="empty-state" style={{ marginTop: 'var(--space-xl)' }}>
            <div className="empty-state-icon">✳</div>
            <p className="section-eyebrow">READY WHEN YOU ARE</p>
            <h2>No saved addresses yet.</h2>
            <p>Your delivery address is saved during checkout after your first order.</p>
            <Link href="/shop" className="btn btn-primary mt-lg">{t("account.exploreCollections","Explore collections")}</Link>
          </section>
        )}
      </div>
    </main>
  );
}