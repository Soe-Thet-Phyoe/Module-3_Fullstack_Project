"use client";

import Link from "next/link";
import { Suspense, type FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { StorefrontShell } from "@/components/storefront-shell";
import { useStorefrontAuth } from "@/components/storefront-auth";
import { Button } from "@/components/ui/button";
import { AuthApiError, loginCustomer } from "@/lib/auth-api";

import { safeReturnPath } from "@/lib/login-navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setCustomer } = useStorefrontAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const customer = await loginCustomer(email.trim(), password);
      setCustomer(customer);
      router.push(safeReturnPath(searchParams.get("next")));
    } catch (loginError) {
      setError(loginError instanceof AuthApiError || loginError instanceof Error
        ? loginError.message
        : "Login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <StorefrontShell>
      <main className="register-page">
        <section className="register-card" aria-labelledby="login-title">
          <p className="register-eyebrow">Welcome back</p>
          <h1 id="login-title">Login</h1>
          <p className="register-intro">Sign in to your M-3 Commerce account.</p>
          <form className="register-form" onSubmit={(event) => void handleSubmit(event)}>
            <div className="register-field">
              <label htmlFor="login-email">Email</label>
              <input id="login-email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div className="register-field">
              <label htmlFor="login-password">Password</label>
              <input id="login-password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
            </div>
            {error && <p className="register-form-error" role="alert">{error}</p>}
            <Button className="register-submit" type="submit" disabled={submitting}>
              {submitting ? "Logging in…" : "Login"}
            </Button>
            <p className="auth-switch">
              Don’t have an account? <Link href="/register">Register</Link>
            </p>
          </form>
        </section>
      </main>
    </StorefrontShell>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div className="register-page" aria-busy="true" />}><LoginForm /></Suspense>;
}
