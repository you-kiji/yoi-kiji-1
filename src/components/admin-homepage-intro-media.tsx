"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Slide = { type: "IMAGE" | "VIDEO"; url: string; alt?: string; assetId?: string };
type Asset = { id: string; secureUrl: string; resourceType: "IMAGE" | "VIDEO" | "RAW"; format: string; title: string | null; originalFilename: string | null; width: number | null; height: number | null };

export function AdminHomepageIntroMedia({ sectionId, initialSlides }: { sectionId: string | null; initialSlides: Slide[] }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [slides, setSlides] = useState<Slide[]>(initialSlides);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all(["IMAGE", "VIDEO"].map(type => fetch("/api/admin/media?type=" + type + "&page=1").then(r => r.json())))
      .then(results => setAssets(results.flatMap(result => result.assets || []).filter((asset: Asset) => asset.resourceType === "IMAGE" || (asset.resourceType === "VIDEO" && ["mp4", "webm", "mov", "m4v"].includes(asset.format.toLowerCase())))))
      .catch(() => setError("Could not load the media library."));
  }, []);

  function add(asset: Asset) {
    if (asset.resourceType !== "IMAGE" && asset.resourceType !== "VIDEO") return;
    setSlides(current => current.some(item => item.assetId === asset.id) ? current : [...current, {
      type: asset.resourceType, url: asset.secureUrl, alt: asset.title || asset.originalFilename || "", assetId: asset.id
    }]);
  }
  function move(index: number, direction: -1 | 1) {
    setSlides(current => {
      const next = [...current], target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  async function save() {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/storefront", {
        method: sectionId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "section",
          ...(sectionId ? { id: sectionId } : {}),
          data: { key: "intro-media", sectionType: "media-carousel", slides, position: 0, isActive: true }
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save the introduction media.");
      setMessage("Homepage media carousel saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save.");
    } finally { setBusy(false); }
  }

  return <section className="admin-content-panel admin-homepage-media">
    <div className="admin-section-heading"><h2>Homepage introduction media</h2><span>Images & videos only</span></div>
    <p>Choose assets from the media library, arrange their order and publish the horizontal introduction carousel. Upload new files in the media library first.</p>
    <p><Link href="/admin/media">Open media library to upload images or videos ↗</Link></p>
    <div className="admin-homepage-media__selected">
      {slides.map((slide, index) => <article key={slide.assetId || slide.url}>
        <div className="admin-homepage-media__preview">{slide.type === "VIDEO" ? <video src={slide.url} muted playsInline /> : <img src={slide.url} alt={slide.alt || ""}/>}</div>
        <div><strong>{slide.type}</strong><small>{index + 1} · {slide.alt || "Untitled media"}</small></div>
        <button type="button" disabled={index === 0} onClick={() => move(index, -1)}>Move up</button>
        <button type="button" disabled={index === slides.length - 1} onClick={() => move(index, 1)}>Move down</button>
        <button type="button" onClick={() => setSlides(current => current.filter((_, i) => i !== index))}>Remove</button>
      </article>)}
      {!slides.length && <p>No media selected yet.</p>}
    </div>
    <h3>Add from media library</h3>
    <div className="admin-homepage-media__library">
      {assets.map(asset => <button type="button" key={asset.id} disabled={slides.some(item => item.assetId === asset.id)} onClick={() => add(asset)}>
        {asset.resourceType === "VIDEO" ? <video src={asset.secureUrl} muted playsInline /> : <img src={asset.secureUrl} alt="" />}
        <span>{asset.title || asset.originalFilename || asset.format}</span>
        <small>{asset.resourceType}</small>
      </button>)}
      {!assets.length && <p>No images or videos found. Upload assets in the media library.</p>}
    </div>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <button type="button" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save homepage media"}</button>
  </section>;
}
