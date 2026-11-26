"use client";

import { useEffect, useState } from "react";

type Slide = { imageUrl: string; videoUrl: string; imageAlt: string; eyebrow: string; title: string; body: string; ctaLabel: string; ctaHref: string };
type ProductOption = { id: string; name: string; sku: string | null };
type MediaAsset = { id: string; secureUrl: string; title: string | null; originalFilename: string | null; altText: string | null; width: number | null; height: number | null; format: string };
type Section = { id: string; key: string; sectionType: string; eyebrow?: string | null; title: string | null; body?: string | null; imageUrl?: string | null; imageAlt?: string | null; ctaLabel?: string | null; ctaHref?: string | null; position: number; isActive: boolean; slides: Slide[] | null };
const kinds = [
  ["slideshow", "Slideshow"], ["image-banner", "Image banner"], ["announcement-strip", "Announcement strip"], ["trust-badges", "Trust badges"], ["rich-text", "Rich text"],
  ["image-with-text", "Image with text"], ["featured-collections", "Featured collections"],
  ["product-grid", "Product grid"], ["image-grid", "16-image gallery"], ["testimonial", "Testimonials"], ["blog-grid", "Blog articles"], ["spacer", "Spacer"],
] as const;
const emptySlide: Slide = { imageUrl: "", videoUrl: "", imageAlt: "", eyebrow: "", title: "", body: "", ctaLabel: "", ctaHref: "" };

function hasSixteenDistinctImages(items: Slide[]) {
  if (items.length !== 16 || items.some((slide) => !slide.imageUrl.trim())) return false;
  const canonicalImages = items.map((slide) => {
    try {
      const url = new URL(slide.imageUrl);
      return `${url.origin}${url.pathname}`;
    } catch {
      return "";
    }
  });
  return canonicalImages.every(Boolean) && new Set(canonicalImages).size === 16;
}

