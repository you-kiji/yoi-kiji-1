import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminLocaleDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.role !== "ADMIN") redirect("/admin");
  const { code } = await params;
  const locale = await prisma.locale.findUnique({
    where: { code },
    include: { _count: { select: { translations: true } }, translations: { orderBy: { updatedAt: "desc" }, take: 100 } },
  });
  if (!locale) notFound();
  return (
    <main className="commerce-page admin-locale-detail">
      <div className="commerce-breadcrumb"><Link href="/admin">Admin</Link><span>/</span><Link href="/admin/languages">Languages</Link><span>/</span>{locale.code}</div>
      <header className="admin-detail-header"><div><p className="eyebrow">GLOBAL STOREFRONT / LOCALE RECORD</p><h1>{locale.nativeName}</h1><p>{locale.name} · {locale.code} · {locale.direction.toUpperCase()}</p></div><div className="admin-detail-header-actions"><span className="order-status">{locale.isDefault ? "Default" : locale.isEnabled ? "Enabled" : "Disabled"}</span><Link className="admin-secondary-link" href="/admin/languages">Back to languages</Link></div></header>
      <section className="admin-detail-metrics"><article><span>Translations</span><strong>{locale._count.translations}</strong><small>Stored translated fields</small></article><article><span>Locale status</span><strong>{locale.isEnabled ? "Enabled" : "Disabled"}</strong><small>Storefront availability</small></article><article><span>Default locale</span><strong>{locale.isDefault ? "Yes" : "No"}</strong><small>Fallback language</small></article><article><span>Sort order</span><strong>{locale.sortOrder}</strong><small>Language switcher order</small></article></section>
      <div className="admin-product-detail-grid"><section className="admin-detail-card"><div className="admin-detail-card-heading"><div><p className="eyebrow">TRANSLATION REGISTER</p><h2>Recently updated fields</h2></div><span>Latest {locale.translations.length}</span></div>{locale.translations.length?<div className="admin-detail-timeline">{locale.translations.map(item=><article key={item.id}><span>{item.entityType.slice(0,3)}</span><div><strong>{item.fieldKey}</strong><p>{item.entityType} · {item.entityId}</p><small>{item.value.length>180?item.value.slice(0,180)+"…":item.value}</small><small>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(item.updatedAt)}</small></div></article>)}</div>:<p className="admin-detail-empty">No translations have been added for this locale yet.</p>}</section><aside className="admin-product-detail-aside"><section className="admin-detail-card"><div className="admin-detail-card-heading"><div><p className="eyebrow">LOCALE CONFIGURATION</p><h2>Language details</h2></div></div><dl className="admin-detail-definition admin-detail-definition--stacked"><div><dt>Locale code</dt><dd>{locale.code}</dd></div><div><dt>Language name</dt><dd>{locale.name}</dd></div><div><dt>Native name</dt><dd>{locale.nativeName}</dd></div><div><dt>Text direction</dt><dd>{locale.direction.toUpperCase()}</dd></div><div><dt>Created</dt><dd>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(locale.createdAt)}</dd></div><div><dt>Updated</dt><dd>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(locale.updatedAt)}</dd></div></dl><Link className="admin-product-open-link" href="/admin/languages">Open language manager</Link></section></aside></div>
    </main>
  );
}
