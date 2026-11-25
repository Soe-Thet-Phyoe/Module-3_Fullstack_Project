"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dashboardRequest } from "@/lib/dashboard-request";

export default function LoginPage() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const fields = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const status = await fetch("/api/auth/session", { cache: "no-store" });
      if (!status.ok) throw new Error();
      const response = await dashboardRequest("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: fields.get("username"), password: fields.get("password") }),
      });
      if (response.status === 401) {
        setError("Invalid username or password.");
        return;
      }
      if (!response.ok) throw new Error();
      const next = new URLSearchParams(window.location.search).get("next") ?? "/";
      window.location.replace(["/", "/categories", "/products", "/orders"].includes(next) ? next : "/");
    } catch {
      setError("Sign-in is unavailable. Please try again.");
    } finally {
      setPending(false);
    }
  }
  return <main className="grid min-h-dvh place-items-center bg-slate-50 p-5">
    <form onSubmit={signIn} className="w-full max-w-sm space-y-5 rounded-2xl border bg-white p-7 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Admin sign-in</h1>
      <label className="block space-y-2"><span>Username</span>
        <Input name="username" autoComplete="username" required />
      </label>
      <label className="block space-y-2"><span>Password</span>
        <Input name="password" type="password" autoComplete="current-password" required />
      </label>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</Button>
    </form>
  </main>;
}

