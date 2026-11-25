import Link from "next/link";
import { ContactForm } from "@/components/contact-form";

export const metadata = { title: "Contact Us" };

export default function Contact() {
  return (
    <main className="page">
      <div className="page-content" style={{ maxWidth: '800px' }}>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span className="separator">/</span>
          <span className="current">Contact Us</span>
        </nav>

        <header className="page-header" style={{ marginBottom: 'var(--space-3xl)' }}>
          <p className="section-eyebrow">A CONVERSATION STARTS HERE</p>
          <h1>We&apos;re here to<br /><em>listen.</em></h1>
          <p>Questions about our collections, an order, or choosing the right textile for your space? Send us a note and the YOI KIJI team will be in touch.</p>
          <Link href="/account/orders" className="btn btn-secondary mt-lg" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            Looking for an order update? View your orders
            <span aria-hidden="true">↗</span>
          </Link>
        </header>

        <section aria-labelledby="contact-form-title" style={{ maxWidth: '560px' }}>
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <p className="section-eyebrow">GET IN TOUCH</p>
            <h2 id="contact-form-title" style={{ marginBottom: 'var(--space-sm)' }}>Send us a message</h2>
            <p style={{ color: 'var(--color-moss)' }}>Share a few details below and we&apos;ll get back to you.</p>
          </div>
          <ContactForm />
        </section>
      </div>
    </main>
  );
}