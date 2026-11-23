"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const groups = [
  { label: "Sales", items: [
    { label: "Overview", href: "/admin", exact: true },
    { label: "Orders", href: "/admin/orders" },
    { label: "Customers", href: "/admin/customers" },
    { label: "Reviews", href: "/admin/reviews" },
    { label: "Discounts", href: "/admin/promotions" },
    { label: "Reports", href: "/admin/reports" },
  ]},
  { label: "Products", items: [
    { label: "All products", href: "/admin/products" },
    { label: "Categories", href: "/admin/categories" },
    { label: "Product types", href: "/admin/product-types" },
    { label: "Inventory", href: "/admin/inventory" },
    { label: "Stock alerts", href: "/admin/stock-alerts" },
    { label: "Media library", href: "/admin/media" },
  ]},
  { label: "Content", items: [
    { label: "Storefront editor", href: "/admin/storefront" },
    { label: "Blog", href: "/admin/blog" },
    { label: "SEO", href: "/admin/seo" },
    { label: "Languages", href: "/admin/languages" },
    { label: "Legal pages", href: "/admin/legal" },
  ]},
];

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

export function AdminShopifyShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  if (pathname === "/admin/login") return <div className="admin-login-surface">{children}</div>;

  return (
    <div className="admin-shopify-shell">
      <aside className={`admin-shopify-sidebar ${mobileOpen ? "is-open" : ""}`}>
        <Link href="/admin" className="admin-shopify-brand" onClick={() => setMobileOpen(false)}>
          <span className="admin-shopify-brand-mark">YK</span>
          <span><strong>YOI KIJI</strong><small>STORE ADMIN</small></span>
        </Link>
        <div className="admin-shopify-store-chip"><span className="admin-shopify-store-avatar">Y</span><span><strong>YOI KIJI</strong><small>Online store</small></span><span className="admin-shopify-store-caret">⌄</span></div>
        <nav className="admin-shopify-nav" aria-label="Admin navigation">
          {groups.map(group => (
            <section className="admin-shopify-nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map(item => (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={isActive(pathname, item.href, item.exact) ? "is-active" : ""} aria-current={isActive(pathname, item.href, item.exact) ? "page" : undefined}>
                  <span className="admin-shopify-nav-indicator" />
                  {item.label}
                </Link>
              ))}
            </section>
          ))}
        </nav>
        <div className="admin-shopify-sidebar-bottom">
          <Link href="/admin/storefront">Settings & storefront</Link>
          <a href="https://www.yoikiji.com" target="_blank" rel="noreferrer">View online store</a>
        </div>
      </aside>
      {mobileOpen && <button className="admin-shopify-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <div className="admin-shopify-main">
        <header className="admin-shopify-topbar">
          <button className="admin-shopify-menu-button" onClick={() => setMobileOpen(v => !v)} aria-expanded={mobileOpen} aria-label="Toggle admin navigation"><span /><span /><span /></button>
          <div className="admin-shopify-topbar-context"><span>YOI KIJI</span><span className="admin-shopify-topbar-divider">/</span><strong>Admin</strong></div>
          <div className="admin-shopify-topbar-actions"><span className="admin-shopify-status"><i /> Store workspace</span><a href="https://www.yoikiji.com" target="_blank" rel="noreferrer">View store</a><span className="admin-shopify-avatar">YK</span></div>
        </header>
        <div className="admin-shopify-content">{children}</div>
      </div>
    </div>
  );
}
