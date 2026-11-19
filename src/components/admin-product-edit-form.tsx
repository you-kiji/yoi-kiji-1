"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type CategoryOption = { id: string; name: string; slug: string; parentId: string | null; isActive: boolean };
type DynamicAttribute = { id: string; isRequired: boolean; isFilterable: boolean; attribute: { id: string; name: string; key: string; type: string; unit: string | null; options: unknown; isVariantAxis: boolean } };
type ProductTypeOption = { id: string; name: string; slug: string; attributes: DynamicAttribute[] };
type AttributeValue = { attributeId: string; value: unknown };
type EditableProduct = {
  id: string; name: string; slug: string; description: string; sku: string;
  hsnCode: string | null; material: string | null; color: string | null; careInstructions: string | null;
  weightGrams: number | null; lengthMm: number | null; widthMm: number | null; heightMm: number | null;
  pricePaise: number; compareAtPaise: number | null; gstRateBps: number; inventoryQty: number;
  isActive: boolean; hasVariants: boolean; productTypeId: string | null; categoryId: string | null;
  categoryLinks: { categoryId: string; isPrimary: boolean }[];
  attributeValues: AttributeValue[];
  seoTitle: string | null; seoDescription: string | null; seoKeywords: string[]; canonicalUrl: string | null; noIndex: boolean;
};

