"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Line = { productId: string; variantId?: string; quantity: number };
type Quoted = {
  productId: string;
  variantId: string | null;
  name: string;
  variantLabel: string | null;
  sku: string;
  quantity: number;
  unitPricePaise: number;
  lineTotalPaise: number;
  image: string | null;
  availableQty: number;
};

function formatPrice(paise: number) {
  return "₹" + (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function CartView() {
  const [cart, setCart] = useState<Line[]>([]);
  const [lines, setLines] = useState<Quoted[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh(next?: Line[]) {
    const items = next ?? cart;
    setLoading(true);
    try {
      const response = await fetch("/api/cart/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to load your bag.");
      setLines(data.items);
      setError("");
    } catch (reason) {
      setLines([]);
      setError(reason instanceof Error ? reason.message : "Unable to load your bag.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem("yoikiji_cart");
      const initial: Line[] = saved ? JSON.parse(saved) : [];
      setCart(initial);
      void refresh(initial);
    } catch {
      setError("Your saved bag could not be read. Please refresh and try again.");
      setLoading(false);
    }
  }, []);

  function update(next: Line[]) {
    setCart(next);
    localStorage.setItem("yoikiji_cart", JSON.stringify(next));
    window.dispatchEvent(new Event("yoikiji-cart-updated"));
    void refresh(next);
  }

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotalPaise, 0);

  return (
    <section className="cart-layout" aria-label="Your shopping bag">
      {loading && <p className="cart-loading" role="status">Preparing your bag…</p>}

      {error && <p className="form-error" role="alert">{error}</p>}

      {!loading && !error && lines.length === 0 && (
        <div className="catalogue-empty cart-empty-state">
          <p className="eyebrow">YOUR BAG, YOUR PACE</p>
          <h2>Your bag is waiting.</h2>
          <p>Explore the collections and find something that feels like home.</p>
          <Link className="primary-link" href="/shop">Explore collections</Link>
        </div>
      )}

      {lines.map((line) => {
        const key = line.productId + (line.variantId ?? "");
        const maxQuantity = Math.min(10, Math.max(0, line.availableQty));
        const atMaximum = line.quantity >= maxQuantity;

        return (
          <article className="cart-line" key={key}>
            <div className="cart-thumb">
              {line.image ? <img src={line.image} alt={line.name} /> : <span>YOI KIJI</span>}
            </div>

            <div className="cart-line-info">
              <div className="cart-line-heading">
                <div>
                  <p className="cart-line-category">{line.variantLabel ?? "Home textile"}</p>
                  <h2>{line.name}</h2>
                  <p className="cart-line-sku">Item code: {line.sku}</p>
                </div>
                <strong className="cart-line-total">{formatPrice(line.lineTotalPaise)}</strong>
              </div>

              <p className="cart-unit-price">{formatPrice(line.unitPricePaise)} each</p>

              <div className="quantity-control" aria-label={"Quantity for " + line.name}>
                <button
                  type="button"
                  aria-label={"Decrease quantity of " + line.name}
                  disabled={line.quantity <= 1 || loading}
                  onClick={() => update(cart.map((item) =>
                    item.productId === line.productId && item.variantId === line.variantId
                      ? { ...item, quantity: Math.max(1, item.quantity - 1) }
                      : item,
                  ))}
                >
                  −
                </button>
                <span aria-live="polite" aria-label={"Quantity " + line.quantity}>{line.quantity}</span>
                <button
                  type="button"
                  aria-label={"Increase quantity of " + line.name}
                  disabled={atMaximum || loading}
                  onClick={() => update(cart.map((item) =>
                    item.productId === line.productId && item.variantId === line.variantId
                      ? { ...item, quantity: Math.min(maxQuantity, item.quantity + 1) }
                      : item,
                  ))}
                >
                  +
                </button>
                <button
                  type="button"
                  className="remove-line"
                  disabled={loading}
                  onClick={() => update(cart.filter((item) =>
                    !(item.productId === line.productId && item.variantId === line.variantId),
                  ))}
                >
                  Remove
                </button>
              </div>

              {line.availableQty < line.quantity && (
                <p className="cart-stock-warning" role="alert">
                  Only {line.availableQty} currently available. Update the quantity to continue.
                </p>
              )}
            </div>
          </article>
        );
      })}

      {!loading && !error && lines.length > 0 && (
        <aside className="cart-summary">
          <p><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></p>
          <small>Shipping and applicable taxes are confirmed at checkout.</small>
          <Link className="primary-link" href="/checkout">Continue to checkout</Link>
        </aside>
      )}
    </section>
  );
}
