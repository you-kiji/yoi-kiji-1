import Link from "next/link";

export const metadata = { title: "Our story" };

export default function Story() {
  return (
    <main className="page">
      <div className="page-content" style={{ maxWidth: '800px' }}>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span className="separator">/</span>
          <span className="current">Our story</span>
        </nav>

        <header className="page-header">
          <p className="section-eyebrow">THE YOI KIJI POINT OF VIEW</p>
          <h1>Make room for<br/><em>the feeling.</em></h1>
          <p>YOI KIJI brings together home textiles for the everyday rituals that make a space feel like yours. Thoughtful layers for rest, light, gathering and the small moments in between.</p>
        </header>

        <section style={{ marginTop: 'var(--space-3xl)', textAlign: 'center' }}>
          <Link href="/shop" className="btn btn-primary btn-lg">Explore the collections</Link>
        </section>
      </div>
    </main>
  );
}