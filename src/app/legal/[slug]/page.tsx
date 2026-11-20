import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await prisma.legalPage.findFirst({ where: { slug, status: "PUBLISHED" }, select: { title: true, seoTitle: true, seoDescription: true } });
  return page ? { title: page.seoTitle ?? page.title, description: page.seoDescription ?? undefined } : {};
}

export default async function LegalPageView({ params }: Props) {
  const { slug } = await params;
  const page = await prisma.legalPage.findFirst({ where: { slug, status: "PUBLISHED" } });
  if (!page) notFound();
  const requestedLocale = (await cookies()).get("yk-locale")?.value ?? "en";
  const locale = await prisma.locale.findFirst({ where: { code: requestedLocale, isEnabled: true }, select: { code: true } }).catch(() => null);
  const translations = locale?.code && locale.code !== "en" ? await prisma.contentTranslation.findMany({ where: { localeCode: locale.code, entityType: "legalPage", entityId: page.id } }) : [];
  const translated = new Map(translations.map(item => [item.fieldKey, item.value]));
  const title = translated.get("title") ?? page.title;
  const content = translated.get("content") ?? page.content;
  return <main className="commerce-page legal-page">
    <div className="commerce-breadcrumb"><a href="/">Home</a><span>/</span> Legal</div>
    <header className="commerce-heading"><p className="eyebrow">YOI KIJI / POLICIES</p><h1>{title}</h1><p>Last updated {new Intl.DateTimeFormat("en-IN",{dateStyle:"long"}).format(page.updatedAt)}</p></header>
    <article className="legal-page-content">{content.split(/\n{2,}/).map((paragraph,index)=><p key={index}>{paragraph.split("\n").map((line,lineIndex)=><span key={lineIndex}>{line}{lineIndex<paragraph.split("\n").length-1?<br/>:null}</span>)}</p>)}</article>
  </main>;
}
