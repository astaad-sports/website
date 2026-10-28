"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { WhatsAppStatus } from "@/lib/whatsapp/config";
import type { TemplateState } from "@/lib/whatsapp/manage";
import { finishWhatsAppSignup, retryWhatsAppSetup, submitWhatsAppTemplates } from "@/lib/whatsapp/signup-actions";

import { Note } from "./settings-payment";

const SDK_URL = "https://connect.facebook.net/en_US/sdk.js";

interface FacebookSdk {
  init(options: { appId: string; autoLogAppEvents: boolean; xfbml: boolean; version: string }): void;
  login(callback: (response: { authResponse?: { code?: string } | null }) => void, options: Record<string, unknown>): void;
}

declare global {
  interface Window {
    FB?: FacebookSdk;
    fbAsyncInit?: () => void;
  }
}

let sdk: Promise<FacebookSdk> | undefined;

/** Meta's JavaScript SDK, loaded and set up for the store's app on the first Connect. A load that fails can be tried again. */
function loadSdk(appId: string, version: string): Promise<FacebookSdk> {
  sdk ??= new Promise<FacebookSdk>((resolve, reject) => {
    window.fbAsyncInit = () => {
      window.FB!.init({ appId, autoLogAppEvents: true, xfbml: false, version });
      resolve(window.FB!);
    };
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onerror = () => {
      sdk = undefined;
      script.remove();
      reject(new Error("Meta's sign-in didn't load. Check the connection, or turn off an ad blocker, and try again."));
    };
    document.body.appendChild(script);
  });
  return sdk;
}

/** What Meta's signup window says about itself, through postMessage. */
interface SignupSession {
  wabaId: string;
  phoneNumberId: string;
}

const TEMPLATE_STATUS: Record<string, string> = {
  APPROVED: "Approved",
  PENDING: "In review",
  REJECTED: "Rejected",
  PAUSED: "Paused",
  DISABLED: "Disabled",
};

/**
 * Connect WhatsApp: runs Meta's Embedded Signup for the store's own number,
 * which stays on the WhatsApp Business app, then hands what Meta gave to the
 * server to finish (finishWhatsAppSignup). Once connected: a retry for a
 * step that failed, and the message templates with Submit for review.
 */
