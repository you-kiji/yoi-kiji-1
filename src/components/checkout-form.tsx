"use client";

import Script from "next/script";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

type CartLine = { productId: string; variantId?: string; quantity: number };
type ShippingForm = {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
};

export function CheckoutForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [form, setForm] = useState<ShippingForm>({
    fullName: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    countryCode: "IN",
  });

  function change(key: keyof ShippingForm, value: string) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const items: CartLine[] = JSON.parse(localStorage.getItem("yoikiji_cart") ?? "[]");
      if (!items.length) throw new Error("Your bag is empty.");

      let checkoutKey = localStorage.getItem("yoikiji_checkout_key");
      if (!checkoutKey) {
        checkoutKey = crypto.randomUUID();
        localStorage.setItem("yoikiji_checkout_key", checkoutKey);
      }

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutKey,
          items,
          shippingAddress: {
            ...form,
            fullName: form.fullName.trim(),
            phone: form.phone.trim(),
            line1: form.line1.trim(),
            line2: form.line2.trim(),
            city: form.city.trim(),
            state: form.state.trim(),
            postalCode: form.postalCode.trim(),
          },
          ...(couponCode.trim() ? { couponCode: couponCode.trim().toUpperCase() } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Checkout could not start.");
      if (!window.Razorpay) throw new Error("Payment window is still loading. Please try again.");

      const payment = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "YOI KIJI",
        description: "Order " + data.orderNumber,
        order_id: data.razorpayOrderId,
        prefill: { name: form.fullName, contact: form.phone },
        theme: { color: "#0e300e" },
        handler: async (result: Record<string, string>) => {
          try {
            const verified = await fetch("/api/payments/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(result),
            });
            const resultData = await verified.json();
            if (!verified.ok || resultData.verified !== true) {
              setError(
                resultData.error ??
                  resultData.message ??
                  "Payment is awaiting capture confirmation. Check your order history shortly.",
              );
              return;
            }
            localStorage.removeItem("yoikiji_cart");
            localStorage.removeItem("yoikiji_checkout_key");
            router.push("/account/orders?placed=" + encodeURIComponent(resultData.orderNumber));
            router.refresh();
          } catch {
            setError("We could not confirm the payment response. Please check your order history before trying again.");
          }
        },
      });
      payment.open();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to start checkout.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <form className="checkout-form premium-form" onSubmit={submit}>
        <section className="checkout-form-section" aria-labelledby="delivery-contact-heading">
          <div className="checkout-section-heading">
            <span className="checkout-step">01</span>
            <div>
              <h2 id="delivery-contact-heading">Contact details</h2>
              <p>Who should we contact about this delivery?</p>
            </div>
          </div>
          <div className="checkout-fields">
            <label htmlFor="checkout-full-name">
              <span>Full name</span>
              <input
                id="checkout-full-name"
                name="fullName"
                required
                minLength={2}
                maxLength={100}
                autoComplete="name"
                placeholder="Name of the recipient"
                value={form.fullName}
                onChange={(event) => change("fullName", event.target.value)}
              />
            </label>
            <label htmlFor="checkout-phone">
              <span>Phone number</span>
              <input
                id="checkout-phone"
                name="phone"
                type="tel"
                required
                minLength={8}
                maxLength={20}
                autoComplete="tel"
                inputMode="tel"
                placeholder="Your contact number"
                value={form.phone}
                onChange={(event) => change("phone", event.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="checkout-form-section" aria-labelledby="delivery-address-heading">
          <div className="checkout-section-heading">
            <span className="checkout-step">02</span>
            <div>
              <h2 id="delivery-address-heading">Delivery address</h2>
              <p>Enter the address where you would like your order delivered.</p>
            </div>
          </div>
          <div className="checkout-fields">
            <label className="wide" htmlFor="checkout-address-line1">
              <span>Address line 1</span>
              <input
                id="checkout-address-line1"
                name="address-line1"
                required
                minLength={4}
                maxLength={180}
                autoComplete="address-line1"
                placeholder="House number, building and street"
                value={form.line1}
                onChange={(event) => change("line1", event.target.value)}
              />
            </label>
            <label className="wide" htmlFor="checkout-address-line2">
              <span>Address line 2 <em>Optional</em></span>
              <input
                id="checkout-address-line2"
                name="address-line2"
                maxLength={180}
                autoComplete="address-line2"
                placeholder="Apartment, landmark or area"
                value={form.line2}
                onChange={(event) => change("line2", event.target.value)}
              />
            </label>
            <label htmlFor="checkout-city">
              <span>City</span>
              <input
                id="checkout-city"
                name="city"
                required
                minLength={2}
                maxLength={80}
                autoComplete="address-level2"
                placeholder="City"
                value={form.city}
                onChange={(event) => change("city", event.target.value)}
              />
            </label>
            <label htmlFor="checkout-state">
              <span>State</span>
              <input
                id="checkout-state"
                name="state"
                required
                minLength={2}
                maxLength={80}
                autoComplete="address-level1"
                placeholder="State"
                value={form.state}
                onChange={(event) => change("state", event.target.value)}
              />
            </label>
            <label htmlFor="checkout-postal-code">
              <span>PIN code</span>
              <input
                id="checkout-postal-code"
                name="postalCode"
                type="text"
                required
                minLength={6}
                maxLength={6}
                pattern="[0-9]{6}"
                title="Enter a valid 6-digit Indian PIN code."
                autoComplete="postal-code"
                inputMode="numeric"
                placeholder="Postal code"
                value={form.postalCode}
                onChange={(event) => change("postalCode", event.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="checkout-form-section checkout-promotion-section" aria-labelledby="promotion-heading">
          <div className="checkout-section-heading">
            <span className="checkout-step">03</span>
            <div>
              <h2 id="promotion-heading">A little something extra</h2>
              <p>Have a promotion code? You can add it here.</p>
            </div>
          </div>
          <label className="checkout-coupon" htmlFor="checkout-coupon">
            <span>Promotion code <em>Optional</em></span>
            <input
              id="checkout-coupon"
              name="couponCode"
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
              maxLength={32}
              placeholder="ENTER YOUR CODE"
              autoComplete="off"
            />
          </label>
        </section>

        {error && <p className="form-error checkout-error" role="alert">{error}</p>}

        <div className="checkout-submit-area">
          <button className="primary-link checkout-submit" type="submit" disabled={busy}>
            {busy ? "Preparing secure payment…" : "Continue to secure payment"}
          </button>
          <p className="checkout-disclaimer">
            Payments are securely processed by Razorpay. Your order is confirmed only after payment verification.
          </p>
        </div>
      </form>
    </>
  );
}
