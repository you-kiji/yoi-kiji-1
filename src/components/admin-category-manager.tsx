"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Category = {
  id: string; name: string; slug: string; description: string | null; imageUrl: string | null;
  parentId: string | null; sortOrder: number; isActive: boolean; showInMenu: boolean;
  seoTitle: string | null; seoDescription: string | null;
  _count: { children: number; products: number; productLinks: number };
};
type CategoryForm = { name: string; slug: string; description: string; imageUrl: string; parentId: string; sortOrder: string; showInMenu: boolean; seoTitle: string; seoDescription: string };
const emptyForm: CategoryForm = { name: "", slug: "", description: "", imageUrl: "", parentId: "", sortOrder: "0", showInMenu: true, seoTitle: "", seoDescription: "" };

export function AdminCategoryManager() {
  const [items, setItems] = useState<Category[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/categories", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to load categories.");
      setItems(data.categories);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load categories."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const byParent = useMemo(() => {
    const map = new Map<string | null, Category[]>();
    for (const item of items) map.set(item.parentId, [...(map.get(item.parentId) ?? []), item]);
    for (const list of map.values()) list.sort((a,b) => a.sortOrder-b.sortOrder || a.name.localeCompare(b.name));
    return map;
  }, [items]);

  function set<K extends keyof CategoryForm>(key: K, value: CategoryForm[K]) { setForm(old => ({ ...old, [key]: value })); }
  function edit(item: Category) {
    setEditingId(item.id);
    setForm({ name: item.name, slug: item.slug, description: item.description ?? "", imageUrl: item.imageUrl ?? "", parentId: item.parentId ?? "", sortOrder: String(item.sortOrder), showInMenu: item.showInMenu, seoTitle: item.seoTitle ?? "", seoDescription: item.seoDescription ?? "" });
    document.getElementById("category-name")?.focus();
  }
  function addChild(item: Category) {
    setEditingId(null);
    setForm({ ...emptyForm, parentId: item.id });
    document.getElementById("category-name")?.focus();
  }
  function renderTree(parentId: string | null, depth = 0, ancestors = new Set<string>()): React.ReactNode {
    return (byParent.get(parentId) ?? []).map(item => {
      if (ancestors.has(item.id)) return null;
      const next = new Set(ancestors); next.add(item.id);
      return <div className="category-tree-node" key={item.id}>
        <div className="category-tree-row" style={{ paddingLeft: 14 + depth * 24 }}>
          <div className="category-tree-name"><strong>{item.name}</strong><span>/{item.slug}</span><small>{item._count.products + item._count.productLinks} product assignment(s) · {item._count.children} child categories</small></div>
          <div className="category-tree-actions"><span className={item.isActive ? "active-state" : "inactive-state"}>{item.isActive ? "Active" : "Inactive"}</span><button type="button" onClick={() => edit(item)}>Edit</button><button type="button" onClick={() => addChild(item)}>Add child +</button><button type="button" onClick={() => void toggle(item)}>{item.isActive ? "Deactivate" : "Activate"}</button></div>
        </div>
        {renderTree(item.id, depth + 1, next)}
      </div>;
    });
  }

  async function toggle(item: Category) {
    setMessage("");
    const response = await fetch("/api/admin/categories", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, isActive: !item.isActive, showInMenu: item.isActive ? false : item.showInMenu }) });
    const data = await response.json();
    if (!response.ok) setMessage(data.error ?? "Could not update category.");
    else { setMessage(item.isActive ? "Category deactivated. Existing product references were retained." : "Category activated."); await load(); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const payload = { ...form, parentId: form.parentId || null, sortOrder: Number(form.sortOrder), description: form.description || null, imageUrl: form.imageUrl || null, seoTitle: form.seoTitle || null, seoDescription: form.seoDescription || null };
      const response = await fetch("/api/admin/categories", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editingId ? { ...payload, id: editingId } : payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save category.");
      setForm(emptyForm); setEditingId(null);
      setMessage(editingId ? "Category updated." : "Category created.");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save category."); }
    finally { setBusy(false); }
  }

  return <section className="admin-create admin-category-manager">
    <div className="admin-section-heading"><div><p className="eyebrow">DYNAMIC TAXONOMY</p><h2>Category structure</h2><p>Build parent, child and deeper category levels without a fixed depth limit.</p></div><button type="button" className="text-link" onClick={() => setExpanded(v => !v)}>{expanded ? "Hide manager −" : "Show manager +"}</button></div>
    {expanded && <>
      <form className="admin-product-form" onSubmit={submit}>
        <div className="admin-form-wide"><p className="eyebrow">{editingId ? "EDIT CATEGORY" : "NEW CATEGORY"}</p></div>
        <label>Category name<input id="category-name" required minLength={2} maxLength={100} value={form.name} onChange={e => set("name", e.target.value)} /></label>
        <label>URL slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={e => set("slug", e.target.value)} placeholder="e.g. fitted-bedsheets" /></label>
        <label>Parent category<select value={form.parentId} onChange={e => set("parentId", e.target.value)}><option value="">Top-level category</option>{items.filter(c => c.isActive && c.id !== editingId).map(c => <option key={c.id} value={c.id}>{c.name} · /{c.slug}</option>)}</select></label>
        <label>Display order<input type="number" min="0" max="10000" value={form.sortOrder} onChange={e => set("sortOrder", e.target.value)} /></label>
        <label className="admin-form-wide">Description<textarea value={form.description} onChange={e => set("description", e.target.value)} maxLength={2000} /></label>
        <label className="admin-form-wide">Category image URL<input type="url" value={form.imageUrl} onChange={e => set("imageUrl", e.target.value)} placeholder="https://…" /></label>
        <label>SEO title<input maxLength={160} value={form.seoTitle} onChange={e => set("seoTitle", e.target.value)} /></label>
        <label>SEO description<input maxLength={320} value={form.seoDescription} onChange={e => set("seoDescription", e.target.value)} /></label>
        <label className="admin-form-wide"><span><input type="checkbox" checked={form.showInMenu} onChange={e => set("showInMenu", e.target.checked)} /> Show in navigation menu</span></label>
        {message && <p className="admin-form-wide" role="status">{message}</p>}
        <div className="admin-form-wide" style={{display:"flex",gap:12,flexWrap:"wrap"}}><button className="primary-link" disabled={busy}>{busy ? "Saving…" : editingId ? "Save category" : "Create category"}</button>{editingId && <button className="text-link" type="button" onClick={() => {setEditingId(null);setForm(emptyForm);}}>Cancel edit</button>}</div>
      </form>
      <div className="category-tree">{loading ? <p>Loading categories…</p> : items.length ? renderTree(null) : <p>No categories yet. Create your first top-level category.</p>}</div>
    </>}
  </section>;
}
