"use server";

import { refresh } from "next/cache";

import { updateUserProfile } from "@/db/users";
import { getCurrentUser } from "@/lib/auth/session";

import { parseProfileForm, type ProfileFieldErrors, type ProfileValues } from "./model";

export interface ProfileState {
  /** What was saved, once it has been. */
  saved?: ProfileValues;
  error?: string;
  fieldErrors?: ProfileFieldErrors;
}

/** Save the name and mobile number from the account page. Field names: name, phone. */
export async function updateProfile(_previous: ProfileState, form: FormData): Promise<ProfileState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Your session has ended. Sign in again to change your details." };

  const parsed = parseProfileForm(form);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };

  await updateUserProfile(user.id, parsed.values);
  refresh();
  return { saved: parsed.values };
}