export function WhatsAppConnect({ status, templates }: { status: WhatsAppStatus; templates: TemplateState[] | null }) {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const session = useRef<SignupSession | null>(null);

  // Meta's window posts the ids of the account and number it connected, usually before the login callback.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (!/(^|\.)facebook\.com$/.test(new URL(event.origin).hostname)) return;
      try {
        const data = JSON.parse(String(event.data)) as {
          type?: string;
          event?: string;
          data?: { waba_id?: string; phone_number_id?: string; current_step?: string; error_message?: string };
        };
        if (data.type !== "WA_EMBEDDED_SIGNUP") return;
        if (data.event?.startsWith("FINISH") && data.data?.waba_id && data.data.phone_number_id) {
          session.current = { wabaId: data.data.waba_id, phoneNumberId: data.data.phone_number_id };
        } else if (data.event === "CANCEL") {
          setResult({
            ok: false,
            text: data.data?.error_message ?? "The signup was closed before it finished. Nothing was connected.",
          });
        }
      } catch {
        // Another of Meta's messages, not the signup's.
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  /** The ids from Meta's window, waiting a few seconds for them: the code is good for only 30. */
  async function signupSession(): Promise<SignupSession | null> {
    for (let waited = 0; !session.current && waited < 5000; waited += 250) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return session.current;
  }

  async function connect() {
    if (!status.signup) return;
    setResult(null);
    setBusy(true);
    session.current = null;
    let FB: FacebookSdk;
    try {
      FB = await loadSdk(status.signup.appId, status.signup.graphVersion);
    } catch (error) {
      setBusy(false);
      setResult({ ok: false, text: error instanceof Error ? error.message : "Meta's sign-in didn't load." });
      return;
    }
    FB.login(
      (response) => {
        const code = response.authResponse?.code;
        if (!code) {
          setBusy(false);
          return;
        }
        void (async () => {
          const ids = await signupSession();
          if (!ids) {
            setBusy(false);
            setResult({ ok: false, text: "Meta didn't say which number was connected. Try again." });
            return;
          }
          const finished = await finishWhatsAppSignup({ code, businessAccountId: ids.wabaId, phoneNumberId: ids.phoneNumberId });
          setBusy(false);
          setResult(finished.ok ? { ok: true, text: finished.message } : { ok: false, text: finished.error });
        })();
      },
      {
        config_id: status.signup.configId,
        response_type: "code",
        override_default_response_type: true,
        // The number stays on the WhatsApp Business app (Meta's coexistence).
        extras: { setup: {}, featureType: "whatsapp_business_app_onboarding", sessionInfoVersion: "3" },
      }
    );
  }

  function run(action: () => Promise<{ ok: true; message: string } | { ok: false; error: string }>) {
    setResult(null);
    startTransition(async () => {
      const done = await action();
      setResult(done.ok ? { ok: true, text: done.message } : { ok: false, text: done.error });
    });
  }

  const { connected } = status;
  const working = busy || pending;

  return (
    <div className="flex flex-col gap-2 pt-1">
      {connected ? (
        <>
          <Note>
            Connected{connected.displayNumber ? ` ${connected.displayNumber}` : ""} on{" "}
            {connected.connectedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.
            {connected.synced ? " Chats and contacts were synced from the Business app." : ""}
          </Note>
          {connected.error && (
            <>
              <Note className="text-danger">A step after connecting failed: {connected.error}</Note>
              <Button type="button" variant="outline" className="self-start" disabled={working} onClick={() => run(retryWhatsAppSetup)}>
                Try again
              </Button>
            </>
          )}
        </>
      ) : (
        <Note>
          Connect the store&apos;s number with Meta. It stays on the WhatsApp Business app on your phone. Keep the app
          open while you connect: Meta sends a message there to confirm.
        </Note>
      )}
      {status.signup ? (
        <Button type="button" variant={connected ? "outline" : "default"} className="self-start" disabled={working} onClick={() => void connect()}>
          {busy ? "Connecting…" : connected ? "Connect again" : "Connect WhatsApp"}
        </Button>
      ) : (
        !status.fromEnv && (
          <Note>
            Connect WhatsApp needs <code>NEXT_PUBLIC_META_APP_ID</code>, <code>NEXT_PUBLIC_WHATSAPP_SIGNUP_CONFIG_ID</code>{" "}
            and <code>WHATSAPP_APP_SECRET</code> in the site&apos;s environment variables.
          </Note>
        )
      )}

      {status.sending && (
        <div className="flex flex-col gap-1 pt-2">
          <span className="text-[13px] leading-[18px] font-semibold">Message templates</span>
          {templates ? (
            <ul className="flex flex-col text-[13px] leading-[18px] text-ink-muted">
              {templates.map((template) => (
                <li key={template.name}>
                  {template.name}:{" "}
                  <span className={template.status === "APPROVED" ? "text-success" : template.status === "REJECTED" ? "text-danger" : ""}>
                    {template.status ? (TEMPLATE_STATUS[template.status] ?? template.status) : "Not submitted"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Note>Couldn&apos;t read them from Meta just now.</Note>
          )}
          {(!templates || templates.some((template) => template.status === null)) && (
            <Button type="button" variant="outline" className="self-start" disabled={working} onClick={() => run(submitWhatsAppTemplates)}>
              Submit for review
            </Button>
          )}
        </div>
      )}

      {result && (
        <p role="status" className={result.ok ? "type-body-sm text-success" : "type-body-sm text-danger"}>
          {result.text}
        </p>
      )}
    </div>
  );
}
