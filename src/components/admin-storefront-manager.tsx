"use client";
import { useState } from "react";

type Section = { id:string; key:string; eyebrow:string|null; title:string|null; body:string|null; imageUrl:string|null; imageAlt:string|null; ctaLabel:string|null; ctaHref:string|null; position:number; isActive:boolean };
type Product = { id:string; name:string; sku:string };
type Collection = { id:string; name:string; slug:string; description:string|null; imageUrl:string|null; sortOrder:number; isActive:boolean; products:{product:{id:string;name:string;sku:string}}[] };

export function AdminStorefrontManager({ initialSections, initialCollections, products }: { initialSections:Section[]; initialCollections:Collection[]; products:Product[] }) {
  const [sections,setSections]=useState(initialSections),[collections,setCollections]=useState(initialCollections),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[editingSectionId,setEditingSectionId]=useState<string|null>(null),[editingCollectionId,setEditingCollectionId]=useState<string|null>(null);
  const [section,setSection]=useState({key:"hero",eyebrow:"A QUIETER KIND OF LUXURY",title:"Make room for feeling.",body:"Thoughtful textiles. Natural textures. A softer way to come home.",imageUrl:"",imageAlt:"",ctaLabel:"Explore the collection",ctaHref:"/shop",position:0,isActive:true});
  const [collection,setCollection]=useState({name:"",slug:"",description:"",imageUrl:"",sortOrder:0,productIds:[] as string[]});
  async function saveSection(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage("");try{const res=await fetch("/api/admin/storefront",{method:editingSectionId?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({resource:"section",...(editingSectionId?{id:editingSectionId}:{}),data:section})});const data=await res.json();if(!res.ok)throw new Error(data.error??"Could not save section");setSections(old=>[...old.filter(x=>x.id!==data.section.id&&x.key!==data.section.key),data.section].sort((a,b)=>a.position-b.position));setEditingSectionId(null);setMessage("Homepage section saved.");}catch(err){setMessage(err instanceof Error?err.message:"Could not save section.");}finally{setBusy(false);}}
  async function saveCollection(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage("");try{const res=await fetch("/api/admin/storefront",{method:editingCollectionId?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({resource:"collection",...(editingCollectionId?{id:editingCollectionId}:{}),data:collection})});const data=await res.json();if(!res.ok)throw new Error(data.error??"Could not save collection");setCollections(old=>[...old.filter(x=>x.id!==data.collection.id),data.collection]);setEditingCollectionId(null);setCollection({name:"",slug:"",description:"",imageUrl:"",sortOrder:0,productIds:[]});setMessage(editingCollectionId?"Collection updated.":"Collection created.");}catch(err){setMessage(err instanceof Error?err.message:"Could not create collection.");}finally{setBusy(false);}}
  async function deactivate(resource:"section"|"collection",id:string){if(!window.confirm("Hide this item from the storefront?"))return;const res=await fetch("/api/admin/storefront?resource="+resource+"&id="+id,{method:"DELETE"});const data=await res.json();if(!res.ok){setMessage(data.error??"Could not update item.");return;}if(resource==="section")setSections(old=>old.map(x=>x.id===id?{...x,isActive:false}:x));else setCollections(old=>old.map(x=>x.id===id?{...x,isActive:false}:x));setMessage("Item hidden from the storefront.");}
  return <div className="admin-content-workspace">
    <section className="admin-content-panel"><div className="admin-section-heading"><h2>Homepage storytelling</h2><span>Hero, brand story and campaign sections</span></div>
      <p>Set the text, photography and calls to action that appear on the storefront. Section keys are stable identifiers: hero, intro, feature, manifesto and journal.</p>
      <form onSubmit={saveSection} className="admin-content-form">
        <label>Section key<input required value={section.key} onChange={e=>setSection({...section,key:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"-")})} placeholder="hero"/></label>
        <label>Eyebrow<input value={section.eyebrow} onChange={e=>setSection({...section,eyebrow:e.target.value})}/></label>
        <label className="wide">Headline<input value={section.title} onChange={e=>setSection({...section,title:e.target.value})}/></label>
        <label className="wide">Story / description<textarea rows={3} value={section.body} onChange={e=>setSection({...section,body:e.target.value})}/></label>
        <label className="wide">Background image URL<input type="url" value={section.imageUrl} onChange={e=>setSection({...section,imageUrl:e.target.value})} placeholder="https://…"/></label>
        <label>Image description<input value={section.imageAlt} onChange={e=>setSection({...section,imageAlt:e.target.value})}/></label>
        <label>Button label<input value={section.ctaLabel} onChange={e=>setSection({...section,ctaLabel:e.target.value})}/></label>
        <label>Button destination<input value={section.ctaHref} onChange={e=>setSection({...section,ctaHref:e.target.value})}/></label>
        <label>Display order<input type="number" min="0" value={section.position} onChange={e=>setSection({...section,position:Number(e.target.value)})}/></label>
        <label className="admin-checkbox-field"><input type="checkbox" checked={section.isActive} onChange={e=>setSection({...section,isActive:e.target.checked})}/> Visible on homepage</label>
        <button disabled={busy}>{busy?"Saving…":editingSectionId?"Update homepage section":"Create homepage section"}</button>
      </form>
      <div className="admin-content-list">{sections.map(item=><article key={item.id}><div><strong>{item.key}</strong><p>{item.title||item.body||"No copy yet"}</p><small>ID: {item.id} · {item.isActive?"Visible on storefront":"Hidden"} · Position {item.position}</small></div><button type="button" onClick={()=>{setEditingSectionId(item.id);setSection({key:item.key,eyebrow:item.eyebrow??"",title:item.title??"",body:item.body??"",imageUrl:item.imageUrl??"",imageAlt:item.imageAlt??"",ctaLabel:item.ctaLabel??"",ctaHref:item.ctaHref??"",position:item.position,isActive:item.isActive});}}>Load to editor</button>{item.isActive&&<button type="button" onClick={()=>deactivate("section",item.id)}>Hide</button>}</article>)}</div>
    </section>
    <section className="admin-content-panel"><div className="admin-section-heading"><h2>Curated collections</h2><span>Merchandising and product groupings</span></div>
      <form onSubmit={saveCollection} className="admin-content-form">
        <label>Collection name<input required value={collection.name} onChange={e=>setCollection({...collection,name:e.target.value})}/></label>
        <label>URL slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={collection.slug} onChange={e=>setCollection({...collection,slug:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"-")})}/></label>
        <label className="wide">Description<textarea rows={2} value={collection.description} onChange={e=>setCollection({...collection,description:e.target.value})}/></label>
        <label className="wide">Collection image URL<input type="url" value={collection.imageUrl} onChange={e=>setCollection({...collection,imageUrl:e.target.value})}/></label>
        <label>Display order<input type="number" min="0" value={collection.sortOrder} onChange={e=>setCollection({...collection,sortOrder:Number(e.target.value)})}/></label>
        <label className="wide">Products (Ctrl/Cmd to select multiple)<select multiple size={6} value={collection.productIds} onChange={e=>setCollection({...collection,productIds:Array.from(e.target.selectedOptions,o=>o.value)})}>{products.map(p=><option key={p.id} value={p.id}>{p.name} · {p.sku}</option>)}</select></label>
        <button disabled={busy}>{busy?"Saving…":editingCollectionId?"Update collection":"Create collection"}</button>
      </form>
      <div className="admin-content-list">{collections.map(item=><article key={item.id}><div><strong>{item.name}</strong><p>{item.slug} · {item.products.length} products</p><small>{item.isActive?"Published":"Hidden"} · Position {item.sortOrder}</small></div><button type="button" onClick={()=>{setEditingCollectionId(item.id);setCollection({name:item.name,slug:item.slug,description:item.description??"",imageUrl:item.imageUrl??"",sortOrder:item.sortOrder,productIds:item.products.map(link=>link.product.id)});}}>Edit</button>{item.isActive&&<button type="button" onClick={()=>deactivate("collection",item.id)}>Hide collection</button>}</article>)}</div>
    </section>
    {message&&<p role="status" className="admin-feedback">{message}</p>}
  </div>;
}
