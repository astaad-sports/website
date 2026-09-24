import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { SignInForm } from "@/components/auth/sign-in-form";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { inAppBrowser } from "@/lib/auth/in-app-browser";
import { getCurrentUser, safeRedirectPath } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false },
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const returnTo = safeRedirectPath(next);

  // Already signed in: carry on to wherever they were going.
  if (await getCurrentUser()) redirect(returnTo);

  // Instagram's own browser (where shoppers from our posts land) can't do Google sign-in.
  const inApp = inAppBrowser((await headers()).get("user-agent"));

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-surface-sunken">
        <div className="site-shell flex justify-center py-12 md:py-20">
          <SignInForm next={returnTo} inApp={inApp} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
