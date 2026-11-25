"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, MailCheck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { StorefrontShell } from "@/components/storefront-shell";
import { useStorefrontAuth } from "@/components/storefront-auth";
import { Button } from "@/components/ui/button";
import { AuthApiError, cancelRegistration, checkCustomerEmail, registerCustomer, resendRegistrationCode, verifyRegistration } from "@/lib/auth-api";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export default function RegisterPage() {
  const router = useRouter();
  const { setCustomer } = useStorefrontAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [codeSubmitting, setCodeSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [cancelError, setCancelError] = useState("");
  const emailCheckSequence = useRef(0);
  const emailCheckPending = useRef(false);
  const passwordMismatch = Boolean(confirmPassword && password !== confirmPassword);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  async function checkEmail(emailToCheck: string) {
    const sequence = ++emailCheckSequence.current;
    setEmailError("");
    setEmailAvailable(null);
    setFormError("");
    emailCheckPending.current = false;

    if (!emailToCheck.trim()) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToCheck.trim())) {
      setEmailError("Enter a valid email address.");
      return;
    }

    setEmailChecking(true);
    emailCheckPending.current = true;
    try {
      const available = await checkCustomerEmail(emailToCheck);
      if (sequence !== emailCheckSequence.current) return;
      setEmailAvailable(available);
      if (!available) setEmailError("This email is already registered.");
    } catch {
      if (sequence !== emailCheckSequence.current) return;
    } finally {
      if (sequence === emailCheckSequence.current) {
        emailCheckPending.current = false;
        setEmailChecking(false);
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailError("");
    setPasswordError("");
    setFormError("");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError(email.trim() ? "Enter a valid email address." : "Enter your email address.");
      return;
    }
    if (emailCheckPending.current) {
      setFormError("Please wait while we check your email.");
      return;
    }
    if (!confirmPassword || passwordMismatch || emailAvailable === false) return;

    setSubmitting(true);
    try {
      const pending = await registerCustomer(email, password);
      setPendingEmail(pending.email);
      setResendSeconds(pending.resendAfter);
      setCode("");
      setCodeError("");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      if (error instanceof AuthApiError) {
        setEmailError(error.fieldErrors.email ?? "");
        setPasswordError(error.fieldErrors.password ?? "");
        if (!error.fieldErrors.email && !error.fieldErrors.password) setFormError(error.message);
      } else {
        setFormError("Registration failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCodeError("");
    if (!/^\d{6}$/.test(code)) {
      setCodeError("Enter all six digits from the email.");
      return;
    }
    setCodeSubmitting(true);
    try {
      const customer = await verifyRegistration(code);
      setCustomer(customer);
      setPendingEmail(null);
      toast.success("Email verified. Your account is ready.");
      router.push("/");
    } catch (error) {
      setCodeError(error instanceof AuthApiError ? error.message : "We could not verify that code. Please try again.");
    } finally {
      setCodeSubmitting(false);
    }
  }

  async function handleResend() {
    setCodeError("");
    setResending(true);
    try {
      setResendSeconds(await resendRegistrationCode());
    } catch (error) {
      if (error instanceof AuthApiError) {
        setCodeError(error.message);
        if (error.resendAfter) setResendSeconds(error.resendAfter);
      } else {
        setCodeError("A new code could not be sent. Please try again.");
      }
    } finally {
      setResending(false);
    }
  }

  async function handleCancel() {
    setCancelError("");
    try {
      await cancelRegistration();
      setPendingEmail(null);
      setCode("");
      setFormError("Registration was cancelled. Enter your details to start again.");
    } catch (error) {
      setCancelError(error instanceof Error ? error.message : "We could not cancel registration. Please try again.");
    }
  }

  return (
    <StorefrontShell>
      <main className="register-page">
        <section className="register-card" aria-labelledby="register-heading">
          <span className="eyebrow section-eyebrow">JOIN M-3 COMMERCE</span>
          <h1 id="register-heading">Create your account</h1>
          <p className="register-intro">Save your details and make finding your next favorite easier.</p>
          <form className="register-form" onSubmit={handleSubmit} noValidate>
              <div className="register-field">
                <label htmlFor="register-email">Email</label>
                <input id="register-email" name="email" type="email" autoComplete="email" required value={email}
                  aria-invalid={Boolean(emailError)} aria-describedby={emailError ? "register-email-error" : undefined}
                  onChange={(event) => { emailCheckSequence.current += 1; emailCheckPending.current = false; setEmail(event.target.value); setEmailError(""); setEmailAvailable(null); setEmailChecking(false); setFormError(""); }}
                  onBlur={(event) => { void checkEmail(event.currentTarget.value); }} />
                {emailError && <p className="register-field-error" id="register-email-error">{emailError}</p>}
                {emailChecking && <p className="register-field-hint" role="status">Checking email…</p>}
              </div>
              <div className="register-field">
                <label htmlFor="register-password">Password</label>
                <input id="register-password" name="password" type="password" autoComplete="new-password" required value={password}
                  aria-invalid={Boolean(passwordError || passwordMismatch)} aria-describedby={passwordError || passwordMismatch ? "register-password-error" : undefined}
                  onChange={(event) => { setPassword(event.target.value); setPasswordError(""); }} />
              </div>
              <div className="register-field">
                <label htmlFor="register-confirm-password">Confirm password</label>
                <input id="register-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" required value={confirmPassword}
                  aria-invalid={Boolean(passwordError || passwordMismatch)} aria-describedby={passwordError || passwordMismatch ? "register-password-error" : undefined}
                  onChange={(event) => { setConfirmPassword(event.target.value); setPasswordError(""); }} />
                {(passwordError || passwordMismatch) && <p className="register-field-error" id="register-password-error">{passwordError || "Passwords do not match."}</p>}
              </div>
              {formError && <p className="register-form-error" role="alert">{formError}</p>}
              <Button className="register-submit" type="submit" disabled={submitting || emailAvailable === false || passwordMismatch}>
                {submitting ? "Creating account…" : "Create account"}
              </Button>
              <p className="auth-switch">
                Already have an account? <Link href="/login">Log in</Link>
              </p>
          </form>
        </section>
      </main>
      <Dialog open={Boolean(pendingEmail)} onOpenChange={() => undefined} disablePointerDismissal>
        <DialogContent className="otp-modal" showCloseButton={false} aria-describedby="otp-description">
          <div className="otp-icon"><MailCheck aria-hidden="true" size={25} /></div>
          <span className="eyebrow section-eyebrow otp-eyebrow">ONE LAST STEP</span>
          <DialogTitle className="otp-title">Verify your email</DialogTitle>
          <DialogDescription id="otp-description" className="otp-description">
            We sent a six-digit code to <strong>{pendingEmail}</strong>. Enter it below to finish creating your account.
          </DialogDescription>
          <form className="otp-form" onSubmit={handleVerify}>
            <label htmlFor="registration-code">Verification code</label>
            <input
              id="registration-code"
              name="code"
              className="otp-code-input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              aria-label="6-digit verification code"
              aria-invalid={Boolean(codeError)}
              aria-describedby={codeError ? "otp-code-error" : undefined}
              onChange={(event) => { setCode(event.target.value.replace(/\D/g, "").slice(0, 6)); setCodeError(""); }}
              autoFocus
            />
            {codeError && <p id="otp-code-error" className="register-field-error" role="alert">{codeError}</p>}
            <Button className="otp-submit" type="submit" disabled={codeSubmitting || code.length !== 6}>
              <ShieldCheck aria-hidden="true" size={17} />{codeSubmitting ? "Verifying…" : "Verify email"}
            </Button>
          </form>
          <p className="otp-resend-row">
            Didn’t receive it?{" "}
            <button type="button" className="otp-text-button" onClick={() => void handleResend()} disabled={resending || resendSeconds > 0}>
              {resending ? "Sending…" : resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend code"}
            </button>
          </p>
          {cancelError && <p className="register-form-error" role="alert">{cancelError}</p>}
          <DialogClose render={<button type="button" className="otp-cancel" onClick={() => void handleCancel()}><ArrowLeft aria-hidden="true" size={15} /> Cancel registration</button>} />
        </DialogContent>
      </Dialog>
    </StorefrontShell>
  );
}
