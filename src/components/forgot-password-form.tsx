"use client";

import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [errorMessage, setErrorMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setPending(true);

    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();

    try {
      await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
      // Always show the same confirmation whether or not the account exists
      // — Better Auth itself never reveals this either, to avoid leaking
      // which emails have accounts.
      setSent(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to reach Mode Coders Club. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Reset your password</h1>
        {sent ? (
          <p className="auth-subtitle">
            If an account exists for that email, we&rsquo;ve sent a link to set a new password.
          </p>
        ) : (
          <>
            <p className="auth-subtitle">Enter your email and we&rsquo;ll send you a reset link.</p>
            <form onSubmit={submit}>
              <div className="auth-field">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              {errorMessage && <p className="auth-error">{errorMessage}</p>}
              <button className="button button-primary auth-submit" type="submit" disabled={pending}>
                {pending ? "Sending…" : "Send reset link"}
              </button>
            </form>
          </>
        )}
        <p className="auth-footer-note">
          <a href="/login">Back to sign in</a>
        </p>
      </section>
    </main>
  );
}
