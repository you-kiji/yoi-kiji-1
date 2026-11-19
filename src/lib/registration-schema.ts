import { z } from "zod";

export const registrationAddressSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(7).max(20),
  line1: z.string().trim().min(3).max(180),
  line2: z.string().trim().max(180).optional().default(""),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().min(3).max(20),
  countryCode: z.string().trim().regex(/^[a-zA-Z]{2}$/).transform(value => value.toUpperCase()).default("IN"),
});

export const registrationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  password: z.string().min(12).max(128),
  whatsappOptIn: z.boolean().default(false),
  address: registrationAddressSchema.optional(),
});
