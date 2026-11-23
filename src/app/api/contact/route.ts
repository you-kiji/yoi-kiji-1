import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(20).optional().default(""),
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(10).max(5000),
  website: z.string().max(500).optional().default(""),
});

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[character] ?? character));
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please complete all required fields with valid details." }, { status: 400 });

  // Quietly accept honeypot submissions without forwarding spam to the store inbox.
  if (parsed.data.website.trim()) return NextResponse.json({ message: "Thank you. Your message has been sent." });

  const apiKey = process.env.EMAIL_API_KEY;
  const from = process.env.EMAIL_FROM;
  const recipient = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !from || !recipient) {
    return NextResponse.json({ error: "The contact form is temporarily unavailable. Please try again later." }, { status: 503 });
  }

  const { name, email, phone, subject, message } = parsed.data;
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safePhone = escapeHtml(phone);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br/>");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [recipient],
        reply_to: email,
        subject: "YOI KIJI website enquiry: " + subject,
        text: "New website enquiry for YOI KIJI\n\nName: " + name + "\nEmail: " + email + "\nPhone: " + (phone || "Not provided") + "\nSubject: " + subject + "\n\n" + message,
        html: "<div style='font-family:Arial,sans-serif;color:#0e300e;max-width:620px;margin:auto'><h1 style='letter-spacing:.18em'>YOI KIJI</h1><h2>New website enquiry</h2><p><strong>Name:</strong> " + safeName + "</p><p><strong>Email:</strong> " + safeEmail + "</p><p><strong>Phone:</strong> " + (safePhone || "Not provided") + "</p><p><strong>Subject:</strong> " + safeSubject + "</p><div style='padding:18px;background:#f1f0e8;line-height:1.8'>" + safeMessage + "</div></div>",
      }),
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ error: "We could not deliver your message right now. Please try again shortly." }, { status: 502 });
    return NextResponse.json({ message: "Thank you. Your message has been sent to the YOI KIJI team." });
  } catch {
    return NextResponse.json({ error: "We could not deliver your message right now. Please try again shortly." }, { status: 502 });
  }
}
