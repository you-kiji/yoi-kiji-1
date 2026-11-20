"use client";

import { useState } from "react";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { formatINR } from "@/lib/money";

type Variant = { id: string; label: string; inventoryQty: number; pricePaise: number | null; swatchHex?: string | null };

export function ProductPurchase({
  productId, variants, hasVariants, inventoryQty, basePricePaise, onVariantChange, labels = {},
}: {
  productId: string;
  variants: Variant[];
  hasVariants: boolean;
  inventoryQty: number;
  basePricePaise: number;
  onVariantChange?: (variantId: string) => void;
  labels?: Record<string,string>;
}) {
  const t = (key: string, fallback: string) => labels[key] ?? fallback;
  const [selected, setSelected] = useState("");
  const active = variants.find(variant => variant.id === selected);
  const unavailable = hasVariants ? (!active || active.inventoryQty < 1) : inventoryQty < 1;
  function selectVariant(id: string) {
    setSelected(id);
    onVariantChange?.(id);
  }
  return <>
    <p className="product-detail-price">{formatINR(active?.pricePaise ?? basePricePaise)}</p>
    <p className="stock-note">{unavailable ? t("product.unavailable","Currently unavailable") : t("product.available","Available to order")}</p>
    {hasVariants && <fieldset className="purchase-variant">
      <legend>{t("product.selectVariant","Select size / option")}</legend>
      <div className="purchase-variant-options">
        {variants.map(variant => <button
          key={variant.id}
          type="button"
          className={selected === variant.id ? "purchase-variant-option selected" : "purchase-variant-option"}
          onClick={() => selectVariant(variant.id)}
          disabled={variant.inventoryQty < 1}
          aria-pressed={selected === variant.id}
        >
          {variant.swatchHex && <span className="purchase-variant-swatch" style={{ backgroundColor: variant.swatchHex }} aria-hidden="true" />}
          <span>{variant.label}</span>
          {variant.inventoryQty < 1 && <small>{t("product.outOfStock","Out of stock")}</small>}
        </button>)}
      </div>
    </fieldset>}
    <AddToCartButton productId={productId} variantId={selected || undefined} disabled={unavailable} labels={labels} />
  </>;
}
