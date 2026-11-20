"use client";

import { FormEvent, useEffect, useState } from "react";

type Page = { id: string; slug: string; title: string; content: string; status: "DRAFT"|"PUBLISHED"|"ARCHIVED"; seoTitle: string|null; seoDescription: string|null; updatedAt: string | Date; _count?: { revisions: number } };
const blank = { slug:"", title:"", content:"", status:"DRAFT" as const, seoTitle:"", seoDescription:"" };

export function AdminLegalManager({ initialPages }: { initialPages: Page[] }) {
  const [pages,setPages]=useState(initialPages),[form,setForm]=useState(blank),[editing,setEditing]=useState<string|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  async function refresh(){const r=await fetch("/api/admin/legal",{cache:"no-store"});if(r.ok){const d=await r.json();setPages(d.pages);}}
  async function save(event:FormEvent){event.preventDefault();setBusy(true);setMessage("");try{const response=await fetch("/api/admin/legal",{method:editing?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(editing?{id:editing,data:form}:{...form})});const data=await response.json();if(!response.ok)throw new Error(data.error??"Could not save page.");setMessage("Legal page saved.");setEditing(null);setForm(blank);await refresh();}catch(error){setMessage(error instanceof Error?error.message:"Could not save page.");}finally{setBusy(false);}}
  function edit(page:Page){setEditing(page.id);setForm({slug:page.slug,title:page.title,content:page.content,status:page.status,seoTitle:page.seoTitle??"",seoDescription:page.seoDescription??""});window.scrollTo({top:0,behavior:"smooth"});}
  return <div className="admin-legal-workspace">
    <section className="admin-content-panel">
      <div className="admin-section-heading"><h2>{editing?"Edit legal page":"Create legal page"}</h2><span>Publishing is controlled by administrator permissions</span></div>
      <form className="admin-content-form" onSubmit={save}>
        <label>Page title<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
        <label>URL slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={e=>setForm({...form,slug:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"-")})} placeholder="privacy-policy"/></label>
        <label className="wide">Page content (plain text / Markdown)<textarea required minLength={10} maxLength={50000} rows={18} value={form.content} onChange={e=>setForm({...form,content:e.target.value})}/></label>
        <label>Publishing status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value as Page["status"]})}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></label>
        <label>SEO title<input value={form.seoTitle} onChange={e=>setForm({...form,seoTitle:e.target.value})}/></label>
        <label className="wide">SEO description<textarea rows={2} value={form.seoDescription} onChange={e=>setForm({...form,seoDescription:e.target.value})}/></label>
        <div className="admin-form-actions"><button disabled={busy}>{busy?"Saving…":editing?"Update page":"Create page"}</button>{editing&&<button type="button" className="button-outline" onClick={()=>{setEditing(null);setForm(blank);}}>Cancel edit</button>}</div>
      </form>
      {message&&<p role="status" className="admin-feedback">{message}</p>}
    </section>
    <section className="admin-content-panel">
      <div className="admin-section-heading"><h2>Legal page library</h2><span>{pages.length} pages · version history enabled</span></div>
      <div className="admin-content-list">{pages.map(page=><article key={page.id}><div><strong>{page.title}</strong><p>/legal/{page.slug}</p><small>ID: {page.id} · {page.status} · {page._count?.revisions??0} saved revisions · Updated {new Date(page.updatedAt).toLocaleDateString()}</small></div><a className="admin-text-action" href={`/legal/${page.slug}`} target="_blank" rel="noreferrer">Preview</a><button type="button" onClick={()=>edit(page)}>Edit</button></article>)}</div>
    </section>
  </div>;
}
