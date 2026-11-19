"use client";

import { FormEvent, useEffect, useState } from "react";

type CategoryOption = { id: string; name: string; slug: string; parentId: string | null; isActive: boolean };
type DynamicAttribute = { id: string; isRequired: boolean; isFilterable: boolean; attribute: { id: string; name: string; key: string; type: string; unit: string | null; options: unknown; isVariantAxis: boolean } };
type ProductTypeOption = { id: string; name: string; slug: string; attributes: DynamicAttribute[] };
const emptyForm = { name:"", slug:"", description:"", sku:"", hsnCode:"", material:"", color:"", careInstructions:"", weightGrams:"", lengthMm:"", widthMm:"", heightMm:"", gstRate:"0", price:"", stock:"", categoryId:"", productTypeId:"", imageUrl:"", imageAlt:"" };

export function AdminProductForm() {
  const [categories,setCategories]=useState<CategoryOption[]>([]);
  const [productTypes,setProductTypes]=useState<ProductTypeOption[]>([]);
  const [open,setOpen]=useState(false);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [form,setForm]=useState(emptyForm);
  const [attributeValues,setAttributeValues]=useState<Record<string,string|boolean|string[]>>({});
  useEffect(()=>{
    Promise.all([
      fetch("/api/admin/categories",{cache:"no-store"}).then(r=>r.ok?r.json():null),
      fetch("/api/admin/product-types",{cache:"no-store"}).then(r=>r.ok?r.json():null),
    ]).then(([categoryData,typeData])=>{
      if(categoryData?.categories)setCategories(categoryData.categories.filter((c:CategoryOption)=>c.isActive));
      if(typeData?.productTypes)setProductTypes(typeData.productTypes);
    }).catch(()=>setMessage("Some catalogue configuration could not be loaded."));
  },[]);
  const selectedType=productTypes.find(type=>type.id===form.productTypeId);
  function set<K extends keyof typeof emptyForm>(key:K,value:(typeof emptyForm)[K]){setForm(old=>({...old,[key]:value}));}
  function setAttribute(id:string,value:string|boolean|string[]){setAttributeValues(old=>({...old,[id]:value}));}
  async function submit(event:FormEvent){
    event.preventDefault();setBusy(true);setMessage("");
    try{
      const attributes:Record<string,unknown>={};
      for(const link of selectedType?.attributes.filter(link=>!link.attribute.isVariantAxis)??[]){
        const raw=attributeValues[link.attribute.id];
        if(raw===undefined||raw===""||(Array.isArray(raw)&&raw.length===0)){if(link.isRequired)throw new Error(`${link.attribute.name} is required for this product type.`);continue;}
        attributes[link.attribute.id]=link.attribute.type==="NUMBER"?Number(raw):raw;
      }
      const payload={name:form.name,slug:form.slug,description:form.description,sku:form.sku,hsnCode:form.hsnCode||undefined,material:form.material||undefined,color:form.color||undefined,careInstructions:form.careInstructions||undefined,weightGrams:form.weightGrams?Number(form.weightGrams):undefined,lengthMm:form.lengthMm?Number(form.lengthMm):undefined,widthMm:form.widthMm?Number(form.widthMm):undefined,heightMm:form.heightMm?Number(form.heightMm):undefined,gstRateBps:Math.round(Number(form.gstRate)*100),pricePaise:Math.round(Number(form.price)*100),inventoryQty:Number(form.stock),categoryId:form.categoryId,productTypeId:form.productTypeId||undefined,attributes,isActive:false,hasVariants:false,...(form.imageUrl?{imageUrl:form.imageUrl,imageAlt:form.imageAlt||form.name}:{})};
      const response=await fetch("/api/admin/products",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const data=await response.json();if(!response.ok)throw new Error(data.error??"Could not create product.");
      setMessage("Draft product created with its type-specific specifications. Refresh to see it.");setForm(emptyForm);setAttributeValues({});
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to create product.");}
    finally{setBusy(false);}
  }
  function renderAttribute(link:DynamicAttribute){
    const attr=link.attribute;const current=attributeValues[attr.id];
    const label=`${attr.name}${attr.unit? ` (${attr.unit})`:""}${link.isRequired?" *":""}`;
    const options=Array.isArray(attr.options)?attr.options.filter((x):x is string=>typeof x==="string"):[];
    if(attr.type==="BOOLEAN")return <label key={attr.id} className="admin-dynamic-attribute"><span><input type="checkbox" checked={current===true} onChange={e=>setAttribute(attr.id,e.target.checked)}/> {label}</span></label>;
    if(attr.type==="SELECT")return <label key={attr.id}>{label}<select required={link.isRequired} value={typeof current==="string"?current:""} onChange={e=>setAttribute(attr.id,e.target.value)}><option value="">Choose…</option>{options.map(option=><option key={option}>{option}</option>)}</select></label>;
    if(attr.type==="MULTI_SELECT")return <label key={attr.id}>{label}<select required={link.isRequired} multiple value={Array.isArray(current)?current:[]} onChange={e=>setAttribute(attr.id,Array.from(e.target.selectedOptions).map(o=>o.value))}>{options.map(option=><option key={option}>{option}</option>)}</select></label>;
    return <label key={attr.id}>{label}<input required={link.isRequired} type={attr.type==="NUMBER"?"number":attr.type==="DATE"?"date":"text"} value={typeof current==="string"||typeof current==="number"?String(current):""} onChange={e=>setAttribute(attr.id,e.target.value)} /></label>;
  }
  return (
    <section className="admin-create admin-product-create">
      <div className="admin-create-heading">
        <div>
          <p className="eyebrow">CATALOGUE WORKSPACE</p>
          <h2>Create a product</h2>
          <p>Build a complete product record. New products are saved as drafts until you publish them.</p>
        </div>
        <button className="primary-link" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? "Close product form" : "Add a product"}
          <span aria-hidden="true">{open ? "−" : "+"}</span>
        </button>
      </div>

      {open && (
        <form className="admin-product-form admin-product-create-form" onSubmit={submit}>
          <fieldset className="admin-form-section admin-form-wide">
            <legend>01 · Product identity</legend>
            <p className="admin-form-section-copy">Give the product a clear name and a stable catalogue reference.</p>
            <div className="admin-form-grid">
              <label>
                Product name
                <input required minLength={2} maxLength={160} value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="e.g. Washed cotton bedsheet" />
              </label>
              <label>
                URL slug
                <input required pattern="[a-z0-9-]+" value={form.slug} onChange={(event) => set("slug", event.target.value)} placeholder="washed-cotton-bedsheet" />
              </label>
              <label>
                SKU
                <input required maxLength={80} value={form.sku} onChange={(event) => set("sku", event.target.value)} placeholder="YK-BED-001" />
              </label>
            </div>
          </fieldset>

          <fieldset className="admin-form-section admin-form-wide">
            <legend>02 · Classification</legend>
            <p className="admin-form-section-copy">Connect the product to the catalogue structure and product-specific attribute set.</p>
            <div className="admin-form-grid">
              <label>
                Product type
                <select value={form.productTypeId} onChange={(event) => {
                  const id = event.target.value;
                  set("productTypeId", id);
                  const type = productTypes.find((item) => item.id === id);
                  setAttributeValues(Object.fromEntries((type?.attributes ?? []).filter((link) => link.attribute.type === "BOOLEAN").map((link) => [link.attribute.id, false])));
                }}>
                  <option value="">Choose product type…</option>
                  {productTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                </select>
              </label>
              <label>
                Category
                <select required value={form.categoryId} onChange={(event) => set("categoryId", event.target.value)}>
                  <option value="">Choose category</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name} · /{category.slug}</option>)}
                </select>
              </label>
              <label>
                HSN code
                <input maxLength={20} value={form.hsnCode} onChange={(event) => set("hsnCode", event.target.value)} placeholder="HSN classification" />
              </label>
            </div>
          </fieldset>

          <fieldset className="admin-form-section admin-form-wide">
            <legend>03 · Pricing and inventory</legend>
            <p className="admin-form-section-copy">Set the base selling price, applicable GST rate and opening stock quantity.</p>
            <div className="admin-form-grid">
              <label>
                Price (INR)
                <input required type="number" min="1" step=".01" inputMode="decimal" value={form.price} onChange={(event) => set("price", event.target.value)} placeholder="0.00" />
              </label>
              <label>
                GST rate (%)
                <input required type="number" min="0" max="100" step=".01" inputMode="decimal" value={form.gstRate} onChange={(event) => set("gstRate", event.target.value)} />
              </label>
              <label>
                Opening stock
                <input required type="number" min="0" step="1" inputMode="numeric" value={form.stock} onChange={(event) => set("stock", event.target.value)} placeholder="0" />
              </label>
            </div>
          </fieldset>

          <fieldset className="admin-form-section admin-form-wide">
            <legend>04 · Materials and dimensions</legend>
            <p className="admin-form-section-copy">Add useful product information for shoppers and fulfilment teams.</p>
            <div className="admin-form-grid">
              <label>
                Material
                <input maxLength={120} value={form.material} onChange={(event) => set("material", event.target.value)} placeholder="e.g. 100% cotton" />
              </label>
              <label>
                Colour
                <input maxLength={80} value={form.color} onChange={(event) => set("color", event.target.value)} placeholder="e.g. Sage green" />
              </label>
              <label>
                Weight (grams)
                <input type="number" min="1" step="1" inputMode="numeric" value={form.weightGrams} onChange={(event) => set("weightGrams", event.target.value)} />
              </label>
              <label>
                Length (mm)
                <input type="number" min="1" step="1" inputMode="numeric" value={form.lengthMm} onChange={(event) => set("lengthMm", event.target.value)} />
              </label>
              <label>
                Width (mm)
                <input type="number" min="1" step="1" inputMode="numeric" value={form.widthMm} onChange={(event) => set("widthMm", event.target.value)} />
              </label>
              <label>
                Height (mm)
                <input type="number" min="1" step="1" inputMode="numeric" value={form.heightMm} onChange={(event) => set("heightMm", event.target.value)} />
              </label>
            </div>
          </fieldset>

          {selectedType && selectedType.attributes.length > 0 && (
            <fieldset className="admin-form-section admin-form-wide admin-dynamic-fields">
              <legend>05 · {selectedType.name} specifications</legend>
              <p className="admin-form-section-copy">These fields are generated from the selected product type. Required attributes are marked.</p>
              <div className="admin-form-grid">
                {selectedType.attributes.filter((link) => !link.attribute.isVariantAxis).map(renderAttribute)}
              </div>
            </fieldset>
          )}

          <fieldset className="admin-form-section admin-form-wide">
            <legend>06 · Product story and care</legend>
            <p className="admin-form-section-copy">Write clear product information that helps customers understand the piece.</p>
            <div className="admin-form-grid">
              <label className="admin-field-span-all">
                Product description
                <textarea required minLength={10} maxLength={10000} rows={6} value={form.description} onChange={(event) => set("description", event.target.value)} placeholder="Describe the fabric, feel, finish and everyday use…" />
              </label>
              <label className="admin-field-span-all">
                Care instructions
                <textarea maxLength={3000} rows={3} value={form.careInstructions} onChange={(event) => set("careInstructions", event.target.value)} placeholder="Share washing and care guidance…" />
              </label>
            </div>
          </fieldset>

          <fieldset className="admin-form-section admin-form-wide">
            <legend>07 · Product image</legend>
            <p className="admin-form-section-copy">An image URL can be added now. Additional media can be managed from the product media tools after saving.</p>
            <div className="admin-form-grid">
              <label className="admin-field-span-all">
                Image URL <em>Optional</em>
                <input type="url" value={form.imageUrl} onChange={(event) => set("imageUrl", event.target.value)} placeholder="https://…" />
              </label>
              <label className="admin-field-span-all">
                Image alt text <em>Optional</em>
                <input maxLength={300} value={form.imageAlt} onChange={(event) => set("imageAlt", event.target.value)} placeholder="Describe the product image for accessibility" />
              </label>
            </div>
          </fieldset>

          {message && <p className="admin-form-wide" role="status">{message}</p>}

          <div className="admin-form-footer admin-form-wide">
            <p>Product visibility remains set to draft after saving.</p>
            <button className="primary-link" type="submit" disabled={busy}>
              {busy ? "Saving product…" : "Save product as draft"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
