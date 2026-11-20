"use client";

import { useEffect, useState } from "react";

type Slide = { imageUrl:string; imageAlt:string; eyebrow:string; title:string; body:string; ctaLabel:string; ctaHref:string };
type Section = { id:string; key:string; sectionType:string; title:string|null; position:number; isActive:boolean; slides:Slide[]|null };
const kinds = [
  ["slideshow","Slideshow"],["image-banner","Image banner"],["rich-text","Rich text"],
  ["image-with-text","Image with text"],["featured-collections","Featured collections"],
  ["product-grid","Product grid"],["testimonial","Testimonials"],["blog-grid","Blog articles"],["spacer","Spacer"],
] as const;
const emptySlide:Slide={imageUrl:"",imageAlt:"",eyebrow:"",title:"",body:"",ctaLabel:"",ctaHref:""};

export function StorefrontThemeBuilder(){
  const [sections,setSections]=useState<Section[]>([]);
  const [kind,setKind]=useState("slideshow");
  const [title,setTitle]=useState("");
  const [slides,setSlides]=useState<Slide[]>([{...emptySlide}]);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("Loading your homepage sections…");
  const [dragId,setDragId]=useState<string|null>(null);
  async function refresh(){
    const response=await fetch("/api/admin/storefront",{cache:"no-store"});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"Unable to load sections");
    setSections(data.sections.map((s:Section)=>({...s,slides:Array.isArray(s.slides)?s.slides:[]})));
    setMessage("");
  }
  useEffect(()=>{void refresh().catch(e=>setMessage(e.message));},[]);
  function updateSlide(index:number,patch:Partial<Slide>){
    setSlides(current=>current.map((slide,i)=>i===index?{...slide,...patch}:slide));
  }
  async function createSection(event:React.FormEvent){
    event.preventDefault();setBusy(true);setMessage("");
    try{
      const key=kind+"-"+crypto.randomUUID().slice(0,12);
      const response=await fetch("/api/admin/storefront",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({resource:"section",data:{key,sectionType:kind,title:title||null,slides:kind==="slideshow"?slides.filter(s=>s.imageUrl):[],position:sections.length*10,isActive:true}})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||"Could not create section");
      await refresh();setTitle("");setSlides([{...emptySlide}]);setMessage("Section added to homepage draft.");
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to save section");}finally{setBusy(false);}
  }
  async function reorder(sourceId:string,targetId:string){
    if(sourceId===targetId)return;
    const next=[...sections];const from=next.findIndex(s=>s.id===sourceId),to=next.findIndex(s=>s.id===targetId);
    if(from<0||to<0)return;const [moved]=next.splice(from,1);next.splice(to,0,moved);
    setSections(next);setBusy(true);
    try{await Promise.all(next.map((section,index)=>fetch("/api/admin/storefront",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({resource:"section",id:section.id,data:{position:(index+1)*10}})}).then(async r=>{if(!r.ok)throw new Error("Could not save section order");})));setMessage("Homepage section order saved.");}
    catch(error){setMessage(error instanceof Error?error.message:"Order update failed");await refresh().catch(()=>{});}finally{setBusy(false);}
  }
  async function toggle(section:Section){
    setBusy(true);
    try{const response=await fetch("/api/admin/storefront",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({resource:"section",id:section.id,data:{isActive:!section.isActive}})});if(!response.ok)throw new Error("Could not update visibility");setSections(old=>old.map(s=>s.id===section.id?{...s,isActive:!s.isActive}:s));}
    catch(e){setMessage(e instanceof Error?e.message:"Visibility update failed");}finally{setBusy(false);}
  }
  return <section className="admin-content-panel storefront-theme-builder">
    <div className="admin-section-heading"><h2>Homepage theme builder</h2><span>Shopify-style sections · drag to reorder</span></div>
    <p>Add as many homepage sections as you need. Each slideshow can contain multiple slides. Changes are saved to the homepage content database.</p>
    <form className="admin-content-form" onSubmit={createSection}>
      <label>Section type<select value={kind} onChange={e=>setKind(e.target.value)}>{kinds.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <label>Section heading<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Optional section heading"/></label>
      {kind==="slideshow"&&<div className="wide storefront-slide-editor">
        <div className="admin-section-heading"><h3>Slides</h3><button type="button" onClick={()=>setSlides(old=>[...old,{...emptySlide}])}>Add slide</button></div>
        {slides.map((slide,index)=><fieldset key={index} className="storefront-slide-card">
          <legend>Slide {index+1}</legend>
          <label>Image URL<input type="url" required value={slide.imageUrl} onChange={e=>updateSlide(index,{imageUrl:e.target.value})} placeholder="https://…"/></label>
          <label>Image alt text<input value={slide.imageAlt} onChange={e=>updateSlide(index,{imageAlt:e.target.value})}/></label>
          <label>Eyebrow<input value={slide.eyebrow} onChange={e=>updateSlide(index,{eyebrow:e.target.value})}/></label>
          <label>Headline<input value={slide.title} onChange={e=>updateSlide(index,{title:e.target.value})}/></label>
          <label className="wide">Description<textarea rows={2} value={slide.body} onChange={e=>updateSlide(index,{body:e.target.value})}/></label>
          <label>Button label<input value={slide.ctaLabel} onChange={e=>updateSlide(index,{ctaLabel:e.target.value})}/></label>
          <label>Button link<input value={slide.ctaHref} onChange={e=>updateSlide(index,{ctaHref:e.target.value})}/></label>
          {slides.length>1&&<button type="button" onClick={()=>setSlides(old=>old.filter((_,i)=>i!==index))}>Remove slide</button>}
        </fieldset>)}
      </div>}
      <button disabled={busy}>{busy?"Saving…":"Add section to homepage"}</button>
    </form>
    <div className="storefront-section-stack" aria-label="Homepage section order">
      {sections.map((section,index)=><article key={section.id} draggable onDragStart={()=>setDragId(section.id)} onDragOver={e=>e.preventDefault()} onDrop={()=>{if(dragId)void reorder(dragId,section.id);setDragId(null);}} className="storefront-section-row">
        <span className="storefront-drag-handle" aria-hidden="true">⠿</span>
        <div><strong>{index+1}. {kinds.find(k=>k[0]===section.sectionType)?.[1]||section.sectionType}</strong><p>{section.title||section.key}</p><small>{section.slides?.length||0} slides · {section.isActive?"Visible":"Hidden"}</small></div>
        <button type="button" disabled={busy} onClick={()=>void toggle(section)}>{section.isActive?"Hide":"Show"}</button>
        <button type="button" disabled={busy||index===0} onClick={()=>void reorder(section.id,sections[index-1].id)}>Move up</button>
        <button type="button" disabled={busy||index===sections.length-1} onClick={()=>void reorder(section.id,sections[index+1].id)}>Move down</button>
      </article>)}
    </div>
    {message&&<p className="admin-feedback" role="status">{message}</p>}
  </section>;
}
