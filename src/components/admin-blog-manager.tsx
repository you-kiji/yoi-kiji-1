"use client";
import Link from "next/link";

import { useMemo, useState } from "react";

type Item = { id: string; name: string; slug: string };
type Post = { id: string; title: string; slug: string; excerpt: string | null; contentMarkdown: string; status: string; publishedAt: string | null; scheduledAt: string | null; updatedAt: string; _count: { categories: number; tags: number; relatedProducts: number } };
type Product = Item & { sku: string };

export function AdminBlogManager({ initialPosts, categories, tags, products }: { initialPosts: Post[]; categories: Item[]; tags: Item[]; products: Product[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [selectedPosts,setSelectedPosts]=useState<string[]>([]);
  const [bulkBusy,setBulkBusy]=useState(false);
  const [query,setQuery]=useState("");
  const [statusFilter,setStatusFilter]=useState("ALL");
  const [page,setPage]=useState(1);
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const blank = { title: "", slug: "", excerpt: "", contentMarkdown: "", coverImageUrl: "", coverImageAlt: "", seoTitle: "", seoDescription: "", status: "DRAFT", scheduledAt: "", categoryIds: [] as string[], tagIds: [] as string[], relatedProductIds: [] as string[] };
  const [form, setForm] = useState(blank);
  const [taxType, setTaxType] = useState<"category" | "tag">("category");
  const [taxName, setTaxName] = useState("");
  const [taxSlug, setTaxSlug] = useState("");
  const available = useMemo(() => ({ categories, tags, products }), [categories, tags, products]);
  const filteredPosts=useMemo(()=>posts.filter(post=>(statusFilter==="ALL"||post.status===statusFilter)&&(!query||[post.title,post.slug,post.excerpt??""].some(value=>value.toLowerCase().includes(query.toLowerCase())))),[posts,statusFilter,query]);
  const pageSize=20,totalPages=Math.max(1,Math.ceil(filteredPosts.length/pageSize)),pagePosts=filteredPosts.slice((page-1)*pageSize,page*pageSize);
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
  async function bulkSetStatus(status:"PUBLISHED"|"ARCHIVED") {
    if(!selectedPosts.length)return;setBulkBusy(true);setMessage("");const targets=[...selectedPosts];
    const results=await Promise.allSettled(targets.map(async id=>{const response=await fetch("/api/admin/blog",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({id,data:{status}})});const data=await response.json();if(!response.ok)throw new Error(data.error??"Article update failed.");return id;}));
    const done=new Set<string>();results.forEach((result,index)=>{if(result.status==="fulfilled")done.add(targets[index]);});
    if(done.size)setPosts(current=>current.map(post=>done.has(post.id)?{...post,status}:post));setSelectedPosts(old=>old.filter(id=>!done.has(id)));
    setMessage(done.size+" article(s) updated; "+(results.length-done.size)+" failed.");setBulkBusy(false);
  }
  async function archive(id: string) {
    if (!window.confirm("Archive this article? It will no longer appear publicly.")) return;
    const response = await fetch("/api/admin/blog?id=" + encodeURIComponent(id), { method: "DELETE" });
    if (response.ok) setPosts(current => current.filter(post => post.id !== id));
    else setMessage("Could not archive article.");
  }
  return <section className="admin-blog-manager">
    <div className="admin-section-heading"><h2>Editorial library</h2><span>{filteredPosts.length} matching · {posts.length} loaded</span></div>
    <div className="admin-blog-filters"><label>Search articles<input value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}} placeholder="Title, URL or excerpt"/></label><label>Publishing status<select value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(1);}}><option value="ALL">All statuses</option><option value="DRAFT">Draft</option><option value="SCHEDULED">Scheduled</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></label><button type="button" className="commerce-button" onClick={() => start()}>Create article</button></div>
    {message && <p role="status">{message}</p>}
    <div className="admin-blog-bulkbar"><label><input type="checkbox" checked={pagePosts.length>0&&pagePosts.every(post=>selectedPosts.includes(post.id))} onChange={e=>setSelectedPosts(old=>e.target.checked?[...new Set([...old,...pagePosts.map(post=>post.id)])]:old.filter(id=>!pagePosts.some(post=>post.id===id)))}/> Select this page</label><span>{selectedPosts.length} selected</span><button type="button" disabled={!selectedPosts.length||bulkBusy} onClick={()=>bulkSetStatus("PUBLISHED")}>Publish selected</button><button type="button" disabled={!selectedPosts.length||bulkBusy} onClick={()=>bulkSetStatus("ARCHIVED")}>Archive selected</button><button type="button" disabled={!selectedPosts.length||bulkBusy} onClick={()=>setSelectedPosts([])}>Clear</button></div>
    <div className="orders-list">{pagePosts.map(post => <article className="order-card" key={post.id}><div><label className="admin-blog-select"><input type="checkbox" checked={selectedPosts.includes(post.id)} onChange={e=>setSelectedPosts(old=>e.target.checked?[...old,post.id]:old.filter(id=>id!==post.id))}/> Select article</label><strong><Link href={`/admin/blog/${post.id}`}>{post.title}</Link></strong><p><Link className="admin-product-open-link" href={`/admin/blog/${post.id}`}>Open article details</Link></p><p>/{post.slug}</p><small>Updated {new Date(post.updatedAt).toLocaleDateString("en-IN")}</small></div><span className="order-status">{post.status.toLowerCase()}</span><div><button type="button" onClick={() => start(post)}>Edit</button> <button type="button" onClick={() => archive(post.id)}>Archive</button></div></article>)}</div>
    {filteredPosts.length===0&&<p>No articles match these filters.</p>}
    <div className="admin-blog-pagination"><span>Showing {filteredPosts.length?((page-1)*pageSize+1):0}–{Math.min(page*pageSize,filteredPosts.length)} of {filteredPosts.length}</span><div><button type="button" disabled={page<=1} onClick={()=>setPage(v=>v-1)}>Previous</button><span>Page {page} of {totalPages}</span><button type="button" disabled={page>=totalPages} onClick={()=>setPage(v=>v+1)}>Next</button></div></div>
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
