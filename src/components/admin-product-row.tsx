"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminProductRow({
  id,
  initiallyActive,
  initialStock,
}: {
  id: string;
  initiallyActive: boolean;
  initialStock: number;
}) {
  const router = useRouter();
  const [active, setActive] = useState(initiallyActive);
  const [stock, setStock] = useState(String(initialStock));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setActive(initiallyActive);
    setStock(String(initialStock));
  }, [initiallyActive, initialStock]);

  async function save(data: Record<string, unknown>, onSuccess?: () => void) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/products/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error ?? "Unable to update this product.");
      }
      onSuccess?.();
      setMessage("Changes saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save changes.");
    } finally {
      setBusy(false);
    }
  }

  function updateStock() {
    if (!stock.trim()) {
      setMessage("Enter a stock quantity before saving.");
      return;
    }

    const quantity = Number(stock);
    if (!Number.isSafeInteger(quantity) || quantity < 0) {
      setMessage("Enter a whole-number stock quantity of zero or more.");
      return;
    }

    void save({ inventoryQty: quantity });
  }

  return (
    <div className="admin-row-controls" aria-busy={busy}>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          const next = !active;
          void save({ isActive: next }, () => setActive(next));
        }}
      >
        {active ? "Unpublish" : "Publish"}
      </button>
      <label>
        Stock
        <input
          type="number"
          min="0"
          step="1"
          required
          inputMode="numeric"
          value={stock}
          disabled={busy}
          onChange={(event) => setStock(event.target.value)}
          aria-label="Product stock quantity"
        />
      </label>
      <button type="button" disabled={busy} onClick={updateStock}>
        {busy ? "Saving…" : "Update stock"}
      </button>
      {message && <small role="status" aria-live="polite">{message}</small>}
    </div>
  );
}
