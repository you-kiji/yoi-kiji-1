import Link from "next/link";
import { CartView } from "@/components/cart-view";
import { getLocaleData } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const locale = await getLocaleData();
  const t = (key: string, fallback: string) => locale.labels[key] ?? fallback;

  return (
    <main className="page">
      <div className="page-content">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">{t("common.home","Home")}</Link>
          <span className="separator">/</span>
          <span className="current">{t("cart.title","Your bag")}</span>
        </nav>
        <header className="page-header">
          <p className="section-eyebrow">{t("cart.pageEyebrow","YOUR YOI KIJI SELECTION")}</p>
          <h1>{t("cart.pageTitle","A little more")}<br/><em>{t("cart.pageTitleAccent","comfort.")}</em></h1>
        </header>
        <CartView labels={locale.labels} />
      </div>
    </main>
  );
}