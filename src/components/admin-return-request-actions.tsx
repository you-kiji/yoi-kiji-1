"use client";
import { useState } from "react";
export function AdminReturnRequestActions({ orderId, status }: { orderId: string; status: string }) {
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function update(next: "APPROVED" | "REJECTED" | "RECEIVED") {
    setBusy(true); setMessage("");
    try { const response = await fetch(`/api/admin/orders/${orderId}/return`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Unable to update return request."); window.location.reload(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to update return request."); }
    finally { setBusy(false); }
  }
  return <div className="admin-order-actions">{status === "REQUESTED" && <><button disabled={busy} onClick={() => update("APPROVED")}>Approve return</button><button disabled={busy} onClick={() => update("REJECTED")}>Reject return</button></>}{status === "APPROVED" && <button disabled={busy} onClick={() => update("RECEIVED")}>Mark item received</button>}{message && <small role="status">{message}</small>}</div>;
}
