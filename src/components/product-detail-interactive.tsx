"use client";

import { useState, type ReactNode } from "react";
import { ProductPurchase } from "@/components/product-purchase";

type MediaImage = { id: string; url: string; alt: string; isPrimary?: boolean; position?: number };
type PurchaseVariant = {
  id: string;
  label: string;
  inventoryQty: number;
  pricePaise: number | null;
  swatchHex: string | null;
  images: MediaImage[];
};

export function ProductDetailInteractive({
  productId, images, variants, hasVariants, inventoryQty, basePricePaise, children, labels = {},
}: {
  productId: string;
  images: MediaImage[];
  variants: PurchaseVariant[];
  hasVariants: boolean;
  inventoryQty: number;
  basePricePaise: number;
  children: ReactNode;
}) {
  const t = (key: string, fallback: string) => labels[key] ?? fallback;\n  const [activeVariantId, setActiveVariantId] = useState("");
  const activeVariant = variants.find(variant => variant.id === activeVariantId);
  const variantImages = activeVariant?.images ?? [];
  const gallery = variantImages.length
    ? [...variantImages, ...images.filter(image => !variantImages.some(variantImage => variantImage.url === image.url))]
    : images;
  const [activeImageId, setActiveImageId] = useState(images[0]?.id ?? "");
  const activeImage = gallery.find(image => image.id === activeImageId) ?? gallery[0];

  function handleVariantChange(variantId: string) {
    setActiveVariantId(variantId);
    const nextVariant = variants.find(variant => variant.id === variantId);
    setActiveImageId(nextVariant?.images[0]?.id ?? images[0]?.id ?? "");
  }

  return <section className="product-detail">
    <div className="product-gallery" aria-label={t("product.gallery","Product images")}>
      {activeImage ? (
        <>
          <div className="product-gallery-main">
            <img src={activeImage.url} alt={activeImage.alt || "YOI KIJI product image"} fetchPriority="high" />
          </div>
          {gallery.length > 1 && (
            <div className="product-gallery-thumbnails" role="group" aria-label={t("product.chooseImage","Choose product image")}>
              {gallery.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  className={activeImage.id === image.id ? "product-gallery-thumbnail is-active" : "product-gallery-thumbnail"}
                  onClick={() => setActiveImageId(image.id)}
                  aria-label={`${t("product.viewImage","View image")} ${index + 1}: ${image.alt || t("product.productView","Product view")}`}
                  aria-pressed={activeImage.id === image.id}
                >
                  <img src={image.url} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="product-image-placeholder">YOI KIJI</div>
      )}
    </div>
    <div className="product-detail-copy">
      {children}
      <ProductPurchase
        productId={productId}
        variants={variants.map(({ id, label, inventoryQty, pricePaise, swatchHex }) => ({ id, label, inventoryQty, pricePaise, swatchHex }))}
        hasVariants={hasVariants}
        inventoryQty={inventoryQty}
        basePricePaise={basePricePaise}
        onVariantChange={handleVariantChange}
      />
      <p className="product-detail-note">{t("product.priceNote","Prices are shown in INR. Delivery availability and charges are confirmed during checkout.")}</p>
    </div>
  </section>;
}