export function AdminProductEditForm({ product }: { product: EditableProduct }) {
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [productTypes, setProductTypes] = useState<ProductTypeOption[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: product.name, slug: product.slug, description: product.description, sku: product.sku,
    hsnCode: product.hsnCode ?? "", material: product.material ?? "", color: product.color ?? "",
    careInstructions: product.careInstructions ?? "", weightGrams: product.weightGrams?.toString() ?? "",
    lengthMm: product.lengthMm?.toString() ?? "", widthMm: product.widthMm?.toString() ?? "",
    heightMm: product.heightMm?.toString() ?? "", gstRate: (product.gstRateBps / 100).toString(),
    price: (product.pricePaise / 100).toFixed(2), compareAtPrice: product.compareAtPaise == null ? "" : (product.compareAtPaise / 100).toFixed(2),
    stock: product.inventoryQty.toString(), productTypeId: product.productTypeId ?? "",
    categoryIds: product.categoryLinks.length ? product.categoryLinks.map(link => link.categoryId) : product.categoryId ? [product.categoryId] : [],
    primaryCategoryId: product.categoryLinks.find(link => link.isPrimary)?.categoryId ?? product.categoryId ?? "",
    isActive: product.isActive, seoTitle: product.seoTitle ?? "", seoDescription: product.seoDescription ?? "", seoKeywords: product.seoKeywords.join(", "), canonicalUrl: product.canonicalUrl ?? "", noIndex: product.noIndex,
  });
  const [attributeValues, setAttributeValues] = useState<Record<string, unknown>>(
    Object.fromEntries(product.attributeValues.map(item => [item.attributeId, item.value])),
  );

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/categories", { cache: "no-store" }).then(r => r.ok ? r.json() : null),
      fetch("/api/admin/product-types", { cache: "no-store" }).then(r => r.ok ? r.json() : null),
    ]).then(([categoryData, typeData]) => {
      if (categoryData?.categories) setCategories(categoryData.categories.filter((c: CategoryOption) => c.isActive));
      if (typeData?.productTypes) setProductTypes(typeData.productTypes);
    }).catch(() => setMessage("Catalogue configuration could not be loaded."));
  }, []);

  const selectedType = productTypes.find(type => type.id === form.productTypeId);
  const categoryOptions = useMemo(() => categories.map(category => ({
    ...category,
    label: `${category.parentId ? "— " : ""}${category.name} · /${category.slug}`,
  })), [categories]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(old => ({ ...old, [key]: value }));
  }
  function renderAttribute(link: DynamicAttribute) {
    const attr = link.attribute;
    const current = attributeValues[attr.id];
    const label = `${attr.name}${attr.unit ? ` (${attr.unit})` : ""}${link.isRequired ? " *" : ""}`;
    const options = Array.isArray(attr.options) ? attr.options.filter((value): value is string => typeof value === "string") : [];
    if (attr.type === "BOOLEAN") return <label key={attr.id} className="admin-dynamic-attribute"><span><input type="checkbox" checked={current === true} onChange={event => setAttributeValues(old => ({ ...old, [attr.id]: event.target.checked }))} /> {label}</span></label>;
    if (attr.type === "SELECT") return <label key={attr.id}>{label}<select required={link.isRequired} value={typeof current === "string" ? current : ""} onChange={event => setAttributeValues(old => ({ ...old, [attr.id]: event.target.value }))}><option value="">Choose…</option>{options.map(option => <option key={option}>{option}</option>)}</select></label>;
    if (attr.type === "MULTI_SELECT") return <label key={attr.id}>{label}<select multiple required={link.isRequired} value={Array.isArray(current) ? current.filter((v): v is string => typeof v === "string") : []} onChange={event => setAttributeValues(old => ({ ...old, [attr.id]: Array.from(event.target.selectedOptions).map(option => option.value) }))}>{options.map(option => <option key={option}>{option}</option>)}</select></label>;
    return <label key={attr.id}>{label}<input required={link.isRequired} type={attr.type === "NUMBER" ? "number" : attr.type === "DATE" ? "date" : "text"} value={typeof current === "string" || typeof current === "number" ? String(current) : ""} onChange={event => setAttributeValues(old => ({ ...old, [attr.id]: attr.type === "NUMBER" ? (event.target.value === "" ? "" : Number(event.target.value)) : event.target.value }))} /></label>;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (!form.categoryIds.length) throw new Error("Select at least one category.");
      if (!form.categoryIds.includes(form.primaryCategoryId)) throw new Error("Choose a primary category from the selected categories.");
      const attributes: Record<string, unknown> = {};
      for (const link of selectedType?.attributes.filter(link => !link.attribute.isVariantAxis) ?? []) {
        const raw = attributeValues[link.attribute.id];
        if (raw === undefined || raw === "" || (Array.isArray(raw) && raw.length === 0)) {
          if (link.isRequired) throw new Error(`${link.attribute.name} is required.`);
          continue;
        }
        attributes[link.attribute.id] = raw;
      }
      const payload = {
        name: form.name, slug: form.slug, description: form.description, sku: form.sku,
        hsnCode: form.hsnCode || null, material: form.material || null, color: form.color || null,
        careInstructions: form.careInstructions || null,
        weightGrams: form.weightGrams ? Number(form.weightGrams) : null,
        lengthMm: form.lengthMm ? Number(form.lengthMm) : null,
        widthMm: form.widthMm ? Number(form.widthMm) : null,
        heightMm: form.heightMm ? Number(form.heightMm) : null,
        gstRateBps: Math.round(Number(form.gstRate) * 100),
        pricePaise: Math.round(Number(form.price) * 100),
        compareAtPaise: form.compareAtPrice ? Math.round(Number(form.compareAtPrice) * 100) : null,
        inventoryQty: Number(form.stock), productTypeId: form.productTypeId || null,
        categoryIds: form.categoryIds, primaryCategoryId: form.primaryCategoryId,
        isActive: form.isActive, attributes,
        seoTitle: form.seoTitle || null, seoDescription: form.seoDescription || null,
        seoKeywords: form.seoKeywords.split(",").map(value => value.trim()).filter(Boolean),
        canonicalUrl: form.canonicalUrl || null, noIndex: form.noIndex,
      };
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not update product.");
      setMessage("Product details saved. Refresh the page to see the updated catalogue record.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update product.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-product-edit">
      <button type="button" className="primary-link" aria-expanded={open} onClick={() => setOpen(value => !value)}>
        {open ? "Close product editor" : "Edit full product"} <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <form className="admin-product-form admin-product-edit-form" onSubmit={submit}>
          <fieldset className="admin-form-section admin-form-wide">
            <legend>01 · Product identity and classification</legend>
            <p className="admin-form-section-copy">Manage the catalogue identity, URL, SKU and category placement.</p>
            <div className="admin-form-grid">
              <label>Product name<input required minLength={2} value={form.name} onChange={event => set("name", event.target.value)} /></label>
              <label>URL slug<input required pattern="[a-z0-9-]+" value={form.slug} onChange={event => set("slug", event.target.value)} /></label>
              <label>Parent SKU<input required value={form.sku} onChange={event => set("sku", event.target.value)} /></label>
              <label>Product type<select value={form.productTypeId} onChange={event => { const id = event.target.value; set("productTypeId", id); const type = productTypes.find(item => item.id === id); setAttributeValues(Object.fromEntries((type?.attributes ?? []).filter(link => link.attribute.type === "BOOLEAN").map(link => [link.attribute.id, false]))); }}><option value="">No product type</option>{productTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
              <label>Categories<select multiple value={form.categoryIds} onChange={event => { const ids = Array.from(event.target.selectedOptions).map(option => option.value); setForm(old => ({ ...old, categoryIds: ids, primaryCategoryId: ids.includes(old.primaryCategoryId) ? old.primaryCategoryId : ids[0] ?? "" })); }}><option value="" disabled>Select one or more categories</option>{categoryOptions.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
              <label>Primary category<select required value={form.primaryCategoryId} onChange={event => set("primaryCategoryId", event.target.value)}><option value="">Choose primary category</option>{categoryOptions.filter(category => form.categoryIds.includes(category.id)).map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <label>HSN code<input value={form.hsnCode} onChange={event => set("hsnCode", event.target.value)} /></label>
            </div>
          </fieldset>

          <fieldset className="admin-form-section admin-form-wide">
            <legend>02 · Materials and dimensions</legend>
            <p className="admin-form-section-copy">Keep product composition and fulfilment measurements accurate.</p>
            <div className="admin-form-grid">
              <label>Material<input value={form.material} onChange={event => set("material", event.target.value)} /></label>
              <label>Colour<input value={form.color} onChange={event => set("color", event.target.value)} /></label>
              <label>Weight (grams)<input type="number" min="1" value={form.weightGrams} onChange={event => set("weightGrams", event.target.value)} /></label>
              <label>Length (mm)<input type="number" min="1" value={form.lengthMm} onChange={event => set("lengthMm", event.target.value)} /></label>
              <label>Width (mm)<input type="number" min="1" value={form.widthMm} onChange={event => set("widthMm", event.target.value)} /></label>
              <label>Height (mm)<input type="number" min="1" value={form.heightMm} onChange={event => set("heightMm", event.target.value)} /></label>
              <label className="admin-field-span-all">Care instructions<textarea value={form.careInstructions} onChange={event => set("careInstructions", event.target.value)} /></label>
              <label className="admin-field-span-all">Description<textarea required minLength={10} value={form.description} onChange={event => set("description", event.target.value)} /></label>
            </div>
          </fieldset>

          <fieldset className="admin-form-section admin-form-wide">
            <legend>03 · Pricing, inventory and visibility</legend>
            <p className="admin-form-section-copy">Review the selling price, tax rate, stock and storefront publication status.</p>
            <div className="admin-form-grid">
              <label>GST rate (%)<input required type="number" min="0" max="100" step=".01" value={form.gstRate} onChange={event => set("gstRate", event.target.value)} /></label>
              <label>Price (INR)<input required type="number" min=".01" step=".01" value={form.price} onChange={event => set("price", event.target.value)} /></label>
              <label>Compare-at price (INR)<input type="number" min=".01" step=".01" value={form.compareAtPrice} onChange={event => set("compareAtPrice", event.target.value)} /></label>
              <label>Product stock<input required type="number" min="0" step="1" value={form.stock} onChange={event => set("stock", event.target.value)} /></label>
              <label className="admin-dynamic-attribute"><span><input type="checkbox" checked={form.isActive} onChange={event => set("isActive", event.target.checked)} /> Published on storefront</span></label>
            </div>
          </fieldset>

          {selectedType && selectedType.attributes.length > 0 && (
            <fieldset className="admin-form-section admin-form-wide admin-dynamic-fields">
              <legend>04 · {selectedType.name} specifications</legend>
              <p className="admin-form-section-copy">Product-type attributes. Variant-axis attributes are managed in the SKU section below.</p>
              <div className="admin-form-grid">
                {selectedType.attributes.filter(link => !link.attribute.isVariantAxis).map(renderAttribute)}
              </div>
            </fieldset>
          )}

          <fieldset className="admin-form-section admin-form-wide admin-seo-fields">
            <legend>05 · Search engine optimisation</legend>
            <p className="admin-form-section-copy">Control the search result title, description and canonical indexing details.</p>
            <div className="admin-form-grid">
              <label>SEO title (max 160 characters)<input maxLength={160} value={form.seoTitle} onChange={event => set("seoTitle", event.target.value)} /></label>
              <label>SEO keywords (comma separated)<input value={form.seoKeywords} onChange={event => set("seoKeywords", event.target.value)} /></label>
              <label className="admin-field-span-all">SEO description (max 320 characters)<textarea maxLength={320} rows={3} value={form.seoDescription} onChange={event => set("seoDescription", event.target.value)} /></label>
              <label className="admin-field-span-all">Canonical URL<input type="url" value={form.canonicalUrl} onChange={event => set("canonicalUrl", event.target.value)} /></label>
              <label className="admin-dynamic-attribute"><span><input type="checkbox" checked={form.noIndex} onChange={event => set("noIndex", event.target.checked)} /> Exclude this product from search indexing</span></label>
            </div>
          </fieldset>

          {message && <p className="admin-form-wide" role="status">{message}</p>}
          <div className="admin-form-footer admin-form-wide">
            <p>Changes are saved to the existing product record.</p>
            <button className="primary-link" disabled={busy}>{busy ? "Saving…" : "Save product changes"}</button>
          </div>
        </form>
      )}
    </section>
  );
}
