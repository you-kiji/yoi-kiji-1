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

type Labels = Record<string, string>;

export function AuthForm({
  mode,
  redirectTo = "/account",
  labels = {},
}: {
  mode: "login" | "register";
  redirectTo?: string;
  labels?: Labels;
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

  const t = (key: string, fallback: string) => labels[key] ?? fallback;

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
    <form className="flex flex-col gap-lg" onSubmit={submit}>
      {isRegister && (
        <section aria-labelledby="registration-profile-heading">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-gold)', flexShrink: 0 }}>01</span>
            <div>
              <h2 id="registration-profile-heading" style={{ marginBottom: 'var(--space-xs)' }}>Your details</h2>
              <p style={{ color: 'var(--color-moss)', margin: 0 }}>Start with the details for your YOI KIJI account.</p>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="auth-name" className="form-label">Full name <span className="required">*</span></label>
            <input id="auth-name" name="name" type="text" required minLength={2} maxLength={100}
              autoComplete="name" placeholder="Your full name" value={name}
              onChange={event => {
                const nextName = event.target.value;
                setName(nextName);
                setAddress(current => ({ ...current, fullName: current.fullName ? current.fullName : nextName }));
              }}
              className="form-input" />
          </div>
        </section>
      )}

      <section aria-labelledby="auth-credentials-heading">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-gold)', flexShrink: 0 }}>{isRegister ? "02" : "01"}</span>
          <div>
            <h2 id="auth-credentials-heading" style={{ marginBottom: 'var(--space-xs)' }}>{isRegister ? "Sign-in details" : "Welcome back"}</h2>
            <p style={{ color: 'var(--color-moss)', margin: 0 }}>{isRegister ? "Your email and password keep your account secure." : "Enter your account credentials to continue."}</p>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="auth-email" className="form-label">Email address <span className="required">*</span></label>
          <input id="auth-email" name="email" type="email" required maxLength={254} autoComplete="email"
            inputMode="email" placeholder="you@example.com" value={email}
            onChange={event => setEmail(event.target.value)} className="form-input" />
        </div>
        <div className="form-group">
          <label htmlFor="auth-password" className="form-label">Password <span className="required">*</span></label>
          <input id="auth-password" name="password" type="password" required minLength={isRegister ? 12 : 1}
            maxLength={128} autoComplete={isRegister ? "new-password" : "current-password"}
            placeholder={isRegister ? "At least 12 characters" : "Enter your password"}
            aria-describedby={isRegister ? "auth-password-hint" : undefined}
            value={password} onChange={event => setPassword(event.target.value)} className="form-input" />
          {isRegister && <small id="auth-password-hint" className="form-hint">Use at least 12 characters for a stronger password.</small>}
        </div>
        {isRegister && (
          <div className="form-group">
            <label htmlFor="auth-confirm-password" className="form-label">Confirm password <span className="required">*</span></label>
            <input id="auth-confirm-password" name="confirmPassword" type="password" required minLength={12}
              maxLength={128} autoComplete="new-password" placeholder="Enter your password again"
              value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className="form-input" />
          </div>
        )}
      </section>

      {isRegister && (
        <>
          <section aria-labelledby="registration-address-heading">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-gold)', flexShrink: 0 }}>03</span>
              <div>
                <h2 id="registration-address-heading" style={{ marginBottom: 'var(--space-xs)' }}>Delivery address</h2>
                <p style={{ color: 'var(--color-moss)', margin: 0 }}>Add your address now or save it securely during checkout later.</p>
              </div>
            </div>
            <div className="form-group form-checkbox">
              <input type="checkbox" id="auth-address-toggle" checked={includeAddress} onChange={event => setIncludeAddress(event.target.checked)} />
              <label htmlFor="auth-address-toggle" style={{ fontWeight: 400, cursor: 'pointer' }}>Add a delivery address to my account</label>
            </div>
            {includeAddress && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                <div className="grid-2">
                  <div className="form-group">
                    <label htmlFor="address-full-name" className="form-label">Recipient full name <span className="required">*</span></label>
                    <input id="address-full-name" autoComplete="shipping name" required maxLength={100}
                      value={address.fullName} onChange={event => updateAddress("fullName", event.target.value)} placeholder="Name on the delivery" className="form-input" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="address-phone" className="form-label">Phone number <span className="required">*</span></label>
                    <input id="address-phone" type="tel" autoComplete="shipping tel" inputMode="tel" required minLength={7} maxLength={20}
                      value={address.phone} onChange={event => updateAddress("phone", event.target.value)} placeholder="+91 98765 43210" className="form-input" />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="address-country" className="form-label">Country / region <span className="required">*</span></label>
                  <select id="address-country" autoComplete="shipping country" value={address.countryCode}
                    onChange={event => updateAddress("countryCode", event.target.value)} className="form-select">
                    <option value="IN">India</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="address-line1" className="form-label">Address line 1 <span className="required">*</span></label>
                  <input id="address-line1" autoComplete="shipping address-line1" required maxLength={180}
                    value={address.line1} onChange={event => updateAddress("line1", event.target.value)} placeholder="House / flat, street, area" className="form-input" />
                </div>
                <div className="form-group">
                  <label htmlFor="address-line2" className="form-label">Address line 2 <em>Optional</em></label>
                  <input id="address-line2" autoComplete="shipping address-line2" maxLength={180}
                    value={address.line2} onChange={event => updateAddress("line2", event.target.value)} placeholder="Landmark, apartment, floor" className="form-input" />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label htmlFor="address-city" className="form-label">City <span className="required">*</span></label>
                    <input id="address-city" autoComplete="shipping address-level2" required minLength={2} maxLength={100}
                      value={address.city} onChange={event => updateAddress("city", event.target.value)} placeholder="City" className="form-input" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="address-state" className="form-label">State <span className="required">*</span></label>
                    <input id="address-state" autoComplete="shipping address-level1" required minLength={2} maxLength={100}
                      value={address.state} onChange={event => updateAddress("state", event.target.value)} placeholder="State" className="form-input" />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="address-postal" className="form-label">PIN / postal code <span className="required">*</span></label>
                  <input id="address-postal" autoComplete="shipping postal-code" required minLength={3} maxLength={20}
                    value={address.postalCode} onChange={event => updateAddress("postalCode", event.target.value)} placeholder="Postal code" className="form-input" />
                </div>
              </div>
            )}
          </section>

          <div className="form-group form-checkbox" style={{ marginTop: 'var(--space-lg)' }}>
            <input type="checkbox" id="auth-whatsapp-opt-in" checked={whatsappOptIn}
              onChange={event => setWhatsappOptIn(event.target.checked)} />
            <label htmlFor="auth-whatsapp-opt-in" style={{ fontWeight: 400, cursor: 'pointer' }}>I&apos;d like to receive transactional order updates on WhatsApp. This is optional and can be changed later.</label>
          </div>
        </>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" disabled={busy} className="btn btn-primary btn-full btn-lg">
        {busy ? "Please wait…" : isRegister ? "Create your account" : "Sign in to your account"}
      </button>
      <p style={{ textAlign: 'center', color: 'var(--color-sage)', fontSize: '0.8125rem' }}>Your account details are transmitted securely.</p>
    </form>
  );
}