import { redirect } from "next/navigation";

/**
 * The footer's "Track Order". Every order belongs to an account, and the
 * account page lists them with their Trackon AWBs, so send the customer
 * there (signing in first if needed).
 */
export default function TrackOrderPage() {
  redirect("/account");
}
