"use client";

import { useEffect, useState } from "react";

type Item = {
  id: string;
  label: string;
  href: string;
  location: "HEADER" | "FOOTER";
  sortOrder: number;
  isActive: boolean;
  openInNewTab: boolean;
};

type Draft = Pick<Item, "label" | "href" | "location" | "openInNewTab">;

export function StoreNavigationManager() {
  const [items, setItems] = useState<Item[]>([]);
  const [label, setLabel] = useState("");
  const [href, setHref] = useState("");
  const [location, setLocation] = useState<"HEADER" | "FOOTER">("HEADER");
  const [openInNewTab, setOpenInNewTab] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function request(method: "POST" | "PATCH", body: unknown) {
    const response = await fetch("/api/admin/store-navigation", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Navigation update failed.");
    return data;
  }

  async function load() {
    const response = await fetch("/api/admin/store-navigation", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load navigation.");
    setItems(data.items);
  }

  useEffect(() => {
    void load().catch((error) => setMessage(error.message));
  }, []);

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const group = items.filter((item) => item.location === location);
      const data = await request("POST", {
        label,
        href,
        location,
        openInNewTab,
        sortOrder: group.length ? Math.max(...group.map((item) => item.sortOrder)) + 1 : 0,
      });
      setItems((current) => [...current, data.item]);
      setLabel("");
      setHref("");
      setOpenInNewTab(false);
      setMessage("Navigation link added.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function setActive(item: Item, isActive: boolean) {
    setBusy(true);
    setMessage("");
    try {
      const data = await request("PATCH", { id: item.id, data: { isActive } });
      setItems((current) => current.map((entry) => entry.id === item.id ? data.item : entry));
      setMessage(isActive ? "Navigation link enabled." : "Navigation link disabled.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update navigation link.");
    } finally {
      setBusy(false);
    }
  }

  async function move(item: Item, direction: -1 | 1) {
    const group = items
      .filter((entry) => entry.location === item.location)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
    const index = group.findIndex((entry) => entry.id === item.id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= group.length) return;

    const reordered = [...group];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setBusy(true);
    setMessage("");
    try {
      // Normalize the complete group so legacy or duplicate sortOrder values cannot
      // cause links to jump unpredictably on the next load.
      for (const [sortOrder, entry] of reordered.entries()) {
        await request("PATCH", { id: entry.id, data: { sortOrder } });
      }
      await load();
      setMessage("Navigation order saved.");
    } catch (error) {
      await load().catch(() => undefined);
      setMessage(error instanceof Error ? error.message : "Could not reorder links.");
    } finally {
      setBusy(false);
    }
  }

  function beginEdit(item: Item) {
    setEditingId(item.id);
    setEditDraft({
      label: item.label,
      href: item.href,
      location: item.location,
      openInNewTab: item.openInNewTab,
    });
    setMessage("");
  }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId || !editDraft) return;
    setBusy(true);
    setMessage("");
    try {
      const data = await request("PATCH", { id: editingId, data: editDraft });
      setItems((current) => current.map((item) => item.id === editingId ? data.item : item));
      setEditingId(null);
      setEditDraft(null);
      setMessage("Navigation link updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update navigation link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-content-panel">
      <div className="admin-section-heading">
        <h2>Store navigation</h2>
        <span>Custom header and footer links</span>
      </div>
      <p>Add, edit, arrange and disable links independently for the desktop/mobile header and footer. Existing Shop, Categories and account actions remain available.</p>

      <form className="admin-content-form" onSubmit={add}>
        <label>Link label<input required maxLength={80} value={label} onChange={(event) => setLabel(event.target.value)} placeholder="e.g. New arrivals" /></label>
        <label>Destination<input required maxLength={500} value={href} onChange={(event) => setHref(event.target.value)} placeholder="/shop or https://…" /></label>
        <label>Placement<select value={location} onChange={(event) => setLocation(event.target.value as "HEADER" | "FOOTER")}><option value="HEADER">Header</option><option value="FOOTER">Footer</option></select></label>
        <label className="admin-checkbox-label"><input type="checkbox" checked={openInNewTab} onChange={(event) => setOpenInNewTab(event.target.checked)} /> Open external link in new tab</label>
        <button disabled={busy}>{busy ? "Saving…" : "Add navigation link"}</button>
      </form>

      {(["HEADER", "FOOTER"] as const).map((place) => {
        const group = items.filter((item) => item.location === place).sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
        return (
          <div className="admin-content-list" key={place}>
            <h3>{place === "HEADER" ? "Header links" : "Footer links"}</h3>
            {group.length === 0 && <p>No custom links added yet.</p>}
            {group.map((item, index) => (
              <article key={item.id}>
                {editingId === item.id && editDraft ? (
                  <form className="admin-content-form" onSubmit={saveEdit}>
                    <label>Link label<input required maxLength={80} value={editDraft.label} onChange={(event) => setEditDraft({ ...editDraft, label: event.target.value })} /></label>
                    <label>Destination<input required maxLength={500} value={editDraft.href} onChange={(event) => setEditDraft({ ...editDraft, href: event.target.value })} /></label>
                    <label>Placement<select value={editDraft.location} onChange={(event) => setEditDraft({ ...editDraft, location: event.target.value as "HEADER" | "FOOTER" })}><option value="HEADER">Header</option><option value="FOOTER">Footer</option></select></label>
                    <label className="admin-checkbox-label"><input type="checkbox" checked={editDraft.openInNewTab} onChange={(event) => setEditDraft({ ...editDraft, openInNewTab: event.target.checked })} /> Open in new tab</label>
                    <div className="admin-inline-actions"><button type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button><button type="button" disabled={busy} onClick={() => { setEditingId(null); setEditDraft(null); }}>Cancel</button></div>
                  </form>
                ) : (
                  <>
                    <div>
                      <strong>{item.label}</strong>
                      <p>{item.href}</p>
                      <small>{item.isActive ? "Enabled" : "Disabled"}{item.openInNewTab ? " · Opens in new tab" : ""}</small>
                    </div>
                    <div className="admin-inline-actions">
                      <button type="button" disabled={busy || index === 0} onClick={() => void move(item, -1)}>Move up</button>
                      <button type="button" disabled={busy || index === group.length - 1} onClick={() => void move(item, 1)}>Move down</button>
                      <button type="button" disabled={busy} onClick={() => beginEdit(item)}>Edit</button>
                      <button type="button" disabled={busy} onClick={() => void setActive(item, !item.isActive)}>{item.isActive ? "Disable" : "Enable"}</button>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        );
      })}
      {message && <p role="status" className="admin-feedback">{message}</p>}
    </section>
  );
}
