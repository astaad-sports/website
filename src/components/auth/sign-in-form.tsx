"use client";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from "firebase/auth";
import { useEffect, useId, useState, useTransition, type FormEvent } from "react";

import { Eyebrow } from "@/components/storefront/eyebrow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSession } from "@/lib/auth/actions";
import { firebaseAuth, FirebaseNotConfiguredError } from "@/lib/firebase/client";

type Mode = "sign-in" | "sign-up";

const COPY: Record<Mode, { title: string; subtitle: string; submit: string }> = {
  "sign-in": {
    title: "Sign in",
    subtitle: "Welcome back to Astaad Sports.",
    submit: "Sign in",
  },
  "sign-up": {
    title: "Create account",
    subtitle: "Join Astaad Sports with your email or Google account.",
    submit: "Create account",
  },
};

/** Firebase error codes, in the store's voice. Null means say nothing (the customer cancelled). */
function authErrorMessage(error: unknown): string | null {
  if (error instanceof FirebaseNotConfiguredError) return error.message;
  const code = (error as { code?: string }).code;
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return null;
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "That email and password do not match. Try again or reset your password.";
    case "auth/email-already-in-use":
      return "An account already exists for this email. Sign in instead.";
    case "auth/weak-password":
    case "auth/password-does-not-meet-requirements":
      return "Choose a longer password: at least 6 characters.";
    case "auth/invalid-email":
    case "auth/missing-email":
      return "Enter a valid email address.";
    case "auth/missing-password":
      return "Enter your password.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact support for help.";
    case "auth/account-exists-with-different-credential":
      return "This email already uses a different sign-in method. Sign in that way first.";
    case "auth/popup-blocked":
      return "Your browser blocked the Google window. Allow pop-ups for this site and try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a minute and try again.";
    case "auth/network-request-failed":
      return "Check your connection and try again.";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled yet.";
    default:
      console.error(error);
      return "Something went wrong. Please try again.";
  }
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
    </svg>
  );
}

/**
 * Google and email sign-in. Firebase checks the credentials in the browser,
 * then the ID token goes to the `createSession` Server Action, which sets the
 * httpOnly session cookie and redirects to `next`.
 */
export function SignInForm({ next }: { next: string }) {
  const id = useId();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [auth, setAuth] = useState<Auth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Prepare Firebase up front so the Google pop-up opens straight from the
  // click; browsers block pop-ups that open after other async work.
  useEffect(() => {
    let active = true;
    firebaseAuth().then(
      (instance) => active && setAuth(instance),
      (reason) => active && setError(authErrorMessage(reason))
    );
    return () => {
      active = false;
    };
  }, []);

  const copy = COPY[mode];
  const disabled = !auth || pending;

  /**
   * Run a Firebase step. If it returns an ID token, exchange it for the
   * server session. That call stays outside the try: on success the action
   * redirects, which Next.js delivers as a rejection for its own redirect
   * boundary, so catching it here would swallow the navigation.
   */
  function run(task: (auth: Auth) => Promise<string | void>) {
    if (!auth) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      let idToken: string | void;
      try {
        idToken = await task(auth);
      } catch (reason) {
        setError(authErrorMessage(reason));
        return;
      }
      if (!idToken) return;

      const result = await createSession(idToken, next);
      if (result?.error) setError(result.error);
    });
  }

  /** Take the ID token and sign the browser out: the server session is the only session. */
  async function handOff(auth: Auth, user: User, refresh = false): Promise<string> {
    const idToken = await user.getIdToken(refresh);
    await signOut(auth);
    return idToken;
  }

  function continueWithGoogle() {
    run(async (auth) => {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const { user } = await signInWithPopup(auth, provider);
      return handOff(auth, user);
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();

    run(async (auth) => {
      if (mode === "sign-in") {
        const { user } = await signInWithEmailAndPassword(auth, email, password);
        return handOff(auth, user);
      }

      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      if (name) await updateProfile(user, { displayName: name });
      // A failed verification email should not block the new account.
      await sendEmailVerification(user).catch(() => undefined);
      // Refresh so the token carries the name just set.
      return handOff(auth, user, Boolean(name));
    });
  }

  function resetPassword(email: string) {
    if (!email) {
      setNotice(null);
      setError("Enter your email above, then choose Forgot password.");
      return;
    }
    run(async (auth) => {
      await sendPasswordResetEmail(auth, email);
      setNotice(`If an account exists for ${email}, a reset link is on its way.`);
    });
  }

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setError(null);
    setNotice(null);
  }

  return (
    <div className="flex w-full max-w-[440px] flex-col gap-8 rounded-md border border-border bg-surface-raised p-6 shadow-card md:p-10">
      <div className="flex flex-col gap-3">
        <Eyebrow bar>Your account</Eyebrow>
        <h1 className="type-heading-xl">{copy.title}</h1>
        <p className="type-body text-ink-muted">{copy.subtitle}</p>
      </div>

      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={continueWithGoogle}
        disabled={disabled}
      >
        <GoogleMark />
        Continue with Google
      </Button>

      <div className="flex items-center gap-4 type-body-sm text-ink-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={submit} className="flex flex-col gap-5" aria-busy={pending}>
        {mode === "sign-up" && (
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-name`}>Full name</Label>
            <Input id={`${id}-name`} name="name" autoComplete="name" />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-email`}>Email</Label>
          <Input id={`${id}-email`} name="email" type="email" autoComplete="email" required />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor={`${id}-password`}>Password</Label>
            {mode === "sign-in" && (
              <Button
                type="button"
                variant="link"
                size="xs"
                className="min-h-0 px-0 py-0 text-ink-muted"
                disabled={disabled}
                onClick={(event) => {
                  const email = event.currentTarget.form?.elements.namedItem("email");
                  resetPassword(email instanceof HTMLInputElement ? email.value.trim() : "");
                }}
              >
                Forgot password?
              </Button>
            )}
          </div>
          <Input
            id={`${id}-password`}
            name="password"
            type="password"
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            minLength={mode === "sign-up" ? 6 : undefined}
            aria-describedby={mode === "sign-up" ? `${id}-password-hint` : undefined}
            required
          />
          {mode === "sign-up" && (
            <p id={`${id}-password-hint`} className="type-body-sm text-ink-muted">
              At least 6 characters.
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="type-body-sm text-danger">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="type-body-sm text-success">
            {notice}
          </p>
        )}

        <Button type="submit" size="lg" disabled={disabled}>
          {pending ? "Please wait…" : copy.submit}
        </Button>
      </form>

      <p className="type-body-sm text-ink-muted">
        {mode === "sign-in" ? "New to Astaad? " : "Already have an account? "}
        <button
          type="button"
          className="cursor-pointer font-semibold text-foreground underline underline-offset-4"
          onClick={() => switchMode(mode === "sign-in" ? "sign-up" : "sign-in")}
        >
          {mode === "sign-in" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </div>
  );
}
