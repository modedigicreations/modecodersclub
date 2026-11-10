"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        setErrorMessage(result.error.message ?? "Sign-in failed. Check your email and password.");
        return;
      }

      const role = (result.data?.user as { role?: string } | undefined)?.role;
      const destination = role === "admin" ? "/admin" : role === "instructor" ? "/instructor" : "/dashboard";
      router.replace(destination);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to reach Mode Coders Club. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Sign in</h1>
        <p className="auth-subtitle">Welcome back to Mode Coders Club.</p>
        <form onSubmit={submit}>
          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <p className="auth-footer-note" style={{ marginTop: -8, marginBottom: 16, textAlign: "right" }}>
            <a href="/forgot-password">Forgot password?</a>
          </p>
          {errorMessage && <p className="auth-error">{errorMessage}</p>}
          <button className="button button-primary auth-submit" type="submit" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="auth-footer-note">
          New to the community? <a href="/register">Create an account</a>.
        </p>
      </section>
    </main>
  );
}
