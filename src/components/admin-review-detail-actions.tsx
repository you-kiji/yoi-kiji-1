"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminReviewDetailActions({ id, initialStatus, initialNote }: { id: string; initialStatus: string; initialNote: string | null }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [note, setNote] = useState(initialNote ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save(nextStatus?: "APPROVED" | "REJECTED") {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/reviews", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...(nextStatus ? { status: nextStatus } : {}), adminNote: note }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Review update failed.");
      setStatus(data.review.status);
      setNote(data.review.adminNote ?? "");
      setMessage(nextStatus ? "Review " + nextStatus.toLowerCase() + "." : "Moderation note saved.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Review update failed."); }
    finally { setBusy(false); }
  }
  return <div className="admin-review-detail-actions">
    <span className="order-status">{status.toLowerCase()}</span>
    <label>Internal moderation note<textarea rows={4} maxLength={1000} value={note} onChange={event => setNote(event.target.value)} placeholder="Record a private moderation reason or follow-up"/></label>
    <button type="button" disabled={busy} onClick={() => save()}>{busy ? "Saving…" : "Save internal note"}</button>
    {status !== "APPROVED" && <button type="button" disabled={busy} onClick={() => save("APPROVED")}>Approve & publish</button>}
    {status !== "REJECTED" && <button type="button" className="secondary" disabled={busy} onClick={() => save("REJECTED")}>Reject review</button>}
    {message && <small role="status">{message}</small>}
  </div>;
}
