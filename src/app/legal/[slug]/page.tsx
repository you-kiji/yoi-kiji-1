import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
  const translations = locale.code !== "en" ? await prisma.contentTranslation.findMany({ where: { localeCode: locale.code, entityType: "legalPage", entityId: page.id } }) : [];
  const translated = new Map(translations.map(item => [item.fieldKey, item.value]));
  const title = translated.get("title") ?? page.title;
  const content = translated.get("content") ?? page.content;
  return <main className="commerce-page legal-page">
    <div className="commerce-breadcrumb"><a href="/">Home</a><span>/</span> Legal</div>
    <header className="commerce-heading"><p className="eyebrow">YOI KIJI / POLICIES</p><h1>{title}</h1><p>Last updated {new Intl.DateTimeFormat("en-IN",{dateStyle:"long"}).format(page.updatedAt)}</p></header>
    <article className="legal-page-content">{content.split(/\n{2,}/).map((paragraph,index)=><p key={index}>{paragraph.split("\n").map((line,lineIndex)=><span key={lineIndex}>{line}{lineIndex<paragraph.split("\n").length-1?<br/>:null}</span>)}</p>)}</article>
  </main>;
}
