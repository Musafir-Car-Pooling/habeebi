import { z } from "zod";

export const UAE_CODE = "+971";
export const HELPLINE = "+971 55 915 4785";
export const genderSchema = z.enum(["male", "female", "other", "prefer_not_to_say"]);
export const mobileSchema = z.string().regex(/^5[024568]\d{7}$/);
export const detailsSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: mobileSchema,
  gender: genderSchema,
});
export const signupSchema = detailsSchema.extend({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(128),
});
export function mobileDigits(phone: string) {
  return phone.replace(/^\+971/, "").replace(/\D/g, "").replace(/^0/, "").slice(0, 9);
}
export function canDeleteRequest(status: string, owner: string, user: string) {
  return status === "cancelled" && owner === user;
}
export function audioExtension(type: string) {
  if (type.includes("mp4")) return "m4a";
  if (type.includes("ogg")) return "ogg";
  return "webm";
}