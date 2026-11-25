"use client";

import { FormEvent, useState } from "react";

type Labels = Record<string, string>;

export function PasswordRecoveryForm({ mode, token = "", labels = {} }: { mode: "request" | "reset"; token?: string; labels?: Labels }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const t = (key: string, fallback: string) => labels[key] ?? fallback;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (mode === "reset" && password !== confirm) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(mode === "request" ? "/api/auth/forgot-password" : "/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "request" ? { email } : { token, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to continue.");
      setMessage(data.message ?? "Your password has been updated.");
      setEmail("");
      setPassword("");
      setConfirm("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      {mode === "request" ? (
        <div className="form-group">
          <label htmlFor="recovery-email" className="form-label">Email address <span className="required">*</span></label>
          <input id="recovery-email" type="email" required maxLength={254} autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" className="form-input" />
        </div>
      ) : (
        <>
          <div className="form-group">
            <label htmlFor="recovery-password" className="form-label">New password <span className="required">*</span></label>
            <input id="recovery-password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 12 characters" className="form-input" />
            <small className="form-hint">Use at least 12 characters.</small>
          </div>
          <div className="form-group">
            <label htmlFor="recovery-confirm" className="form-label">Confirm new password <span className="required">*</span></label>
            <input id="recovery-confirm" type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} placeholder="Enter your password again" className="form-input" />
          </div>
        </>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="alert alert-success" role="status">{message}</p>}
      <button type="submit" disabled={busy || (mode === "reset" && !token)} className="btn btn-primary btn-full btn-lg">
        {busy ? "Please wait…" : mode === "request" ? t("auth.sendResetLink","Send reset link") : t("auth.updatePassword","Update password")}
      </button>
    </form>
  );
}