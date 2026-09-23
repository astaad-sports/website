import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignInForm } from "@/components/auth/sign-in-form";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
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

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-surface-sunken">
        <div className="site-shell flex justify-center py-12 md:py-20">
          <SignInForm next={returnTo} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
