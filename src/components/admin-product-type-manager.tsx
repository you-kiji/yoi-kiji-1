"use client";
import Link from "next/link";

import { FormEvent, useEffect, useState } from "react";

type AttributeDraft = { name: string; key: string; type: "TEXT"|"NUMBER"|"BOOLEAN"|"SELECT"|"MULTI_SELECT"|"DATE"; unit: string; options: string; required: boolean; filterable: boolean; variantAxis: boolean };
type ProductTypeRecord = { id: string; name: string; slug: string; description: string | null; attributes: { id: string; isRequired: boolean; isFilterable: boolean; attribute: { name: string; key: string; type: string; unit: string | null; isVariantAxis: boolean } }[]; _count: { products: number } };
const blankAttribute: AttributeDraft = { name: "", key: "", type: "TEXT", unit: "", options: "", required: false, filterable: false, variantAxis: false };

export function AdminProductTypeManager() {
  const [types,setTypes]=useState<ProductTypeRecord[]>([]);
  const [name,setName]=useState(""); const [slug,setSlug]=useState(""); const [description,setDescription]=useState("");
  const [attributes,setAttributes]=useState<AttributeDraft[]>([{...blankAttribute}]);
  const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
  async function load(){const r=await fetch("/api/admin/product-types",{cache:"no-store"});const d=await r.json();if(r.ok)setTypes(d.productTypes??[]);else setMessage(d.error??"Could not load product types.");}
  useEffect(()=>{void load().catch(()=>setMessage("Could not load product types."));},[]);
  function update<K extends keyof AttributeDraft>(index:number,key:K,value:AttributeDraft[K]){setAttributes(old=>old.map((item,i)=>i===index?{...item,[key]:value}:item));}
  async function submit(e:FormEvent){e.preventDefault();setBusy(true);setMessage("");try{const r=await fetch("/api/admin/product-types",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,slug,description:description||undefined,attributes:attributes.filter(a=>a.name.trim()&&a.key.trim()).map(a=>({...a,options:a.options.split(",").map(x=>x.trim()).filter(Boolean)}))})});const d=await r.json();if(!r.ok)throw new Error(d.error??"Could not save product type.");setName("");setSlug("");setDescription("");setAttributes([{...blankAttribute}]);setMessage("Product type and attribute blueprint created.");await load();}catch(e){setMessage(e instanceof Error?e.message:"Unable to save product type.");}finally{setBusy(false);}}
  return <section className="admin-create admin-product-type-manager">
    <div className="admin-section-heading"><div><p className="eyebrow">PRODUCT DATA ARCHITECTURE</p><h2>Product types & attributes</h2><p>Define reusable field blueprints. Each product family gets only the specifications that apply.</p></div></div>
    <form className="admin-product-form" onSubmit={submit}>
      <label>Product type name<input required minLength={2} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Bedsheet" /></label>
      <label>URL slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={slug} onChange={e=>setSlug(e.target.value)} placeholder="bedsheet" /></label>
      <label className="admin-form-wide">Description<textarea value={description} onChange={e=>setDescription(e.target.value)} /></label>
      <div className="admin-form-wide"><p className="eyebrow">ATTRIBUTE BLUEPRINT</p></div>
      {attributes.map((a,index)=><div className="attribute-builder-row admin-form-wide" key={index}>
        <label>Field name<input required value={a.name} onChange={e=>update(index,"name",e.target.value)} placeholder="Fabric composition" /></label>
        <label>Key<input required pattern="[a-z][a-z0-9_]*" value={a.key} onChange={e=>update(index,"key",e.target.value)} placeholder="fabric_composition" /></label>
        <label>Input type<select value={a.type} onChange={e=>update(index,"type",e.target.value as AttributeDraft["type"])}>{["TEXT","NUMBER","BOOLEAN","SELECT","MULTI_SELECT","DATE"].map(t=><option key={t}>{t}</option>)}</select></label>
        <label>Unit<input value={a.unit} onChange={e=>update(index,"unit",e.target.value)} placeholder="e.g. GSM, cm" /></label>
        {(a.type==="SELECT"||a.type==="MULTI_SELECT")&&<label className="admin-form-wide">Options (comma separated)<input value={a.options} onChange={e=>update(index,"options",e.target.value)} placeholder="Cotton, Linen, Polyester" /></label>}
        <div className="attribute-flags"><label><input type="checkbox" checked={a.required} onChange={e=>update(index,"required",e.target.checked)} /> Required</label><label><input type="checkbox" checked={a.filterable} onChange={e=>update(index,"filterable",e.target.checked)} /> Storefront filter</label><label><input type="checkbox" checked={a.variantAxis} onChange={e=>update(index,"variantAxis",e.target.checked)} /> Variant option</label><button type="button" onClick={()=>setAttributes(old=>old.filter((_,i)=>i!==index))} disabled={attributes.length===1}>Remove field</button></div>
      </div>)}
      <div className="admin-form-wide" style={{display:"flex",gap:12,flexWrap:"wrap"}}><button type="button" className="text-link" onClick={()=>setAttributes(old=>[...old,{...blankAttribute}])}>Add another attribute +</button><button className="primary-link" disabled={busy}>{busy?"Saving…":"Create product type"} <span>↗</span></button></div>
      {message&&<p className="admin-form-wide" role="status">{message}</p>}
    </form>
    <div className="product-type-list">{types.map(type=><article key={type.id}><div><h3><Link href={`/admin/product-types/${type.id}`}>{type.name}</Link></h3><Link className="admin-product-open-link" href={`/admin/product-types/${type.id}`}>Open type details</Link><p>/{type.slug} · {type._count.products} product(s)</p></div><div className="product-type-attributes">{type.attributes.map(link=><span key={link.id}>{link.attribute.name}{link.isRequired?" · required":""}{link.isFilterable?" · filter":""}{link.attribute.isVariantAxis?" · variant":""}</span>)}</div></article>)}</div>
  </section>;
}
