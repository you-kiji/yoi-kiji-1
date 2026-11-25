import Link from "next/link";
import { getLocaleData } from "@/lib/i18n";

export default async function NotFound() {
  const locale = await getLocaleData();
  const t = (key: string, fallback: string) => locale.labels[key] ?? fallback;

  return (
    <main className="page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="text-center" style={{ maxWidth: '400px', padding: 'var(--space-xl)' }}>
        <p className="section-eyebrow">YOI KIJI / 404</p>
        <h1>Not quite<br /><em>where you meant to be.</em></h1>
        <p style={{ color: 'var(--color-moss)', marginTop: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>The page may have moved, or the collection is not available.</p>
        <Link href="/" className="btn btn-primary btn-lg">Return home <span aria-hidden="true">↗</span></Link>
      </div>
    </main>
  );
}