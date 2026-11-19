"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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

  async function save(data: Record<string, unknown>, onSuccess?: () => void) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/products/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to update this product.");
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
    const quantity = Number(stock);
    if (!Number.isSafeInteger(quantity) || quantity < 0) {
      setMessage("Enter a whole-number stock quantity of zero or more.");
      return;
    }
    void save({ inventoryQty: quantity });
  }

  return (
    <div className="admin-row-controls">
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
          inputMode="numeric"
          value={stock}
          onChange={(event) => setStock(event.target.value)}
          aria-label="Product stock quantity"
        />
      </label>
      <button type="button" disabled={busy} onClick={updateStock}>
        Update stock
      </button>
      {message && <small role="status">{message}</small>}
    </div>
  );
}
