import type { Metadata } from "next";

import { SettingsForm } from "@/components/admin/settings-form";
import { requireAdmin } from "@/lib/auth/session";
import { emailStatus } from "@/lib/email/config";
import { razorpayStatus } from "@/lib/payments/razorpay";
import { getFreshSettings } from "@/lib/settings/store";

export const metadata: Metadata = { title: "Settings" };

/** Store details, order emails, shipping, payment status and the admin's own account. */
export default async function AdminSettingsPage() {
  const user = await requireAdmin("/admin/settings");
  const settings = await getFreshSettings();

  return (
    <SettingsForm
      settings={settings}
      adminName={user.name?.trim() ?? ""}
      adminEmail={user.email ?? ""}
      razorpay={razorpayStatus()}
      email={emailStatus()}
    />
  );
}
