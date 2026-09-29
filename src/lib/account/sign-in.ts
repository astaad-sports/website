import "server-only";

import { adminAuth } from "@/lib/firebase/admin";

/**
 * The providers an account signs in with ("google.com", "password"), from
 * Firebase. Empty when Firebase cannot say, so the page just leaves them out.
 */
export async function getSignInProviders(firebaseUid: string): Promise<string[]> {
  try {
    const record = await adminAuth().getUser(firebaseUid);
    return record.providerData.map((provider) => provider.providerId);
  } catch (error) {
    console.error("Could not read the account's sign-in providers", error);
    return [];
  }
}
