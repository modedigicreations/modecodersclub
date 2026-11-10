"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [errorMessage, setErrorMessage] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (!token) {
      setErrorMessage("This reset link is invalid or has expired. Request a new one.");
      return;
    }

    const newPassword = String(new FormData(event.currentTarget).get("newPassword") ?? "");
    setPending(true);

    try {
      const result = await authClient.resetPassword({ newPassword, token });
      if (result.error) {
        setErrorMessage(result.error.message ?? "Couldn't reset your password. The link may have expired.");
        return;
      }
      router.replace("/login");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to reach Mode Coders Club. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Set a new password</h1>
        {!token ? (
          <p className="auth-error">This reset link is invalid or has expired. Request a new one from the sign-in page.</p>
        ) : (
          <form onSubmit={submit}>
            <div className="auth-field">
              <label htmlFor="newPassword">New password</label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
              />
            </div>
            {errorMessage && <p className="auth-error">{errorMessage}</p>}
            <button className="button button-primary auth-submit" type="submit" disabled={pending}>
              {pending ? "Saving…" : "Set password"}
            </button>
          </form>
        )}
        <p className="auth-footer-note">
          <a href="/login">Back to sign in</a>
        </p>
      </section>
    </main>
  );
}
