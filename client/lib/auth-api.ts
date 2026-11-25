export class AuthApiError extends Error {
  constructor(message: string, readonly fieldErrors: Record<string, string> = {}, readonly resendAfter?: number) {
    super(message);
    this.name = "AuthApiError";
  }
}

export type Customer = { email: string };
export type PendingRegistration = { email: string; resendAfter: number };

async function readApiError(response: Response, fallbackMessage: string): Promise<AuthApiError> {
  try {
    const data = await response.json() as { errors?: unknown; error?: unknown; resend_after?: unknown };
    const fieldErrors = data.errors && typeof data.errors === "object"
      ? Object.fromEntries(Object.entries(data.errors).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
      : {};
    return new AuthApiError(
      typeof data.error === "string" ? data.error : fallbackMessage,
      fieldErrors,
      typeof data.resend_after === "number" ? data.resend_after : undefined,
    );
  } catch {
    return new AuthApiError("The authentication service returned an invalid response.");
  }
}

async function readCustomerResponse(response: Response, fallbackMessage: string): Promise<Customer> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new AuthApiError("The authentication service returned an invalid response.");
  }

  if (!response.ok) {
    const data = payload as { error?: unknown } | null;
    throw new AuthApiError(typeof data?.error === "string" ? data.error : fallbackMessage);
  }
  const customer = (payload as { customer?: unknown } | null)?.customer;
  if (!customer || typeof customer !== "object" || typeof (customer as { email?: unknown }).email !== "string") {
    throw new AuthApiError("The authentication service returned an invalid response.");
  }
  return { email: (customer as Customer).email };
}

export async function checkCustomerEmail(email: string): Promise<boolean> {
  let response: Response;
  try {
    response = await fetch("/api/auth/email-availability/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  } catch {
    throw new AuthApiError("Email availability could not be checked. Please try again.");
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new AuthApiError("The registration service returned an invalid response.");
  }

  if (!response.ok) {
    const data = payload as { errors?: unknown; error?: unknown } | null;
    const fieldErrors = data?.errors && typeof data.errors === "object"
      ? Object.fromEntries(Object.entries(data.errors).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
      : {};
    throw new AuthApiError(typeof data?.error === "string" ? data.error : "Email availability could not be checked.", fieldErrors);
  }

  if (!payload || typeof payload !== "object" || typeof (payload as { available?: unknown }).available !== "boolean") {
    throw new AuthApiError("The registration service returned an invalid response.");
  }
  return (payload as { available: boolean }).available;
}

export async function registerCustomer(email: string, password: string): Promise<PendingRegistration> {
  let response: Response;
  try {
    response = await fetch("/api/auth/register/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new AuthApiError("We could not reach the registration service. Please try again.");
  }

  if (!response.ok) throw await readApiError(response, "Please check your details and try again.");
  let payload: unknown;
  try { payload = await response.json(); }
  catch { throw new AuthApiError("The registration service returned an invalid response."); }
  const data = payload as { email?: unknown; resend_after?: unknown } | null;
  if (typeof data?.email !== "string" || typeof data.resend_after !== "number") {
    throw new AuthApiError("The registration service returned an invalid response.");
  }
  return { email: data.email, resendAfter: data.resend_after };
}

export async function verifyRegistration(code: string): Promise<Customer> {
  let response: Response;
  try {
    response = await fetch("/api/auth/verify-registration/", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }),
    });
  } catch { throw new AuthApiError("We could not reach the verification service. Please try again."); }
  if (!response.ok) throw await readApiError(response, "We could not verify that code.");
  return readCustomerResponse(response, "Email verification failed. Please try again.");
}

export async function resendRegistrationCode(): Promise<number> {
  let response: Response;
  try {
    response = await fetch("/api/auth/resend-registration-code/", { method: "POST" });
  } catch { throw new AuthApiError("We could not reach the email service. Please try again."); }
  if (!response.ok) throw await readApiError(response, "A new code could not be sent.");
  let payload: unknown;
  try { payload = await response.json(); }
  catch { throw new AuthApiError("The authentication service returned an invalid response."); }
  const resendAfter = (payload as { resend_after?: unknown } | null)?.resend_after;
  if (typeof resendAfter !== "number") throw new AuthApiError("The authentication service returned an invalid response.");
  return resendAfter;
}

export async function cancelRegistration(): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/auth/cancel-registration/", { method: "POST" });
  } catch { throw new AuthApiError("We could not cancel registration. Please try again."); }
  if (!response.ok) throw await readApiError(response, "We could not cancel registration.");
}

export async function getCurrentCustomer(): Promise<Customer | null> {
  let response: Response;
  try {
    response = await fetch("/api/auth/me/", { method: "GET", cache: "no-store" });
  } catch {
    throw new AuthApiError("The authentication service could not be reached.");
  }
  if (response.status === 401) return null;
  return readCustomerResponse(response, "Could not load your account.");
}

export async function loginCustomer(email: string, password: string): Promise<Customer> {
  let response: Response;
  try {
    response = await fetch("/api/auth/login/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new AuthApiError("The authentication service could not be reached.");
  }
  if (response.status >= 500) throw new AuthApiError("The authentication service is unavailable. Please try again.");
  return readCustomerResponse(response, response.status === 401 ? "Email or password is incorrect." : "Login failed. Please try again.");
}

export async function logoutCustomer(): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/auth/logout/", { method: "POST" });
  } catch {
    throw new AuthApiError("Logout failed. Please try again.");
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new AuthApiError("The authentication service returned an invalid response.");
  }
  if (!response.ok) {
    const data = payload as { error?: unknown } | null;
    throw new AuthApiError(typeof data?.error === "string" ? data.error : "Logout failed. Please try again.");
  }
}
