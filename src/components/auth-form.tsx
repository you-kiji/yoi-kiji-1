"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type RegistrationAddress = {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
};

const emptyAddress: RegistrationAddress = {
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  countryCode: "IN",
};

export function AuthForm({
  mode,
  redirectTo = "/account",
}: {
  mode: "login" | "register";
  redirectTo?: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [includeAddress, setIncludeAddress] = useState(true);
  const [address, setAddress] = useState<RegistrationAddress>(emptyAddress);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const isRegister = mode === "register";

  function updateAddress<K extends keyof RegistrationAddress>(key: K, value: RegistrationAddress[K]) {
    setAddress(current => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (isRegister && password !== confirmPassword) {
      setError("Your passwords do not match. Please check and try again.");
      return;
    }

    setBusy(true);
    try {
      const payload = isRegister
        ? {
            name: name.trim(),
            email: email.trim(),
            password,
            whatsappOptIn,
            ...(includeAddress ? {
              address: {
                ...address,
                fullName: address.fullName.trim() || name.trim(),
              },
            } : {}),
          }
        : { email: email.trim(), password };

      const response = await fetch(`/api/auth/${isRegister ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to continue.");

      router.push(redirectTo);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={`auth-form premium-form ${isRegister ? "auth-form-register" : "auth-form-login"}`} onSubmit={submit}>
      {isRegister && (
        <section className="auth-form-section" aria-labelledby="registration-profile-heading">
          <div className="auth-form-section-heading">
            <span className="auth-form-step">01</span>
            <div>
              <h2 id="registration-profile-heading">Your details</h2>
              <p>Start with the details for your YOI KIJI account.</p>
            </div>
          </div>
          <label htmlFor="auth-name">
            <span>Full name <i>Required</i></span>
            <input id="auth-name" name="name" type="text" required minLength={2} maxLength={100}
              autoComplete="name" placeholder="Your full name" value={name}
              onChange={event => {
                const nextName = event.target.value;
                setName(nextName);
                setAddress(current => ({ ...current, fullName: current.fullName ? current.fullName : nextName }));
              }} />
          </label>
        </section>
      )}

      <section className="auth-form-section" aria-labelledby="auth-credentials-heading">
        <div className="auth-form-section-heading">
          <span className="auth-form-step">{isRegister ? "02" : "01"}</span>
          <div>
            <h2 id="auth-credentials-heading">{isRegister ? "Sign-in details" : "Welcome back"}</h2>
            <p>{isRegister ? "Your email and password keep your account secure." : "Enter your account credentials to continue."}</p>
          </div>
        </div>
        <label htmlFor="auth-email">
          <span>Email address <i>Required</i></span>
          <input id="auth-email" name="email" type="email" required maxLength={254} autoComplete="email"
            inputMode="email" placeholder="you@example.com" value={email}
            onChange={event => setEmail(event.target.value)} />
        </label>
        <label htmlFor="auth-password">
          <span>Password <i>Required</i></span>
          <input id="auth-password" name="password" type="password" required minLength={isRegister ? 12 : 1}
            maxLength={128} autoComplete={isRegister ? "new-password" : "current-password"}
            placeholder={isRegister ? "At least 12 characters" : "Enter your password"}
            aria-describedby={isRegister ? "auth-password-hint" : undefined}
            value={password} onChange={event => setPassword(event.target.value)} />
          {isRegister && <small id="auth-password-hint" className="field-hint">Use at least 12 characters for a stronger password.</small>}
        </label>
        {isRegister && (
          <label htmlFor="auth-confirm-password">
            <span>Confirm password <i>Required</i></span>
            <input id="auth-confirm-password" name="confirmPassword" type="password" required minLength={12}
              maxLength={128} autoComplete="new-password" placeholder="Enter your password again"
              value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} />
          </label>
        )}
      </section>

      {isRegister && (
        <>
          <section className="auth-form-section auth-address-section" aria-labelledby="registration-address-heading">
            <div className="auth-form-section-heading">
              <span className="auth-form-step">03</span>
              <div>
                <h2 id="registration-address-heading">Delivery address</h2>
                <p>Add your address now or save it securely during checkout later.</p>
              </div>
            </div>
            <label className="auth-address-toggle">
              <input type="checkbox" checked={includeAddress} onChange={event => setIncludeAddress(event.target.checked)} />
              <span>Add a delivery address to my account</span>
            </label>
            {includeAddress && (
              <div className="auth-address-grid">
                <label className="auth-field-wide" htmlFor="address-full-name">
                  <span>Recipient full name <i>Required</i></span>
                  <input id="address-full-name" autoComplete="shipping name" required maxLength={100}
                    value={address.fullName} onChange={event => updateAddress("fullName", event.target.value)} placeholder="Name on the delivery" />
                </label>
                <label htmlFor="address-phone">
                  <span>Phone number <i>Required</i></span>
                  <input id="address-phone" type="tel" autoComplete="shipping tel" inputMode="tel" required minLength={7} maxLength={20}
                    value={address.phone} onChange={event => updateAddress("phone", event.target.value)} placeholder="+91 98765 43210" />
                </label>
                <label htmlFor="address-country">
                  <span>Country / region <i>Required</i></span>
                  <select id="address-country" autoComplete="shipping country" value={address.countryCode}
                    onChange={event => updateAddress("countryCode", event.target.value)}>
                    <option value="IN">India</option>
                  </select>
                </label>
                <label className="auth-field-wide" htmlFor="address-line1">
                  <span>Address line 1 <i>Required</i></span>
                  <input id="address-line1" autoComplete="shipping address-line1" required maxLength={180}
                    value={address.line1} onChange={event => updateAddress("line1", event.target.value)} placeholder="House / flat, street, area" />
                </label>
                <label className="auth-field-wide" htmlFor="address-line2">
                  <span>Address line 2 <em>Optional</em></span>
                  <input id="address-line2" autoComplete="shipping address-line2" maxLength={180}
                    value={address.line2} onChange={event => updateAddress("line2", event.target.value)} placeholder="Landmark, apartment, floor" />
                </label>
                <label htmlFor="address-city">
                  <span>City <i>Required</i></span>
                  <input id="address-city" autoComplete="shipping address-level2" required minLength={2} maxLength={100}
                    value={address.city} onChange={event => updateAddress("city", event.target.value)} placeholder="City" />
                </label>
                <label htmlFor="address-state">
                  <span>State <i>Required</i></span>
                  <input id="address-state" autoComplete="shipping address-level1" required minLength={2} maxLength={100}
                    value={address.state} onChange={event => updateAddress("state", event.target.value)} placeholder="State" />
                </label>
                <label htmlFor="address-postal">
                  <span>PIN / postal code <i>Required</i></span>
                  <input id="address-postal" autoComplete="shipping postal-code" required minLength={3} maxLength={20}
                    value={address.postalCode} onChange={event => updateAddress("postalCode", event.target.value)} placeholder="Postal code" />
                </label>
              </div>
            )}
          </section>

          <label className="auth-consent" htmlFor="auth-whatsapp-opt-in">
            <input id="auth-whatsapp-opt-in" type="checkbox" checked={whatsappOptIn}
              onChange={event => setWhatsappOptIn(event.target.checked)} />
            <span>I'd like to receive transactional order updates on WhatsApp. This is optional and can be changed later.</span>
          </label>
        </>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-link auth-submit" type="submit" disabled={busy}>
        {busy ? "Please wait…" : isRegister ? "Create your account" : "Sign in to your account"}
      </button>
      <p className="form-security-note">Your account details are transmitted securely.</p>
    </form>
  );
}
