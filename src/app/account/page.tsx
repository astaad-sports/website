import type { Metadata } from "next";

import { Eyebrow } from "@/components/storefront/eyebrow";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false },
};

const memberSince = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" });

export default async function AccountPage() {
  const user = await requireUser("/account");
  const firstName = user.name?.split(" ")[0];

  const details = [
    { label: "Name", value: user.name ?? "Not added" },
    {
      label: "Email",
      value: user.email ?? "Not added",
      status: user.email
        ? user.emailVerified
          ? { text: "Verified", className: "text-success" }
          : { text: "Not verified", className: "text-ink-muted" }
        : undefined,
    },
    { label: "Phone", value: user.phone ?? "Not added" },
    { label: "Member since", value: memberSince.format(user.createdAt) },
  ];

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-surface-sunken">
        <div className="site-shell flex flex-col gap-8 py-12 md:py-20">
          <div className="flex flex-col gap-3">
            <Eyebrow bar>Your account</Eyebrow>
            <h1 className="type-heading-xl">{firstName ? `Hello, ${firstName}` : "Your account"}</h1>
            {user.email && <p className="type-body text-ink-muted">Signed in as {user.email}</p>}
          </div>

          <section
            aria-labelledby="account-details"
            className="flex max-w-[640px] flex-col rounded-md border border-border bg-surface-raised shadow-card"
          >
            <h2 id="account-details" className="type-heading-sm border-b border-border px-6 py-4">
              Account details
            </h2>
            <dl className="flex flex-col">
              {details.map((row) => (
                <div
                  key={row.label}
                  className="flex flex-col gap-1 border-b border-border px-6 py-4 last:border-b-0 sm:flex-row sm:items-center sm:gap-6"
                >
                  <dt className="type-body-sm text-ink-muted sm:w-36 sm:shrink-0">{row.label}</dt>
                  <dd className="type-body flex flex-wrap items-center gap-x-3 break-all">
                    {row.value}
                    {row.status && (
                      <span className={`type-body-sm font-semibold ${row.status.className}`}>
                        {row.status.text}
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <form action={signOut}>
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
