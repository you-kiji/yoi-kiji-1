"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

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

export function CartView({ labels = {} }: { labels?: Record<string,string> }) {\n  const t = (key: string, fallback: string) => labels[key] ?? fallback;
  const [cart, setCart] = useState<Line[]>([]);
  const [lines, setLines] = useState<Quoted[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const quoteController = useRef<AbortController | null>(null);
  const quoteRequestId = useRef(0);

  const refresh = useCallback(async (items: Line[]) => {
    const requestId = ++quoteRequestId.current;
    quoteController.current?.abort();
    const controller = new AbortController();
    quoteController.current = controller;
    setLoading(true);
    try {
      const response = await fetch("/api/cart/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to load your bag.");
      if (requestId !== quoteRequestId.current) return;
      setLines(Array.isArray(data.items) ? data.items : []);
      setError("");
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      if (requestId !== quoteRequestId.current) return;
      setLines([]);
      setError(reason instanceof Error ? reason.message : "Unable to load your bag.");
    } finally {
      if (requestId === quoteRequestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("yoikiji_cart");
      const parsed: unknown = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(parsed) || parsed.some((item) =>
        !item || typeof item.productId !== "string" ||
        typeof item.quantity !== "number" || !Number.isSafeInteger(item.quantity) || item.quantity < 1 ||
        (item.variantId !== undefined && typeof item.variantId !== "string")
      )) {
        throw new Error("invalid saved bag");
      }
      const initial = parsed as Line[];
      setCart(initial);
      void refresh(initial);
    } catch {
      setError("Your saved bag could not be read. Clear it and add your pieces again.");
      setLoading(false);
    }
    return () => {
      quoteRequestId.current += 1;
      quoteController.current?.abort();
    };
  }, [refresh]);

  function update(next: Line[]) {
    setCart(next);
    try {
      localStorage.setItem("yoikiji_cart", JSON.stringify(next));
      window.dispatchEvent(new Event("yoikiji-cart-updated"));
      void refresh(next);
    } catch {
      setError("Your browser could not save this bag. Check your browser storage settings and try again.");
    }
  }

  function clearSavedBag() {
    setCart([]);
    setLines([]);
    setError("");
    try { localStorage.removeItem("yoikiji_cart"); } catch { /* The visible cart is still cleared for this session. */ }
    window.dispatchEvent(new Event("yoikiji-cart-updated"));
  }

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotalPaise, 0);

  return (
    <section className="cart-layout" aria-label={t("cart.aria","Your shopping bag")}>
      {loading && <p className="cart-loading" role="status">{t("cart.loading","Preparing your bag…")}</p>}

      {error && (
        <div className="cart-error-state" role="alert">
          <p>{error}</p>
          <button type="button" onClick={clearSavedBag}>{t("cart.clearSaved","Clear saved bag")}</button>
        </div>
      )}

      {!loading && !error && lines.length === 0 && (
        <div className="catalogue-empty cart-empty-state">
          <p className="eyebrow">{t("cart.eyebrow","YOUR BAG, YOUR PACE")}</p>
          <h2>{t("cart.emptyTitle","Your bag is waiting.")}</h2>
          <p>{t("cart.emptyHint","Explore the collections and find something that feels like home.")}</p>
          <Link className="primary-link" href="/shop">{t("cart.explore","Explore collections")}</Link>
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
                  <p className="cart-line-category">{line.variantLabel ?? t("cart.homeTextile","Home textile")}</p>
                  <h2>{line.name}</h2>
                  <p className="cart-line-sku">{t("cart.itemCode","Item code")}: {line.sku}</p>
                </div>
                <strong className="cart-line-total">{formatPrice(line.lineTotalPaise)}</strong>
              </div>

              <p className="cart-unit-price">{formatPrice(line.unitPricePaise)} {t("cart.each","each")}</p>

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
                  {t("cart.stockWarning","Only " + line.availableQty + " currently available. Update the quantity to continue.")}
                </p>
              )}
            </div>
          </article>
        );
      })}

      {!loading && !error && lines.length > 0 && (
        <aside className="cart-summary">
          <p><span>{t("cart.subtotal","Subtotal")}</span><strong>{formatPrice(subtotal)}</strong></p>
          <small>{t("cart.shippingNote","Shipping and applicable taxes are confirmed at checkout.")}</small>
          <Link className="primary-link" href="/checkout">{t("cart.checkout","Continue to checkout")}</Link>
        </aside>
      )}
    </section>
  );
}
