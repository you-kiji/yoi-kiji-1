"use client";
import { useState } from "react";

type ReturnRequest = { status: string; reason: string; details?: string; requestedAt?: string };
export function ReturnRequestForm({ orderId, initialRequest }: { orderId: string; initialRequest: ReturnRequest | null }) {
  const [reason, setReason] = useState("DAMAGED");
  const [details, setDetails] = useState("");
  const [request, setRequest] = useState(initialRequest);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/account/orders/${orderId}/return`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason, details }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to submit return request.");
      setRequest(data.returnRequest); setMessage("Your return request has been submitted.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to submit return request."); }
    finally { setBusy(false); }
  }
  if (request) return <section className="card"><div className="p-lg"><h3>Return request</h3><p>Status: <strong>{request.status.replaceAll("_", " ").toLowerCase()}</strong></p><p>Reason: {request.reason.replaceAll("_", " ").toLowerCase()}</p>{request.details && <p>{request.details}</p>}</div></section>;
  return <section className="card"><div className="p-lg"><h3>Request a return</h3><p style={{ color: "var(--color-forest)" }}>Tell us what went wrong. Our team will review your request and contact you with the next steps.</p><label htmlFor="return-reason">Reason</label><select id="return-reason" value={reason} onChange={event => setReason(event.target.value)}><option value="DAMAGED">Item arrived damaged</option><option value="WRONG_ITEM">Wrong item received</option><option value="QUALITY">Quality concern</option><option value="OTHER">Other</option></select><label htmlFor="return-details">Additional details (optional)</label><textarea id="return-details" value={details} onChange={event => setDetails(event.target.value)} maxLength={1000} rows={3} /><button type="button" className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? "Submitting…" : "Submit return request"}</button>{message && <p role="status">{message}</p>}</div></section>;
}
