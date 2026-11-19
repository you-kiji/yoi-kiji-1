"use client";

import { useState } from "react";

export function AdminFulfillmentForm({
  id,
  initialProvider,
  initialTracking,
}: {
  id: string;
  initialProvider: string | null;
  initialTracking: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState(initialProvider ?? "DELHIVERY");
  const [tracking, setTracking] = useState(initialTracking ?? "");
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/orders/" + id + "/fulfillment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          trackingNumber: tracking || undefined,
          trackingUrl: url || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to save tracking.");
      setMessage("Tracking details saved.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save tracking.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fulfillment-editor">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
      >
        {open ? "Close shipping details" : "Shipping and tracking"}
      </button>

      {open && (
        <div className="fulfillment-editor-fields">
          <label htmlFor={"fulfillment-provider-" + id}>
            <span>Courier / provider</span>
            <select id={"fulfillment-provider-" + id} value={provider} onChange={event => setProvider(event.target.value)}>
              <option value="DELHIVERY">Delhivery</option>
              <option value="ATS">Amazon Shipping (ATS)</option>
              <option value="MANUAL">Manual</option>
            </select>
          </label>
          <label htmlFor={"fulfillment-tracking-" + id}>
            <span>AWB / tracking number</span>
            <input
              id={"fulfillment-tracking-" + id}
              value={tracking}
              maxLength={120}
              onChange={event => setTracking(event.target.value)}
              placeholder="Enter tracking reference"
            />
          </label>
          <label htmlFor={"fulfillment-url-" + id}>
            <span>Tracking URL <em>Optional</em></span>
            <input
              id={"fulfillment-url-" + id}
              type="url"
              value={url}
              maxLength={1000}
              onChange={event => setUrl(event.target.value)}
              placeholder="https://…"
            />
          </label>
          <button type="button" disabled={busy} onClick={save}>
            {busy ? "Saving tracking…" : "Save tracking details"}
          </button>
          {message && <small role="status">{message}</small>}
        </div>
      )}
    </div>
  );
}
