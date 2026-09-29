"use client";

import { sendPasswordResetEmail } from "firebase/auth";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { firebaseAuth } from "@/lib/firebase/client";

/**
 * Emails the customer a link to choose a new password, as "Forgot password?"
 * does at sign-in. For accounts that sign in with an email and password.
 */
export function ChangePassword({ email }: { email: string }) {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function send() {
    setError(null);
    startTransition(async () => {
      try {
        await sendPasswordResetEmail(await firebaseAuth(), email);
        setSent(true);
      } catch (reason) {
        const code = (reason as { code?: string }).code;
        setError(
          code === "auth/too-many-requests"
            ? "Too many attempts. Wait a minute and try again."
            : "We could not send the email. Check your connection and try again."
        );
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button type="button" variant="outline" disabled={pending || sent} onClick={send}>
        {pending ? "Sending…" : "Change password"}
      </Button>
      {sent && (
        <p role="status" className="type-body-sm text-success">
          We have emailed a link to {email}. Open it to choose a new password.
        </p>
      )}
      {error && (
        <p role="alert" className="type-body-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
