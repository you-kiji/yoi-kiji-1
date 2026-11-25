import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getLocaleData } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await prisma.legalPage.findFirst({ where: { slug, status: "PUBLISHED" }, select: { id: true, title: true, seoTitle: true, seoDescription: true } });
  if (!page) return {};
  const locale = await getLocaleData();
  const translations = locale.code === "en" ? [] : await prisma.contentTranslation.findMany({ where: { localeCode: locale.code, entityType: "legalPage", entityId: page.id, fieldKey: { in: ["title", "seoTitle", "seoDescription"] } } });
  const text = new Map(translations.map(item => [item.fieldKey, item.value]));
  return { title: text.get("seoTitle") ?? text.get("title") ?? page.seoTitle ?? page.title, description: text.get("seoDescription") ?? page.seoDescription ?? undefined };
}

export default async function LegalPageView({ params }: Props) {
  const { slug } = await params;
  const page = await prisma.legalPage.findFirst({ where: { slug, status: "PUBLISHED" } });
  if (!page) notFound();
  const locale = await getLocaleData();
  const t = (key: string, fallback: string) => locale.labels[key] ?? fallback;
  const translations = locale.code !== "en" ? await prisma.contentTranslation.findMany({ where: { localeCode: locale.code, entityType: "legalPage", entityId: page.id } }) : [];
  const translated = new Map(translations.map((item: typeof translations[0]) => [item.fieldKey, item.value]));
  const title = translated.get("title") ?? page.title;
  const content = translated.get("content") ?? page.content;

  return (
    <main className="page">
      <div className="page-content" style={{ maxWidth: '800px' }}>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">{t("common.home","Home")}</Link>
          <span className="separator">/</span>
          <Link href="/legal">{t("common.legal","Legal")}</Link>
          <span className="separator">/</span>
          <span className="current">{title}</span>
        </nav>

        <header className="page-header" style={{ marginBottom: 'var(--space-2xl)', textAlign: 'left' }}>
          <p className="section-eyebrow">YOI KIJI / POLICIES</p>
          <h1>{title}</h1>
          <p>Last updated {new Intl.DateTimeFormat("en-IN", { dateStyle: "long" }).format(page.updatedAt)}</p>
        </header>

        <article style={{ fontSize: '1.0625rem', lineHeight: 1.8, color: 'var(--color-forest)' }}>
          {content.split(/\n{2,}/).map((paragraph: string, index: number) => (
            <p key={index} style={{ marginBottom: 'var(--space-md)' }}>
              {paragraph.split("\n").map((line: string, lineIndex: number) => (
                <span key={lineIndex}>{line}{lineIndex < paragraph.split("\n").length - 1 ? <br /> : null}</span>
              ))}
            </p>
          ))}
        </article>
      </div>
    </main>
  );
}