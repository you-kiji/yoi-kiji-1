import "../../reviews-wishlist.css";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveProductBySlug } from "@/lib/catalog";
import { ProductDetailInteractive } from "@/components/product-detail-interactive";
import { WishlistButton } from "@/components/wishlist-button";
import { ProductReviewSection } from "@/components/product-review-section";
import { BackInStockForm } from "@/components/back-in-stock-form";
import { formatINR } from "@/lib/money";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLocaleData } from "@/lib/i18n";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getActiveProductBySlug(slug);
  if (!product) return {};
  const locale = await getLocaleData();
  const translations = locale.code === "en" ? [] : await prisma.contentTranslation.findMany({ where: { localeCode: locale.code, entityType: "product", entityId: product.id, fieldKey: { in: ["name", "description", "seoTitle", "seoDescription"] } } });
  const text = new Map(translations.map(item => [item.fieldKey, item.value]));
  return {
    title: text.get("seoTitle") ?? text.get("name") ?? product.seoTitle ?? product.name,
    description: text.get("seoDescription") ?? text.get("description") ?? product.seoDescription ?? product.description.slice(0, 155),
    keywords: product.seoKeywords,
    alternates: product.canonicalUrl ? { canonical: product.canonicalUrl } : undefined,
    robots: product.noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title: product.seoTitle ?? product.name,
      description: product.seoDescription ?? product.description.slice(0, 155),
      images: product.images[0] ? [{ url: product.images[0].url, alt: product.images[0].alt }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getActiveProductBySlug(slug);
  if (!product) notFound();
  const locale = await getLocaleData();
  const t = (key: string, fallback: string) => locale.labels[key] ?? fallback;
  const translationTargets = [
    { entityType: "product", entityId: product.id },
    ...(product.categoryId ? [{ entityType: "category", entityId: product.categoryId }] : []),
    ...product.attributeValues.map(entry => ({ entityType: "attribute", entityId: entry.attribute.id })),
  ];
  const productTranslations = locale?.code && locale.code !== "en" ? await prisma.contentTranslation.findMany({
    where: { localeCode: locale.code, OR: translationTargets.map(target => ({ entityType: target.entityType, entityId: target.entityId })) },
  }) : [];
  const productText = new Map(productTranslations.filter(entry => entry.entityType === "product").map(entry => [entry.fieldKey, entry.value]));
  const translated = new Map(productTranslations.map(entry => [`${entry.entityType}:${entry.entityId}:${entry.fieldKey}`, entry.value]));
  const displayName = productText.get("name") ?? product.name;
  const displayDescription = productText.get("description") ?? product.description;
  const displayCategory = product.category ? translated.get(`category:${product.category.id}:name`) ?? product.category.name : "YOI KIJI COLLECTION";
  const displayMaterial = productText.get("material") ?? product.material;
  const displayColor = productText.get("color") ?? product.color;
  const displayCare = productText.get("careInstructions") ?? product.careInstructions;

  const user=await getCurrentUser();
  const [reviews,reviewSummary,eligiblePurchase,relatedProducts]=await Promise.all([
    prisma.review.findMany({where:{productId:product.id,status:"APPROVED"},include:{user:{select:{name:true}}},orderBy:{createdAt:"desc"},take:50}),
    prisma.review.aggregate({where:{productId:product.id,status:"APPROVED"},_avg:{rating:true},_count:{_all:true}}),
    user?prisma.orderItem.findFirst({where:{productId:product.id,order:{userId:user.id,status:"DELIVERED",payment:{is:{status:"CAPTURED"}}}},select:{id:true}}):Promise.resolve(null),
    prisma.product.findMany({where:{id:{not:product.id},isActive:true,...(product.categoryId?{categoryId:product.categoryId}:{})},include:{images:{where:{variantId:null},orderBy:[{isPrimary:"desc"},{position:"asc"}],take:1},category:true},orderBy:{createdAt:"desc"},take:4}),
  ]);
  const dynamicSpecs = product.attributeValues.map(entry => {
    const value = entry.value;
    const translatedValue = productText.get(`attribute_${entry.attribute.key}`);
    const formatted = translatedValue ?? (Array.isArray(value) ? value.join(", ") : typeof value === "boolean" ? (value ? "Yes" : "No") : typeof value === "object" && value !== null ? JSON.stringify(value) : String(value));
    const name = translated.get(`attribute:${entry.attribute.id}:name`) ?? entry.attribute.name;
    return { name, value: entry.attribute.unit ? `${formatted} ${entry.attribute.unit}` : formatted };
  });

  return <main className="commerce-page">
    <div className="commerce-breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/shop">Shop</Link><span>/</span>{displayName}</div>
    <ProductDetailInteractive
      productId={product.id}
      images={product.images.map(image => ({ id: image.id, url: image.url, alt: image.alt, isPrimary: image.isPrimary, position: image.position }))}
      variants={product.variants.map(variant => ({
        id: variant.id, label: variant.label, inventoryQty: variant.inventoryQty,
        pricePaise: variant.pricePaise, swatchHex: variant.swatchHex,
        images: variant.images.map(image => ({ id: image.id, url: image.url, alt: image.alt, isPrimary: image.isPrimary, position: image.position })),
      }))}
      hasVariants={product.hasVariants}
      inventoryQty={product.inventoryQty}
      basePricePaise={product.pricePaise}
      labels={locale.labels}
    >
      <p className="eyebrow">{displayCategory}</p>
      <h1>{displayName}</h1>
      <WishlistButton productId={product.id}/>
      {(product.hasVariants?product.variants.every(v=>v.inventoryQty<=0):product.inventoryQty<=0)&&<BackInStockForm productId={product.id}/>}
      <p className="product-description">{displayDescription}</p>
      {(displayMaterial || displayColor || displayCare || product.lengthMm || product.widthMm || product.heightMm || dynamicSpecs.length > 0) && <dl className="product-specs">
        {displayMaterial && <div><dt>{t("product.material","Material")}</dt><dd>{displayMaterial}</dd></div>}
        {displayColor && <div><dt>{t("product.colour","Colour")}</dt><dd>{displayColor}</dd></div>}
        {(product.lengthMm || product.widthMm || product.heightMm) && <div><dt>{t("product.dimensions","Dimensions")}</dt><dd>{[product.lengthMm, product.widthMm, product.heightMm].filter(Boolean).join(" × ")} mm</dd></div>}
        {displayCare && <div><dt>{t("product.care","Care")}</dt><dd>{displayCare}</dd></div>}
        {dynamicSpecs.map(spec => <div key={spec.name}><dt>{spec.name}</dt><dd>{spec.value}</dd></div>)}
      </dl>}
    </ProductDetailInteractive>
    <ProductReviewSection
      slug={product.slug}
      reviews={reviews.map(review=>({id:review.id,rating:review.rating,title:review.title,body:review.body,verifiedPurchase:review.verifiedPurchase,createdAt:review.createdAt.toISOString(),userName:review.user.name??"YOI KIJI customer"}))}
      averageRating={reviewSummary._avg.rating??0}
      reviewCount={reviewSummary._count._all}
      canReview={!!eligiblePurchase}
      isSignedIn={!!user}
    />
    {relatedProducts.length>0&&<section className="related-products"><div className="related-products__heading"><p className="eyebrow">{t("product.relatedEyebrow","CONSIDER THESE TOO")}</p><h2>{t("product.relatedTitle","Made to")} <em>{t("product.relatedTitleAccent","belong together.")}</em></h2></div><div className="product-grid">{relatedProducts.map(item=><Link className="product-card" href={"/products/"+item.slug} key={item.id}><div className="product-card-image">{item.images[0]?<img src={item.images[0].url} alt={item.images[0].alt} loading="lazy" decoding="async"/>:<span>YOI KIJI</span>}</div><p className="product-card-category">{item.category?.name??"YOI KIJI"}</p><h3>{item.name}</h3><p className="product-card-price">{formatINR(item.pricePaise)}</p></Link>)}</div></section>}
  </main>;
}
