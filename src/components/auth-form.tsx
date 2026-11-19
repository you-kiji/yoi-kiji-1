"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

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
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const isRegister = mode === "register";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const response = await fetch(`/api/auth/${isRegister ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
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
    <form className="auth-form premium-form" onSubmit={submit} noValidate={false}>
      {isRegister && (
        <label htmlFor="auth-name">
          <span>Full name</span>
          <input
            id="auth-name"
            name="name"
            type="text"
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
            placeholder="Your full name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
      )}

      <label htmlFor="auth-email">
        <span>Email address</span>
        <input
          id="auth-email"
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      <label htmlFor="auth-password">
        <span>Password</span>
        <input
          id="auth-password"
          name="password"
          type="password"
          required
          minLength={isRegister ? 12 : 1}
          maxLength={128}
          autoComplete={isRegister ? "new-password" : "current-password"}
          placeholder={isRegister ? "At least 12 characters" : "Enter your password"}
          aria-describedby={isRegister ? "auth-password-hint" : undefined}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {isRegister && (
          <small id="auth-password-hint" className="field-hint">
            Use at least 12 characters for a stronger password.
          </small>
        )}
      </label>

      {error && <p className="form-error" role="alert">{error}</p>}

      <button className="primary-link auth-submit" type="submit" disabled={busy}>
        {busy ? "Please wait…" : isRegister ? "Create your account" : "Sign in to your account"}
      </button>

      <p className="form-security-note">
        Your account details are transmitted securely.
      </p>
    </form>
  );
}
