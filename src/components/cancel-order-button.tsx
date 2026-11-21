"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelOrderButton({ orderId, compact = false }: { orderId: string; compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function cancelOrder() {
    if (busy || !window.confirm("Cancel this order? Any reserved stock and promotion usage will be released.")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/account/orders/" + encodeURIComponent(orderId) + "/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "This order could not be cancelled.");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This order could not be cancelled.");
    } finally {
      setBusy(false);
    }
  }

  return <div className={compact ? "account-cancel-order account-cancel-order--compact" : "account-cancel-order"}>
    <button type="button" className="account-cancel-order__button" onClick={cancelOrder} disabled={busy}>
      {busy ? "Cancelling…" : "Cancel order"}
    </button>
    {error && <p className="account-cancel-order__error" role="alert">{error}</p>}
  </div>;
}
