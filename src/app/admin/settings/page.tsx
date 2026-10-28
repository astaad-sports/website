import type { Metadata } from "next";

import { SettingsForm } from "@/components/admin/settings-form";
import { requireAdmin } from "@/lib/auth/session";
import { emailStatus } from "@/lib/email/config";
import { razorpayStatus } from "@/lib/payments/razorpay";
import { getFreshSettings } from "@/lib/settings/store";
import { loadWhatsAppStatus } from "@/lib/whatsapp/account";
import { templateStates } from "@/lib/whatsapp/manage";

export const metadata: Metadata = { title: "Settings" };

/** Store details, order emails, shipping, payment status and the admin's own account. */
export default async function AdminSettingsPage() {
  const user = await requireAdmin("/admin/settings");
  const [settings, whatsapp] = await Promise.all([getFreshSettings(), loadWhatsAppStatus()]);
  // Where each order template stands with Meta; null when Meta can't be asked just now.
  const templates = whatsapp.sending
    ? await templateStates().catch((error: unknown) => {
        console.error(`WhatsApp templates not read: ${error instanceof Error ? error.message : "unknown error"}`);
        return null;
      })
    : null;

  return (
    <SettingsForm
      settings={settings}
      adminName={user.name?.trim() ?? ""}
      adminEmail={user.email ?? ""}
      razorpay={razorpayStatus()}
      email={emailStatus()}
      whatsapp={whatsapp}
      whatsappTemplates={templates}
    />
  );
}
