import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminMediaAssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.role !== "ADMIN") redirect("/admin");
  const { id } = await params;
  const asset = await prisma.mediaAsset.findUnique({
    where: { id },
    include: { folder: true, uploader: { select: { name: true, email: true } } },
  });
  if (!asset) notFound();
  const size = asset.bytes < 1048576 ? Math.round(asset.bytes / 1024) + " KB" : (asset.bytes / 1048576).toFixed(1) + " MB";
  return (
    <main className="commerce-page admin-media-detail">
      <div className="commerce-breadcrumb"><Link href="/admin">Admin</Link><span>/</span><Link href="/admin/media">Media library</Link><span>/</span>{asset.title || asset.originalFilename || "Asset"}</div>
      <header className="admin-detail-header"><div><p className="eyebrow">CREATIVE ASSETS / MEDIA RECORD</p><h1>{asset.title || asset.originalFilename || "Media asset"}</h1><p>{asset.resourceType} · {asset.format.toUpperCase()} · Uploaded {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(asset.createdAt)}</p></div><div className="admin-detail-header-actions"><Link className="primary-link" href="/admin/media">Back to media library</Link></div></header>
      <section className="admin-detail-metrics"><article><span>File size</span><strong>{size}</strong><small>Original Cloudinary asset</small></article><article><span>Resource type</span><strong>{asset.resourceType}</strong><small>{asset.format.toUpperCase()}</small></article><article><span>Dimensions</span><strong>{asset.width && asset.height ? asset.width + " × " + asset.height : "—"}</strong><small>{asset.durationSeconds ? asset.durationSeconds.toFixed(1) + " seconds" : "No duration metadata"}</small></article><article><span>Folder</span><strong>{asset.folder?.name || "Unfiled"}</strong><small>Asset organisation</small></article></section>
      <div className="admin-media-detail-grid"><section className="admin-detail-card"><div className="admin-detail-card-heading"><div><p className="eyebrow">ASSET PREVIEW</p><h2>Original media</h2></div><a href={asset.secureUrl} target="_blank" rel="noreferrer">Open original file</a></div><div className="admin-media-detail-preview">{asset.resourceType === "IMAGE" ? <img src={asset.secureUrl} alt={asset.altText || asset.title || "Media asset"}/> : asset.resourceType === "VIDEO" && ["mp3","wav","m4a","aac","ogg"].includes(asset.format.toLowerCase()) ? <audio src={asset.secureUrl} controls/> : asset.resourceType === "VIDEO" ? <video src={asset.secureUrl} controls preload="metadata"/> : <a href={asset.secureUrl} target="_blank" rel="noreferrer">Open {asset.format.toUpperCase()} document</a>}</div></section>
        <aside className="admin-product-detail-aside"><section className="admin-detail-card"><div className="admin-detail-card-heading"><div><p className="eyebrow">ASSET METADATA</p><h2>File information</h2></div></div><dl className="admin-detail-definition admin-detail-definition--stacked"><div><dt>Title</dt><dd>{asset.title || "Not set"}</dd></div><div><dt>Alt text</dt><dd>{asset.altText || "Not set"}</dd></div><div><dt>Original filename</dt><dd>{asset.originalFilename || "Unknown"}</dd></div><div><dt>Public ID</dt><dd>{asset.publicId}</dd></div><div><dt>Uploaded by</dt><dd>{asset.uploader?.name || asset.uploader?.email || "Unknown"}</dd></div><div><dt>Tags</dt><dd>{asset.tags.join(", ") || "No tags"}</dd></div><div><dt>Last updated</dt><dd>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(asset.updatedAt)}</dd></div></dl><a className="admin-product-open-link" href={asset.secureUrl} target="_blank" rel="noreferrer">Open original media</a></section><section className="admin-detail-card"><div className="admin-detail-card-heading"><div><p className="eyebrow">ASSET URL</p><h2>Reusable source</h2></div></div><p className="admin-detail-description admin-media-url">{asset.secureUrl}</p></section></aside>
      </div>
    </main>
  );
}
