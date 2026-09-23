// Checkout input, shared by the form (field rules) and the server (validation).
import { z } from "zod";

import { cartItemSchema, MAX_LINES } from "./cart";

/** The 28 states and 8 union territories, as a courier expects them. */
export const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

/** Keep the ten digits of an Indian mobile number: drops spaces, dashes, +91 and a leading 0. */
export function normalisePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

export const addressSchema = z.object({
  name: z.string().trim().min(2, "Enter the recipient's full name.").max(80),
  phone: z
    .string()
    .transform(normalisePhone)
    .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit mobile number.")),
  line1: z.string().trim().min(3, "Enter the house number and street.").max(120),
  line2: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => value || undefined),
  city: z.string().trim().min(2, "Enter the town or city.").max(60),
  state: z.enum(INDIAN_STATES, { error: "Choose a state." }),
  pincode: z
    .string()
    .trim()
    .regex(/^[1-9]\d{5}$/, "Enter a 6-digit PIN code."),
});

export type ShippingAddress = z.infer<typeof addressSchema>;
export type AddressField = keyof ShippingAddress;

export const placeOrderSchema = z.object({
  items: z.array(cartItemSchema).min(1).max(MAX_LINES),
  address: addressSchema,
});

export const paymentResponseSchema = z.object({
  razorpay_order_id: z.string().min(1).max(64),
  razorpay_payment_id: z.string().min(1).max(64),
  razorpay_signature: z.string().min(1).max(256),
});
