"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
type Asset = { id:string; secureUrl:string; resourceType:"IMAGE"|"VIDEO"|"RAW"; format:string; bytes:number; width:number|null; height:number|null; originalFilename:string|null; title:string|null; altText:string|null; createdAt:string; folder:{id:string;name:string}|null };
type Folder = { id:string; name:string; _count:{assets:number} };
export function AdminMediaLibrary() {
 const [assets,setAssets]=useState<Asset[]>([]),[folders,setFolders]=useState<Folder[]>([]),[folderId,setFolderId]=useState(""),[query,setQuery]=useState(""),[type,setType]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 const load=useCallback(async()=>{const p=new URLSearchParams();if(folderId)p.set("folderId",folderId);if(query)p.set("q",query);if(type)p.set("type",type);const r=await fetch("/api/admin/media?"+p);const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not load media.");setAssets(d.assets);setFolders(d.folders);},[folderId,query,type]);
 useEffect(()=>{load().catch(e=>setError(e.message));},[load]);
 async function makeFolder(){const name=window.prompt("New folder name");if(!name)return;const r=await fetch("/api/admin/media/folders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name})});const d=await r.json();if(!r.ok){setError(d.error);return;}setFolderId(d.folder.id);await load();}
 async function editAsset(a:Asset){const title=window.prompt("Asset title",a.title||"");if(title===null)return;const altText=window.prompt("Alt text / description",a.altText||"");if(altText===null)return;const r=await fetch("/api/admin/media",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:a.id,title,altText})});const d=await r.json();if(!r.ok){setError(d.error||"Could not update asset.");return;}await load();}
 async function upload(file:File){setBusy(true);setError("");setMessage("");try{
  const resourceType=file.type.startsWith("image/")?"IMAGE":(file.type.startsWith("video/")||file.type.startsWith("audio/"))?"VIDEO":file.type==="application/pdf"?"RAW":null;
  if(!resourceType)throw new Error("Choose an image, video, audio file or PDF.");
  const limit=resourceType==="IMAGE"?25:resourceType==="VIDEO"?200:50;if(file.size>limit*1024*1024)throw new Error("File exceeds the "+limit+" MB limit.");
  const signed=await fetch("/api/admin/media/library-sign",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({resourceType,folderId:folderId||null})});const s=await signed.json();if(!signed.ok)throw new Error(s.error||"Could not prepare upload.");
  const form=new FormData();form.append("file",file);form.append("api_key",s.apiKey);form.append("timestamp",s.timestamp);form.append("folder",s.folder);form.append("public_id",s.publicId);form.append("allowed_formats",s.allowedFormats);form.append("overwrite","false");form.append("signature",s.signature);
  const uploaded=await fetch("https://api.cloudinary.com/v1_1/"+s.cloudName+"/"+s.resourceType+"/upload",{method:"POST",body:form});const cloud=await uploaded.json();if(!uploaded.ok)throw new Error(cloud.error?.message||"Cloudinary upload failed.");
  const saved=await fetch("/api/admin/media",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({publicId:cloud.public_id,secureUrl:cloud.secure_url,signature:cloud.signature,version:cloud.version,resourceType,format:cloud.format,bytes:cloud.bytes,width:cloud.width??null,height:cloud.height??null,duration:cloud.duration??null,originalFilename:file.name,folderId:folderId||null,title:file.name.replace(/\.[^.]+$/,""),altText:"",tags:[]})});const data=await saved.json();if(!saved.ok)throw new Error(data.error||"Asset registration failed.");
  setMessage("Uploaded "+file.name);await load();
 }catch(e){setError(e instanceof Error?e.message:"Upload failed.");}finally{setBusy(false);}}
 const size=(n:number)=>n<1048576?Math.round(n/1024)+" KB":(n/1048576).toFixed(1)+" MB";
 return <section className="admin-control-navigation admin-media-workspace">
  <div className="admin-section-heading"><h2>Asset library</h2><span>{assets.length} assets shown · latest 100</span></div>
  <div className="admin-media-filters">
   <label>Folder<select value={folderId} onChange={e=>setFolderId(e.target.value)}><option value="">All folders</option><option value="root">Unfiled</option>{folders.map(f=><option key={f.id} value={f.id}>{f.name} ({f._count.assets})</option>)}</select></label>
   <label>Type<select value={type} onChange={e=>setType(e.target.value)}><option value="">All types</option><option value="IMAGE">Images</option><option value="VIDEO">Video</option><option value="RAW">Audio / documents</option></select></label>
   <label>Search<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Filename, title or alt text"/></label>
   <button type="button" onClick={makeFolder}>New folder</button>
   <label>{busy?"Uploading…":"Upload asset"}<input type="file" accept="image/*,video/mp4,video/webm,video/quicktime,audio/*,application/pdf" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)upload(f);e.currentTarget.value="";}}/></label>
  </div>
  {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
  <div className="admin-media-grid">
   {assets.map(a=><article className="admin-media-card" key={a.id}>
    <div className="admin-media-preview">
     {a.resourceType==="IMAGE"?<img src={a.secureUrl} alt={a.altText||a.title||"Media asset"}/>:a.resourceType==="VIDEO"&&["mp3","wav","m4a","aac","ogg"].includes(a.format.toLowerCase())?<audio src={a.secureUrl} controls/>:a.resourceType==="VIDEO"?<video src={a.secureUrl} controls preload="metadata"/>:<a href={a.secureUrl} target="_blank" rel="noreferrer">Open {a.format.toUpperCase()}</a>}
    </div>
    <strong className="admin-media-title"><Link href={`/admin/media/${a.id}`}>{a.title||a.originalFilename||"Media asset"}</Link></strong><Link className="admin-product-open-link" href={`/admin/media/${a.id}`}>Open asset details</Link>
    <small>{a.format.toUpperCase()} · {size(a.bytes)}{a.width&&a.height?" · "+a.width+"×"+a.height:""}</small>
    <small className="admin-media-meta">{a.folder?.name||"Unfiled"} · {new Intl.DateTimeFormat("en-IN",{dateStyle:"medium"}).format(new Date(a.createdAt))}</small>
    <div className="admin-media-actions"><button type="button" onClick={()=>editAsset(a)}>Edit metadata</button><button type="button" onClick={()=>navigator.clipboard.writeText(a.secureUrl).then(()=>setMessage("Asset URL copied."))}>Copy asset URL</button></div>
   </article>)}
  </div>
  {assets.length===0&&<p>No media assets found. Upload your first asset to begin the library.</p>}
 </section>;
}
