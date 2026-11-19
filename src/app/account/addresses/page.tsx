import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Saved addresses" };

export default async function AddressesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return (
    <main className="commerce-page account-addresses-page">
      <div className="commerce-breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/account">Account</Link>
        <span>/</span>
        Addresses
      </div>

      <header className="commerce-heading account-subpage-heading">
        <p className="eyebrow">YOUR DETAILS</p>
        <h1>Places that<br /><em>feel like home.</em></h1>
        <p>Your saved delivery details, kept together for a smoother checkout.</p>
      </header>

      {addresses.length ? (
        <section className="address-list premium-address-list" aria-label="Saved delivery addresses">
          {addresses.map((address) => (
            <article key={address.id} className="address-card">
              <div className="address-card-heading">
                <div>
                  <p className="eyebrow">DELIVERY ADDRESS</p>
                  <h2>{address.fullName}</h2>
                </div>
                {address.isDefault && <span className="address-default">Default address</span>}
              </div>
              <address>
                <span>{address.line1}</span>
                {address.line2 && <span>{address.line2}</span>}
                <span>{address.city}, {address.state} {address.postalCode}</span>
                <span>{address.phone}</span>
              </address>
            </article>
          ))}
          <p className="address-management-note">
            Address editing and default-address management are not currently available in your account.
          </p>
        </section>
      ) : (
        <section className="catalogue-empty account-empty-state">
          <p className="eyebrow">READY WHEN YOU ARE</p>
          <h2>No saved addresses yet.</h2>
          <p>Your delivery address is saved during checkout after your first order.</p>
          <Link className="primary-link" href="/shop">Explore collections</Link>
        </section>
      )}
    </main>
  );
}
