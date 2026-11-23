import Link from "next/link";
import { ContactForm } from "@/components/contact-form";

export const metadata = { title: "Contact Us" };

export default function Contact() {
  return (
    <main className="contact-page">
      <div className="commerce-breadcrumb"><Link href="/">Home</Link><span>/</span> Contact Us</div>
      <section className="contact-page__intro">
        <p className="eyebrow">A CONVERSATION STARTS HERE</p>
        <h1>We’re here to<br /><em>listen.</em></h1>
        <p>Questions about our collections, an order, or choosing the right textile for your space? Send us a note and the YOI KIJI team will be in touch.</p>
        <Link href="/account/orders" className="contact-page__order-link">Looking for an order update? View your orders <span aria-hidden="true">↗</span></Link>
      </section>
      <section className="contact-page__form-section" aria-labelledby="contact-form-title">
        <div className="contact-page__form-heading">
          <p className="eyebrow">GET IN TOUCH</p>
          <h2 id="contact-form-title">Send us a message</h2>
          <p>Share a few details below and we’ll get back to you.</p>
        </div>
        <ContactForm />
      </section>
    </main>
  );
}
