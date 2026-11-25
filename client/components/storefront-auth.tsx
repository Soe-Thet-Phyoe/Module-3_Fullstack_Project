"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

import { Customer, getCurrentCustomer, logoutCustomer } from "@/lib/auth-api";

type StorefrontAuthValue = {
  customer: Customer | null;
  loading: boolean;
  setCustomer: (customer: Customer | null) => void;
  logout: () => Promise<void>;
};

const StorefrontAuthContext = createContext<StorefrontAuthValue | null>(null);
const guestAuth: StorefrontAuthValue = {
  customer: null,
  loading: false,
  setCustomer: () => undefined,
  logout: async () => undefined,
};

export function StorefrontAuthProvider({ children }: { children: React.ReactNode }) {
  const [customer, updateCustomer] = useState<Customer | null>(null);
  const sessionChanged = useRef(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getCurrentCustomer()
      .then((currentCustomer) => { if (active && !sessionChanged.current) updateCustomer(currentCustomer); })
      .catch(() => { if (active && !sessionChanged.current) updateCustomer(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function setCustomer(value: Customer | null) {
    sessionChanged.current = true;
    updateCustomer(value);
    setLoading(false);
  }

  async function logout() {
    await logoutCustomer();
    setCustomer(null);
  }

  return (
    <StorefrontAuthContext.Provider value={{ customer, loading, setCustomer, logout }}>
      {children}
    </StorefrontAuthContext.Provider>
  );
}

export function useStorefrontAuth() {
  const auth = useContext(StorefrontAuthContext);
  if (!auth) throw new Error("useStorefrontAuth must be used within StorefrontAuthProvider.");
  return auth;
}

export function useOptionalStorefrontAuth() {
  return useContext(StorefrontAuthContext) ?? guestAuth;
}