export function StorefrontThemeBuilder() {
  const [sections, setSections] = useState<Section[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [kind, setKind] = useState("slideshow");
  const [title, setTitle] = useState("");
  const [eyebrow, setEyebrow] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaHref, setCtaHref] = useState("");
  const [slides, setSlides] = useState<Slide[]>([{ ...emptySlide }]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Loading your homepage sections…");
  const [dragId, setDragId] = useState<string | null>(null);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [mediaTargetIndex, setMediaTargetIndex] = useState<number | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState("");

  async function refresh() {
    const response = await fetch("/api/admin/storefront", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load sections");
    setSections(data.sections.map((section: Section) => ({ ...section, slides: Array.isArray(section.slides) ? section.slides : [] })));
    setProducts(Array.isArray(data.products) ? data.products : []);
    setMessage("");
  }
  useEffect(() => { void refresh().catch(error => setMessage(error.message)); }, []);

  function resetEditor() {
    setEditingId(null);
    setKind("slideshow");
    setTitle("");
    setEyebrow("");
    setBody("");
    setImageUrl("");
    setImageAlt("");
    setCtaLabel("");
    setCtaHref("");
    setSlides([{ ...emptySlide }]);
    setSelectedProductIds([]);
    setProductSearch("");
  }
  function updateSlide(index: number, patch: Partial<Slide>) {
    setSlides(current => current.map((slide, i) => i === index ? { ...slide, ...patch } : slide));
  }
  async function openMediaPicker(index: number) {
    setMediaTargetIndex(index);
    setMediaLoading(true);
    setMediaError("");
    try {
      const response = await fetch("/api/admin/media?type=IMAGE", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load the media library.");
      setMediaAssets(data.assets || []);
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : "Unable to load media library.");
    } finally {
      setMediaLoading(false);
    }
  }
  function selectMedia(asset: MediaAsset) {
    if (mediaTargetIndex === null) return;
    updateSlide(mediaTargetIndex, { imageUrl: asset.secureUrl, imageAlt: asset.altText || asset.title || asset.originalFilename || "" });
    setMediaTargetIndex(null);
  }
  function editSection(section: Section) {
    setEditingId(section.id);
    setKind(section.sectionType);
    setTitle(section.title || "");
    setEyebrow(section.eyebrow || "");
    setBody(section.body || "");
    setImageUrl(section.imageUrl || "");
    setImageAlt(section.imageAlt || "");
    setCtaLabel(section.ctaLabel || "");
    setCtaHref(section.ctaHref || "");
    setSlides(section.slides?.length ? section.slides.map(slide => ({ ...emptySlide, ...slide })) : [{ ...emptySlide }]);
    setSelectedProductIds(section.sectionType === "product-grid" ? (section.slides || []).map(slide => slide.title).filter((value): value is string => Boolean(value)) : []);
    setMessage("Editing section. Save changes to update the homepage content.");
    document.getElementById("storefront-section-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  async function saveSection(event: React.FormEvent) {
    event.preventDefault();
    if (kind === "product-grid" && selectedProductIds.length === 0) { setMessage("Select at least one product for this featured section."); return; }
    if ((kind === "slideshow" || kind === "testimonial" || kind === "image-grid" || kind === "trust-badges") && slides.length > (kind === "image-grid" ? 16 : 30)) {
      setMessage(kind === "image-grid" ? "The homepage gallery can contain exactly 16 images." : "A section can contain a maximum of 30 slides.");
      return;
    }
    if (kind === "image-grid" && !hasSixteenDistinctImages(slides)) { setMessage("The homepage gallery must contain exactly 16 distinct images. Reusing the same image is not allowed."); return; }
    if ((kind === "slideshow" || kind === "image-grid" || kind === "trust-badges") && slides.some(slide => !slide.imageUrl.trim() && !(kind === "slideshow" && (slide.videoUrl || "").trim()))) {
      setMessage(kind === "trust-badges" ? "Every trust badge needs an image." : kind === "image-grid" ? "Every gallery tile needs an image." : "Every slideshow slide needs an image. Add an image or video.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const key = kind + "-" + crypto.randomUUID().slice(0, 12);
      const data = {
        ...(editingId ? {} : { key, position: sections.length * 10, isActive: true }),
        sectionType: kind,
        title: title || null,
        eyebrow: eyebrow || null,
        body: body || null,
        imageUrl: imageUrl || null,
        imageAlt: imageAlt || null,
        ctaLabel: ctaLabel || null,
        ctaHref: ctaHref || null,
        slides: kind === "product-grid" ? selectedProductIds.slice(0,8).map(productId => ({ ...emptySlide, title: productId })) : kind === "slideshow" || kind === "image-grid" || kind === "trust-badges" ? slides.slice(0, kind === "image-grid" ? 16 : 30) : kind === "testimonial" ? slides.filter(slide => slide.body || slide.title) : [],
      };
      const response = await fetch("/api/admin/storefront", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { resource: "section", id: editingId, data } : { resource: "section", data }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save section");
      await refresh();
      resetEditor();
      setMessage(editingId ? "Homepage section updated." : "Section added to homepage.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save section");
    } finally {
      setBusy(false);
    }
  }
  async function reorder(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    const next = [...sections];
    const from = next.findIndex(section => section.id === sourceId);
    const to = next.findIndex(section => section.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setSections(next);
    setBusy(true);
    try {
      const responses = await Promise.all(next.map((section, index) => fetch("/api/admin/storefront", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource: "section", id: section.id, data: { position: (index + 1) * 10 } }),
      })));
      if (responses.some(response => !response.ok)) throw new Error("Could not save section order");
      setMessage("Homepage section order saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Order update failed");
      await refresh().catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  async function duplicate(section: Section) {
    setBusy(true);
    setMessage("");
    try {
      const key = section.sectionType + "-" + crypto.randomUUID().slice(0, 12);
      const response = await fetch("/api/admin/storefront", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource: "section", data: {
          key, sectionType: section.sectionType, eyebrow: section.eyebrow, title: section.title, body: section.body,
          imageUrl: section.imageUrl, imageAlt: section.imageAlt, ctaLabel: section.ctaLabel, ctaHref: section.ctaHref,
          slides: section.slides || [], position: (sections.length + 1) * 10, isActive: false,
        } }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not duplicate section");
      await refresh();
      setMessage("Section duplicated as hidden draft. Review it and enable when ready.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to duplicate section");
    } finally {
      setBusy(false);
    }
  }
  async function toggle(section: Section) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/storefront", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource: "section", id: section.id, data: { isActive: !section.isActive } }),
      });
      if (!response.ok) throw new Error("Could not update visibility");
      setSections(old => old.map(item => item.id === section.id ? { ...item, isActive: !item.isActive } : item));
      setMessage(section.isActive ? "Section hidden from the homepage." : "Section is now visible on the homepage.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Visibility update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-content-panel storefront-theme-builder">
      <div className="admin-section-heading"><h2>Homepage theme builder</h2><span>Editorial sections · drag to reorder</span></div>
      <p>Build the homepage with editorial sections, a 16-image gallery, curated product edits, video or image slideshows, customer stories and journal features. Reorder, preview and publish each section from one place.</p>
      <form id="storefront-section-editor" className="admin-content-form" onSubmit={saveSection}>
        <label>Section type<select value={kind} onChange={event => setKind(event.target.value)}>{kinds.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Section heading<input value={title} onChange={event => setTitle(event.target.value)} placeholder="Optional section heading" /></label>
        <label>Eyebrow / overline<input value={eyebrow} onChange={event => setEyebrow(event.target.value)} placeholder="Optional short label" /></label>
        <label className="wide">Description / content<textarea rows={3} value={body} onChange={event => setBody(event.target.value)} placeholder="Write the section content…" /></label>
        {kind !== "slideshow" && kind !== "testimonial" && kind !== "image-grid" && kind !== "trust-badges" && kind !== "product-grid" && kind !== "announcement-strip" && kind !== "spacer" && <>
          <label className="wide">Image URL<input type="url" value={imageUrl} onChange={event => setImageUrl(event.target.value)} placeholder="https://…" /></label>
          <label>Image alt text<input value={imageAlt} onChange={event => setImageAlt(event.target.value)} /></label>
          <label>Button label<input value={ctaLabel} onChange={event => setCtaLabel(event.target.value)} /></label>
          <label>Button link<input value={ctaHref} onChange={event => setCtaHref(event.target.value)} placeholder="/shop" /></label>
        </>}
        {kind === "product-grid" && <div className="wide storefront-product-selector"><div className="admin-section-heading"><h3>Featured products ({selectedProductIds.length}/8)</h3><span>Choose products and arrange their order.</span></div><label className="storefront-product-search">Find a product<input type="search" value={productSearch} onChange={event => setProductSearch(event.target.value)} placeholder="Search by product name or SKU" /></label><div className="storefront-product-selector__grid">{products.filter(product => (product.name+" "+(product.sku||"")).toLowerCase().includes(productSearch.trim().toLowerCase())).map(product => <label className="storefront-product-option" key={product.id}><input type="checkbox" checked={selectedProductIds.includes(product.id)} onChange={event => setSelectedProductIds(current => event.target.checked ? (current.length < 8 ? [...current, product.id] : current) : current.filter(id => id !== product.id))} /><span><strong>{product.name}</strong><small>{product.sku || "No SKU"}</small></span></label>)}</div><ol className="storefront-product-order">{selectedProductIds.map((id,index)=><li key={id}><span>{products.find(product=>product.id===id)?.name || id}</span><button type="button" disabled={index===0} onClick={()=>setSelectedProductIds(current=>{const next=[...current];[next[index-1],next[index]]=[next[index],next[index-1]];return next;})}>↑</button><button type="button" disabled={index===selectedProductIds.length-1} onClick={()=>setSelectedProductIds(current=>{const next=[...current];[next[index+1],next[index]]=[next[index],next[index+1]];return next;})}>↓</button></li>)}</ol></div>}
        {(kind === "slideshow" || kind === "testimonial" || kind === "image-grid" || kind === "trust-badges") && <div className="wide storefront-slide-editor">
          <div className="admin-section-heading">
            <h3>{kind === "testimonial" ? "Testimonials" : kind === "image-grid" ? "Gallery images" : kind === "trust-badges" ? "Trust badges" : "Slides"} ({slides.length}/{kind === "image-grid" ? 16 : 30})</h3>
            <button type="button" disabled={slides.length >= (kind === "image-grid" ? 16 : 30)} onClick={() => setSlides(old => [...old, { ...emptySlide }])}>Add {kind === "image-grid" ? "image" : "slide"}</button>
          </div>
          {kind === "image-grid" && <p className="admin-helper">Add exactly 16 images for the four-by-four homepage gallery. Select each image from the Media Library.</p>}
          {slides.map((slide, index) => <fieldset key={index} className="storefront-slide-card">
            <legend>{kind === "testimonial" ? "Testimonial" : kind === "image-grid" ? "Gallery image" : kind === "trust-badges" ? "Trust badge" : "Slide"} {index + 1}</legend>
            {(kind === "slideshow" || kind === "image-grid" || kind === "trust-badges") && <>
              <label>Image URL<input type="url" value={slide.imageUrl} onChange={event => updateSlide(index, { imageUrl: event.target.value })} placeholder="https://…" /><button type="button" className="storefront-media-picker-trigger" onClick={() => void openMediaPicker(index)}>Choose from media library</button></label>
              <label>Image alt text<input value={slide.imageAlt} onChange={event => updateSlide(index, { imageAlt: event.target.value })} /></label>
              {kind === "slideshow" && <label>Optional video URL<input type="url" value={slide.videoUrl || ""} onChange={event => updateSlide(index, { videoUrl: event.target.value })} placeholder="https://… .mp4" /></label>}
            </>}
            {kind !== "image-grid" && <>
              <label>Eyebrow / customer name<input value={slide.eyebrow} onChange={event => updateSlide(index, { eyebrow: event.target.value })} /></label>
              <label>Headline / attribution<input value={slide.title} onChange={event => updateSlide(index, { title: event.target.value })} /></label>
              <label className="wide">Description / quote<textarea rows={2} value={slide.body} onChange={event => updateSlide(index, { body: event.target.value })} /></label>
              {kind === "slideshow" && <>
                <label>Button label<input value={slide.ctaLabel} onChange={event => updateSlide(index, { ctaLabel: event.target.value })} /></label>
                <label>Button link<input value={slide.ctaHref} onChange={event => updateSlide(index, { ctaHref: event.target.value })} placeholder="/shop" /></label>
              </>}
            </>}
            {slides.length > 1 && <button type="button" onClick={() => setSlides(old => old.filter((_, itemIndex) => itemIndex !== index))}>Remove {kind === "testimonial" ? "testimonial" : kind === "image-grid" ? "image" : kind === "trust-badges" ? "badge" : "slide"}</button>}
          </fieldset>)}
        </div>}
        <div className="wide admin-inline-actions">
          <button type="submit" disabled={busy || ((kind === "slideshow" || kind === "testimonial") && slides.length > 30) || (kind === "product-grid" && selectedProductIds.length === 0) || (kind === "image-grid" && slides.length > 16)}>{busy ? "Saving…" : editingId ? "Save section changes" : "Add section to homepage"}</button>
          {editingId && <button type="button" disabled={busy} onClick={resetEditor}>Cancel editing</button>}
        </div>
      </form>
      <div className="storefront-section-stack" aria-label="Homepage section order">
        {sections.map((section, index) => <article key={section.id} draggable onDragStart={() => setDragId(section.id)} onDragOver={event => event.preventDefault()} onDrop={() => { if (dragId) void reorder(dragId, section.id); setDragId(null); }} className="storefront-section-row">
          <span className="storefront-drag-handle" aria-hidden="true">⠿</span>
          <div><strong>{index + 1}. {kinds.find(item => item[0] === section.sectionType)?.[1] || section.sectionType}</strong><p>{section.title || section.key}</p><small>{section.slides?.length || 0} content items · {section.isActive ? "Visible" : "Hidden"}</small></div>
          <button type="button" disabled={busy} onClick={() => editSection(section)}>Edit</button>
          <button type="button" disabled={busy} onClick={() => void duplicate(section)}>Duplicate</button>
          <button type="button" disabled={busy} onClick={() => void toggle(section)}>{section.isActive ? "Hide" : "Show"}</button>
          <button type="button" disabled={busy || index === 0} onClick={() => void reorder(section.id, sections[index - 1].id)}>Move up</button>
          <button type="button" disabled={busy || index === sections.length - 1} onClick={() => void reorder(section.id, sections[index + 1].id)}>Move down</button>
        </article>)}
      </div>
      {mediaTargetIndex !== null && <div className="storefront-media-picker-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setMediaTargetIndex(null); }}>
        <section className="storefront-media-picker" role="dialog" aria-modal="true" aria-labelledby="storefront-media-picker-title">
          <div className="admin-section-heading"><h3 id="storefront-media-picker-title">Choose an image</h3><button type="button" onClick={() => setMediaTargetIndex(null)}>Close</button></div>
          <p>Select an image from the existing Media Library. Upload new assets from Admin → Media Library.</p>
          {mediaLoading ? <p>Loading images…</p> : mediaError ? <p role="alert">{mediaError}</p> : mediaAssets.length === 0 ? <p>No image assets found in the library.</p> : <div className="storefront-media-picker-grid">
            {mediaAssets.map(asset => <button type="button" className="storefront-media-picker-item" key={asset.id} onClick={() => selectMedia(asset)}>
              <img src={asset.secureUrl} alt={asset.altText || asset.title || asset.originalFilename || ""} /><span>{asset.title || asset.originalFilename || asset.format}</span>
            </button>)}
          </div>}
        </section>
      </div>}
      {message && <p className="admin-feedback" role="status">{message}</p>}
    </section>
  );
}
