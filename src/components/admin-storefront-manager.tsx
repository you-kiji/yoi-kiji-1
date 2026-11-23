"use client";
import { useState } from "react";

type Section = { id:string; key:string; sectionType:string; settings?:unknown; slides?:unknown; eyebrow:string|null; title:string|null; body:string|null; imageUrl:string|null; imageAlt:string|null; ctaLabel:string|null; ctaHref:string|null; position:number; isActive:boolean };
type Product = { id:string; name:string; sku:string };
type Collection = { id:string; name:string; slug:string; description:string|null; imageUrl:string|null; sortOrder:number; isActive:boolean; products:{product:{id:string;name:string;sku:string}}[] };

const emptySection = (position:number) => ({key:"",sectionType:"media-only",settingsJson:'{"mediaType":"image"}',slidesJson:"[]",eyebrow:"",title:"",body:"",imageUrl:"",imageAlt:"",ctaLabel:"",ctaHref:"",position,isActive:true});

export function AdminStorefrontManager({ initialSections, initialCollections, products }: { initialSections:Section[]; initialCollections:Collection[]; products:Product[] }) {
  const [sections,setSections]=useState(initialSections),[collections,setCollections]=useState(initialCollections),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[editingSectionId,setEditingSectionId]=useState<string|null>(null),[editingCollectionId,setEditingCollectionId]=useState<string|null>(null);
  const [section,setSection]=useState(emptySection(initialSections.length));
  const [collection,setCollection]=useState({name:"",slug:"",description:"",imageUrl:"",sortOrder:0,productIds:[] as string[]});
  const isMediaOnly=section.sectionType==="media-only";
  const mediaType=(()=>{try{return (JSON.parse(section.settingsJson||"{}") as {mediaType?:string}).mediaType==="video"?"video":"image";}catch{return "image";}})();
  function resetSection(){setEditingSectionId(null);setSection(emptySection(sections.length));}
  async function saveSection(e:React.FormEvent){
    e.preventDefault();setBusy(true);setMessage("");
    try{
      const parsedSettings=JSON.parse(section.settingsJson||"{}");
      const payload={...section,eyebrow:isMediaOnly?null:section.eyebrow,title:isMediaOnly?null:section.title,body:isMediaOnly?null:section.body,ctaLabel:isMediaOnly?null:section.ctaLabel,ctaHref:isMediaOnly?null:section.ctaHref,imageAlt:isMediaOnly?"":section.imageAlt,settings:isMediaOnly?{mediaType:parsedSettings.mediaType==="video"?"video":"image"}:parsedSettings,slides:JSON.parse(section.slidesJson||"[]")};
      const res=await fetch("/api/admin/storefront",{method:editingSectionId?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({resource:"section",...(editingSectionId?{id:editingSectionId}:{}),data:payload})});
      const data=await res.json();if(!res.ok)throw new Error(data.error??"Could not save section");
      setSections(old=>[...old.filter(x=>x.id!==data.section.id&&x.key!==data.section.key),data.section].sort((a,b)=>a.position-b.position));
      resetSection();setMessage("Homepage section saved.");
    }catch(err){setMessage(err instanceof Error?err.message:"Could not save section.");}finally{setBusy(false);}
  }
  async function moveSection(index:number,direction:-1|1){
    const ordered=[...sections].sort((a,b)=>a.position-b.position);const target=index+direction;if(target<0||target>=ordered.length)return;
    [ordered[index],ordered[target]]=[ordered[target],ordered[index]];
    setBusy(true);setMessage("");
    try{
      for(let i=0;i<ordered.length;i++){
        const res=await fetch("/api/admin/storefront",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({resource:"section",id:ordered[i].id,data:{position:i}})});
        if(!res.ok)throw new Error("Could not save section order.");
      }
      setSections(ordered.map((item,i)=>({...item,position:i})));setMessage("Homepage order updated.");
    }catch(err){setMessage(err instanceof Error?err.message:"Could not reorder sections.");}
    finally{setBusy(false);}
  }
  async function saveCollection(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage("");try{const res=await fetch("/api/admin/storefront",{method:editingCollectionId?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({resource:"collection",...(editingCollectionId?{id:editingCollectionId}:{}),data:collection})});const data=await res.json();if(!res.ok)throw new Error(data.error??"Could not save collection");setCollections(old=>[...old.filter(x=>x.id!==data.collection.id),data.collection]);setEditingCollectionId(null);setCollection({name:"",slug:"",description:"",imageUrl:"",sortOrder:0,productIds:[]});setMessage(editingCollectionId?"Collection updated.":"Collection created.");}catch(err){setMessage(err instanceof Error?err.message:"Could not create collection.");}finally{setBusy(false);}}
  async function deactivate(resource:"section"|"collection",id:string){if(!window.confirm("Hide this item from the storefront?"))return;const res=await fetch("/api/admin/storefront?resource="+resource+"&id="+id,{method:"DELETE"});const data=await res.json();if(!res.ok){setMessage(data.error??"Could not update item.");return;}if(resource==="section")setSections(old=>old.map(x=>x.id===id?{...x,isActive:false}:x));else setCollections(old=>old.map(x=>x.id===id?{...x,isActive:false}:x));setMessage("Item hidden from the storefront.");}
  function editSection(item:Section){
    const settings=item.settings&&typeof item.settings==="object"?item.settings as Record<string,unknown>:{};
    setEditingSectionId(item.id);setSection({key:item.key,sectionType:item.sectionType==="hero-video"?"media-only":item.sectionType||"rich-text",settingsJson:JSON.stringify(item.sectionType==="hero-video"?{mediaType:typeof settings.videoUrl==="string"&&settings.videoUrl?"video":"image"}:settings,null,2),slidesJson:JSON.stringify(item.slides??[],null,2),eyebrow:item.eyebrow??"",title:item.title??"",body:item.body??"",imageUrl:item.imageUrl??"",imageAlt:item.imageAlt??"",ctaLabel:item.ctaLabel??"",ctaHref:item.ctaHref??"",position:item.position,isActive:item.isActive});
  }
  return <div className="admin-content-workspace">
    <section className="admin-content-panel"><div className="admin-section-heading"><h2>Homepage sections</h2><span>Unlimited media blocks and content sections</span></div>
      <p>Add image or video blocks anywhere on the homepage. Media-only blocks never render text or buttons. Use the arrows to change their order.</p>
      <form onSubmit={saveSection} className="admin-content-form">
        <label>Section type<select value={section.sectionType} onChange={e=>setSection({...section,sectionType:e.target.value,...(e.target.value==="media-only"?{eyebrow:"",title:"",body:"",ctaLabel:"",ctaHref:""}:{})})}><option value="media-only">Image / video only (no text)</option><option value="product-grid">Product section (2 products)</option><option value="photo-collage">Gallery (8 uniform photos)</option><option value="text-strip">Text Strip</option><option value="testimonial">Customer reviews</option><option value="blog-grid">Journal - three blogs</option><option value="trust-bar">Four trust boxes</option><option value="image-banner">Image banner</option><option value="slideshow">Image slideshow</option></select></label>
        <label>Section key<input required value={section.key} onChange={e=>setSection({...section,key:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"-")})} placeholder="media-section-1"/></label>
        {isMediaOnly?<>
          <label>Media type<select value={mediaType} onChange={e=>setSection({...section,settingsJson:JSON.stringify({mediaType:e.target.value})})}><option value="image">Image</option><option value="video">Video</option></select></label>
          <label className="wide">{mediaType==="video"?"Video URL (MP4, WebM or OGG)":"Image URL"}<input required type="url" value={section.imageUrl} onChange={e=>setSection({...section,imageUrl:e.target.value})} placeholder="https://…"/></label>
          <p className="wide">This block displays only the selected media, full width. No text, overlay, caption or CTA.</p>
        </>:<>
          <label>Eyebrow<input value={section.eyebrow} onChange={e=>setSection({...section,eyebrow:e.target.value})}/></label>
          <label className="wide">Section title{["product-grid","photo-collage","text-strip"].includes(section.sectionType)?" (required)":""}<input required={["product-grid","photo-collage","text-strip"].includes(section.sectionType)} value={section.title} onChange={e=>setSection({...section,title:e.target.value})} placeholder={section.sectionType==="text-strip"?"Feel the Warmth of Home":section.sectionType==="photo-collage"?"Gallery":section.sectionType==="product-grid"?"Shop the Collection":"Enter section title"}/></label>
          <label className="wide">Story / description<textarea rows={3} value={section.body} onChange={e=>setSection({...section,body:e.target.value})}/></label>
          <label className="wide">Image / video poster URL<input type="url" value={section.imageUrl} onChange={e=>setSection({...section,imageUrl:e.target.value})} placeholder="https://…"/></label>
          <label className="wide">Section settings JSON<textarea rows={3} value={section.settingsJson} onChange={e=>setSection({...section,settingsJson:e.target.value})}/></label>
          {section.sectionType==="product-grid"&&<p className="wide admin-helper">Each product section always shows exactly 2 products. Set offset to 0 for the first pair and 2 for the second pair (example: {"{\"offset\":2}"}).</p>}
          {section.sectionType==="photo-collage"&&<p className="wide admin-helper">Add up to 8 image slides below. All gallery tiles use one consistent size and ratio on desktop and mobile.</p>}
          {section.sectionType==="text-strip"&&<p className="wide admin-helper">The section title is the editable Text Strip message shown on the homepage.</p>}
          <label className="wide">Slides JSON<textarea rows={7} value={section.slidesJson} onChange={e=>setSection({...section,slidesJson:e.target.value})}/></label>
          <label>Image description<input value={section.imageAlt} onChange={e=>setSection({...section,imageAlt:e.target.value})}/></label>
          <label>Button label<input value={section.ctaLabel} onChange={e=>setSection({...section,ctaLabel:e.target.value})}/></label>
          <label>Button destination<input value={section.ctaHref} onChange={e=>setSection({...section,ctaHref:e.target.value})}/></label>
        </>}
        <label>Display order<input type="number" min="0" value={section.position} onChange={e=>setSection({...section,position:Number(e.target.value)})}/></label>
        <label className="admin-checkbox-field"><input type="checkbox" checked={section.isActive} onChange={e=>setSection({...section,isActive:e.target.checked})}/> Visible on homepage</label>
        <button disabled={busy}>{busy?"Saving…":editingSectionId?"Update section":"Add section"}</button>
        {editingSectionId&&<button type="button" disabled={busy} onClick={resetSection}>Cancel edit</button>}
      </form>
      <div className="admin-content-list">{[...sections].sort((a,b)=>a.position-b.position).map((item,index)=><article key={item.id}><div><strong>{item.title||item.key}</strong><p>{item.sectionType==="media-only"?"Image / video · No text":item.sectionType==="text-strip"?"Text Strip":item.sectionType==="photo-collage"?"Gallery · 8-photo grid":item.sectionType==="product-grid"?"Product section · 2 products":item.body||item.sectionType}</p><small>{item.isActive?"Visible on storefront":"Hidden"} · Position {item.position}</small></div><button type="button" disabled={busy||index===0} onClick={()=>moveSection(index,-1)} aria-label="Move section up">↑</button><button type="button" disabled={busy||index===sections.length-1} onClick={()=>moveSection(index,1)} aria-label="Move section down">↓</button><button type="button" onClick={()=>editSection(item)}>Edit</button>{item.isActive&&<button type="button" onClick={()=>deactivate("section",item.id)}>Hide</button>}</article>)}</div>
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
