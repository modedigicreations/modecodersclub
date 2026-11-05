"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

export function RegisterForm() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const result = await authClient.signUp.email({ name, email, password });
      if (result.error) {
        setErrorMessage(result.error.message ?? "Could not create your account. Please try again.");
        return;
      }

      router.replace("/community");
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
        <h1>Create a community account</h1>
        <p className="auth-subtitle">
          For posting in the weekly discussion sessions. No account needed just to browse courses.
        </p>
        <form onSubmit={submit}>
          <div className="auth-field">
            <label htmlFor="name">Name</label>
            <input id="name" name="name" type="text" autoComplete="name" required minLength={2} maxLength={100} />
          </div>
          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
            />
          </div>
          {errorMessage && <p className="auth-error">{errorMessage}</p>}
          <button className="button button-primary auth-submit" type="submit" disabled={pending}>
            {pending ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="auth-footer-note">
          Already have an account? <a href="/login">Sign in</a>.
        </p>
      </section>
    </main>
  );
}
