"use client";

import { FormEvent, useState } from "react";

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
    <form className="contact-form" onSubmit={submit}>
      <div className="contact-form__grid">
        <label>Full name <span>*</span><input name="name" autoComplete="name" required minLength={2} maxLength={100} value={form.name} onChange={event => update("name", event.target.value)} placeholder="Your name" /></label>
        <label>Email address <span>*</span><input name="email" type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={event => update("email", event.target.value)} placeholder="you@example.com" /></label>
        <label>Phone number <small>Optional</small><input name="phone" type="tel" autoComplete="tel" maxLength={20} value={form.phone} onChange={event => update("phone", event.target.value)} placeholder="+91" /></label>
        <label>Subject <span>*</span><input name="subject" required minLength={3} maxLength={120} value={form.subject} onChange={event => update("subject", event.target.value)} placeholder="How can we help?" /></label>
      </div>
      <label className="contact-form__message">Your message <span>*</span><textarea name="message" required minLength={10} maxLength={5000} rows={6} value={form.message} onChange={event => update("message", event.target.value)} placeholder="Tell us a little about what you need…" /></label>
      <label className="contact-form__website" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={event => update("website", event.target.value)} /></label>
      <div className="contact-form__footer">
        <p role="status" aria-live="polite">{status}</p>
        <button type="submit" disabled={busy}>{busy ? "SENDING…" : "SEND MESSAGE"} <span aria-hidden="true">↗</span></button>
      </div>
      <p className="contact-form__privacy">Your details will only be used to respond to your enquiry.</p>
    </form>
  );
}
