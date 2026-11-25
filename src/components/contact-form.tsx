"use client";

import { useState, type FormEvent } from "react";

type FormState = { name: string; email: string; phone: string; subject: string; message: string; website: string };

const initialState: FormState = { name: "", email: "", phone: "", subject: "", message: "", website: "" };

export function ContactForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  function update(field: keyof FormState, value: string) {
    setForm(current => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setBusy(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "We could not send your message. Please try again.");
      setForm(initialState);
      setStatus("Thank you. Your message has been sent to the YOI KIJI team.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "We could not send your message. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <div className="grid-2">
        <div className="form-group">
          <label htmlFor="contact-name" className="form-label">Full name <span className="required">*</span></label>
          <input id="contact-name" name="name" autoComplete="name" required minLength={2} maxLength={100} value={form.name} onChange={event => update("name", event.target.value)} placeholder="Your name" className="form-input" />
        </div>
        <div className="form-group">
          <label htmlFor="contact-email" className="form-label">Email address <span className="required">*</span></label>
          <input id="contact-email" name="email" type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={event => update("email", event.target.value)} placeholder="you@example.com" className="form-input" />
        </div>
        <div className="form-group">
          <label htmlFor="contact-phone" className="form-label">Phone number <small>Optional</small></label>
          <input id="contact-phone" name="phone" type="tel" autoComplete="tel" maxLength={20} value={form.phone} onChange={event => update("phone", event.target.value)} placeholder="+91" className="form-input" />
        </div>
        <div className="form-group">
          <label htmlFor="contact-subject" className="form-label">Subject <span className="required">*</span></label>
          <input id="contact-subject" name="subject" required minLength={3} maxLength={120} value={form.subject} onChange={event => update("subject", event.target.value)} placeholder="How can we help?" className="form-input" />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="contact-message" className="form-label">Your message <span className="required">*</span></label>
        <textarea id="contact-message" name="message" required minLength={10} maxLength={5000} rows={6} value={form.message} onChange={event => update("message", event.target.value)} placeholder="Tell us a little about what you need…" className="form-textarea" />
      </div>
      <label aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}>Website<input name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={event => update("website", event.target.value)} /></label>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
        <p role="status" aria-live="polite" style={{ color: status.startsWith("Thank") ? 'var(--color-success)' : 'var(--color-error)', margin: 0 }}>{status}</p>
        <button type="submit" disabled={busy} className="btn btn-primary btn-lg">{busy ? "SENDING…" : "SEND MESSAGE"} <span aria-hidden="true">↗</span></button>
      </div>
      <p style={{ color: 'var(--color-sage)', fontSize: '0.8125rem', margin: 0 }}>Your details will only be used to respond to your enquiry.</p>
    </form>
  );
}