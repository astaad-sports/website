import type { Metadata } from "next";

import { AdminHeader } from "@/components/admin/admin-header";
import { AdminSidebar, AdminTabBar } from "@/components/admin/admin-nav";
import { countOrdersByStatus } from "@/db/orders";
import { isAdmin } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Astaad admin" },
  robots: { index: false, follow: false },
};

/**
 * The admin frame: a dark sidebar on desktop, a header and bottom tabs on
 * phones. It only decides whether to draw the frame; every page and Server
 * Action checks for an admin itself, so signed-out visitors are sent to sign
 * in and everyone else gets a plain 404.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) return children;

  const counts = await countOrdersByStatus();
  const toShip = (counts.paid ?? 0) + (counts.confirmed ?? 0) + (counts.packed ?? 0);

  return (
    <div className="flex flex-1 bg-surface text-foreground">
      <AdminSidebar toShip={toShip} name={user.name?.trim() || "Admin"} email={user.email} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader />
        <div className="flex flex-1 flex-col">{children}</div>
        <AdminTabBar toShip={toShip} />
      </div>
    </div>
  );
}
