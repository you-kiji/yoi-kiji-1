"use client";
import Link from "next/link";

import { useMemo, useState } from "react";

type Item = { id: string; name: string; slug: string };
type Post = { id: string; title: string; slug: string; excerpt: string | null; contentMarkdown: string; status: string; publishedAt: string | null; scheduledAt: string | null; updatedAt: string; _count: { categories: number; tags: number; relatedProducts: number } };
type Product = Item & { sku: string };

export function AdminBlogManager({ initialPosts, categories, tags, products }: { initialPosts: Post[]; categories: Item[]; tags: Item[]; products: Product[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const blank = { title: "", slug: "", excerpt: "", contentMarkdown: "", coverImageUrl: "", coverImageAlt: "", seoTitle: "", seoDescription: "", status: "DRAFT", scheduledAt: "", categoryIds: [] as string[], tagIds: [] as string[], relatedProductIds: [] as string[] };
  const [form, setForm] = useState(blank);
  const [taxType, setTaxType] = useState<"category" | "tag">("category");
  const [taxName, setTaxName] = useState("");
  const [taxSlug, setTaxSlug] = useState("");
  const available = useMemo(() => ({ categories, tags, products }), [categories, tags, products]);
  function update<K extends keyof typeof blank>(key: K, value: typeof blank[K]) { setForm(current => ({ ...current, [key]: value })); }
  function toggle(key: "categoryIds" | "tagIds" | "relatedProductIds", id: string) { update(key, form[key].includes(id) ? form[key].filter(value => value !== id) : [...form[key], id]); }
  function start(post?: Post) {
    if (!post) { setEditing(null); setForm(blank); return; }
    setEditing(post.id);
    fetch("/api/admin/blog").then(response => response.json()).then(data => {
      const full = data.posts?.find((item: any) => item.id === post.id);
      if (!full) return;
      setForm({ title: full.title, slug: full.slug, excerpt: full.excerpt ?? "", contentMarkdown: full.contentMarkdown, coverImageUrl: full.coverImageUrl ?? "", coverImageAlt: full.coverImageAlt ?? "", seoTitle: full.seoTitle ?? "", seoDescription: full.seoDescription ?? "", status: full.status, scheduledAt: full.scheduledAt ? new Date(full.scheduledAt).toISOString().slice(0,16) : "", categoryIds: full.categories.map((x: any) => x.category.id), tagIds: full.tags.map((x: any) => x.tag.id), relatedProductIds: full.relatedProducts.map((x: any) => x.product.id) });
    }).catch(() => setMessage("Could not load this article."));
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/blog", { method: editing ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(editing ? { id: editing, data: { ...form, scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null } } : { ...form, scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save article.");
      setMessage("Article saved."); window.location.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save article."); }
    finally { setBusy(false); }
  }
  async function createTaxonomy(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      const response = await fetch("/api/admin/blog/taxonomy", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: taxType, data: { name: taxName, slug: taxSlug } }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Could not create item.");
      setMessage("Created. Refresh the page to use it."); setTaxName(""); setTaxSlug("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create item."); }
    finally { setBusy(false); }
  }
  async function archive(id: string) {
    if (!window.confirm("Archive this article? It will no longer appear publicly.")) return;
    const response = await fetch("/api/admin/blog?id=" + encodeURIComponent(id), { method: "DELETE" });
    if (response.ok) setPosts(current => current.filter(post => post.id !== id));
    else setMessage("Could not archive article.");
  }
  return <section className="admin-blog-manager">
    <div className="admin-section-heading"><h2>Editorial library</h2><span>{posts.length} recent articles</span></div>
    <button type="button" className="commerce-button" onClick={() => start()}>Create article</button>
    {message && <p role="status">{message}</p>}
    <div className="orders-list">{posts.map(post => <article className="order-card" key={post.id}><div><strong><Link href={`/admin/blog/${post.id}`}>{post.title}</Link></strong><p><Link className="admin-product-open-link" href={`/admin/blog/${post.id}`}>Open article details</Link></p><p>/{post.slug}</p><small>Updated {new Date(post.updatedAt).toLocaleDateString("en-IN")}</small></div><span className="order-status">{post.status.toLowerCase()}</span><div><button type="button" onClick={() => start(post)}>Edit</button> <button type="button" onClick={() => archive(post.id)}>Archive</button></div></article>)}</div>
    <form onSubmit={save} className="admin-blog-form">
      <h2>{editing ? "Edit article" : "New article"}</h2>
      <label>Title<input required minLength={3} maxLength={180} value={form.title} onChange={e => update("title", e.target.value)}/></label>
      <label>URL slug<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={form.slug} onChange={e => update("slug", e.target.value)}/></label>
      <label>Excerpt<textarea maxLength={500} value={form.excerpt} onChange={e => update("excerpt", e.target.value)}/></label>
      <label>Article content (Markdown)<textarea required rows={14} value={form.contentMarkdown} onChange={e => update("contentMarkdown", e.target.value)}/></label>
      <label>Cover image URL<input type="url" value={form.coverImageUrl} onChange={e => update("coverImageUrl", e.target.value)}/></label>
      <label>Cover image alt text<input maxLength={200} value={form.coverImageAlt} onChange={e => update("coverImageAlt", e.target.value)}/></label>
      <label>SEO title<input maxLength={160} value={form.seoTitle} onChange={e => update("seoTitle", e.target.value)}/></label>
      <label>SEO description<textarea maxLength={320} value={form.seoDescription} onChange={e => update("seoDescription", e.target.value)}/></label>
      <label>Publishing status<select value={form.status} onChange={e => update("status", e.target.value)}><option value="DRAFT">Draft</option><option value="SCHEDULED">Scheduled</option><option value="PUBLISHED">Published now</option><option value="ARCHIVED">Archived</option></select></label>
      {form.status === "SCHEDULED" && <label>Publish at<input required type="datetime-local" value={form.scheduledAt} onChange={e => update("scheduledAt", e.target.value)}/></label>}
      {(["categories","tags","products"] as const).map(kind => <fieldset key={kind}><legend>{kind === "products" ? "Related products" : kind}</legend>{available[kind].map(item => <label key={item.id}><input type="checkbox" checked={form[kind === "categories" ? "categoryIds" : kind === "tags" ? "tagIds" : "relatedProductIds"].includes(item.id)} onChange={() => toggle(kind === "categories" ? "categoryIds" : kind === "tags" ? "tagIds" : "relatedProductIds", item.id)}/>{item.name}</label>)}</fieldset>)}
      <button type="submit" disabled={busy}>{busy ? "Saving…" : "Save article"}</button>
      <button type="button" onClick={() => start()}>Clear form</button>
    </form>
    <form onSubmit={createTaxonomy} className="admin-blog-taxonomy"><h3>Create category or tag</h3><select value={taxType} onChange={e => setTaxType(e.target.value as "category" | "tag")}><option value="category">Category</option><option value="tag">Tag</option></select><input required placeholder="Name" value={taxName} onChange={e => setTaxName(e.target.value)}/><input required placeholder="url-slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" value={taxSlug} onChange={e => setTaxSlug(e.target.value)}/><button disabled={busy}>Create</button></form>
  </section>;
}
