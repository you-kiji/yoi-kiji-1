"use client";

import { useEffect, useState } from "react";

type Settings = {
  background: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  contentMaxWidth: number;
  sectionSpacing: number;
  buttonRadius: number;
};

const defaults: Settings = {
  background: "#0e300e",
  surface: "#19451b",
  text: "#e9e9e9",
  muted: "#c8d0c5",
  accent: "#c9a878",
  contentMaxWidth: 1440,
  sectionSpacing: 96,
  buttonRadius: 8,
};

const fixedPalette = { background: "#0e300e", surface: "#19451b", text: "#e9e9e9", muted: "#c8d0c5", accent: "#c9a878" };

export function StorefrontBrandSettingsManager() {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Loading brand settings…");

  useEffect(() => {
    let active = true;
    fetch("/api/admin/storefront-brand-settings", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load brand settings.");
        if (active) setSettings({ ...defaults, ...data.settings, ...fixedPalette });
      })
      .then(() => { if (active) setMessage(""); })
      .catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "Unable to load brand settings."); });
    return () => { active = false; };
  }, []);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/storefront-brand-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, ...fixedPalette }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save brand settings.");
      setSettings({ ...defaults, ...data.settings, ...fixedPalette });
      setMessage("Brand settings saved. The storefront will use the updated design tokens on the next page load.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save brand settings.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-content-panel">
      <div className="admin-section-heading">
        <h2>Global brand settings</h2>
        <span>Storewide design tokens</span>
      </div>
      <p>The official deep-green and off-white palette is fixed for brand consistency. Adjust the content width and section rhythm below. Montserrat remains the single site font family.</p>
      <form className="admin-content-form" onSubmit={save}>
        <div className="storefront-brand-color-grid wide" aria-label="Official YOI KIJI brand palette">
          <div className="storefront-brand-color-field"><span>Primary deep green</span><span className="storefront-brand-color-control"><i style={{ background: "#0e300e" }} /><code>#0e300e</code></span></div>
          <div className="storefront-brand-color-field"><span>Primary off-white</span><span className="storefront-brand-color-control"><i style={{ background: "#e9e9e9" }} /><code>#e9e9e9</code></span></div>
          <div className="storefront-brand-color-field"><span>Secondary forest</span><span className="storefront-brand-color-control"><i style={{ background: "#19451b" }} /><code>#19451b</code></span></div>
          <div className="storefront-brand-color-field"><span>Muted neutral</span><span className="storefront-brand-color-control"><i style={{ background: "#c8d0c5" }} /><code>#c8d0c5</code></span></div>
        </div>
        <label>Maximum content width (px)<input type="number" min={1080} max={1920} step={40} value={settings.contentMaxWidth} onChange={(event) => update("contentMaxWidth", Number(event.target.value))} /></label>
        <label>Section vertical spacing (px)<input type="number" min={48} max={160} step={8} value={settings.sectionSpacing} onChange={(event) => update("sectionSpacing", Number(event.target.value))} /></label>
        <label>Button corner radius (px)<input type="number" min={0} max={24} step={2} value={settings.buttonRadius} onChange={(event) => update("buttonRadius", Number(event.target.value))} /></label>
        <div className="wide storefront-brand-preview" style={{ background: settings.background, color: settings.text, borderColor: settings.accent }}>
          <span style={{ color: settings.muted }}>YOI KIJI · BRAND PREVIEW</span>
          <strong>Textiles for the way you live.</strong>
          <button type="button" style={{ background: settings.text, color: settings.background, borderRadius: settings.buttonRadius }}>Explore collection</button>
          <i style={{ background: settings.accent }} />
        </div>
        <button disabled={busy}>{busy ? "Saving…" : "Save global brand settings"}</button>
      </form>
      {message && <p role="status" className="admin-feedback">{message}</p>}
    </section>
  );
}
