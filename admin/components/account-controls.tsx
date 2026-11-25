"use client";

import { useEffect, useState } from "react";
import { CircleUserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { dashboardRequest } from "@/lib/dashboard-request";

export function AccountControls() {
  const [username, setUsername] = useState("Account");

  useEffect(() => {
    const controller = new AbortController();
    async function loadUsername() {
      try {
        const response = await dashboardRequest("/api/auth/session", { signal: controller.signal });
        if (!response.ok) return;
        const session = await response.json();
        if (!controller.signal.aborted && session.authenticated && typeof session.username === "string" && session.username) {
          setUsername(session.username);
        }
      } catch {
        // The account label remains available if the session lookup fails.
      }
    }
    void loadUsername();
    return () => controller.abort();
  }, []);

  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  async function signOut() {
    setSigningOut(true);
    setError("");
    try {
      const response = await dashboardRequest("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error();
      window.location.replace("/login");
    } catch {
      setError("Could not sign out. Please try again.");
      setSigningOut(false);
    }
  }

  return (
    <div className="relative flex min-w-0 max-w-[60%] items-center gap-1 sm:gap-3">
      <CircleUserRound aria-hidden="true" className="size-5 shrink-0 text-emerald-700" />
      <span title={username} className="truncate text-sm font-medium">{username}</span>
      <Button type="button" variant="ghost" className="shrink-0" disabled={signingOut} onClick={signOut}>
        {signingOut ? "Signing out..." : "Sign out"}
      </Button>
      {error && <p role="alert" className="absolute right-0 top-full z-10 w-max max-w-60 rounded-md border bg-white p-2 text-sm text-rose-700 shadow-sm">{error}</p>}
    </div>
  );
}
