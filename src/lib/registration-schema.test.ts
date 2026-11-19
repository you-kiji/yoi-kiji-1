import { describe, expect, it } from "vitest";
import { registrationSchema } from "@/lib/registration-schema";

const validProfile = {
  name: "Aiko Tanaka",
  email: "  AIKO@example.com ",
  password: "a-secure-password-123",
};

const validAddress = {
  fullName: "Aiko Tanaka",
  phone: "+91 98765 43210",
  line1: "12 Sakura Road",
  line2: "Near the garden",
  city: "Jaipur",
  state: "Rajasthan",
  postalCode: "302019",
  countryCode: "in",
};

describe("customer registration schema", () => {
  it("normalizes email and country code and accepts the full customer profile", () => {
    const result = registrationSchema.parse({
      ...validProfile,
      whatsappOptIn: true,
      address: validAddress,
    });

    expect(result.email).toBe("aiko@example.com");
    expect(result.whatsappOptIn).toBe(true);
    expect(result.address?.countryCode).toBe("IN");
  });

  it("allows registration without an address and defaults WhatsApp consent to false", () => {
    const result = registrationSchema.parse(validProfile);

    expect(result.address).toBeUndefined();
    expect(result.whatsappOptIn).toBe(false);
  });

  it("rejects weak passwords and malformed email addresses", () => {
    expect(registrationSchema.safeParse({ ...validProfile, password: "short" }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...validProfile, email: "not-an-email" }).success).toBe(false);
  });

  it("rejects incomplete delivery details and invalid country codes", () => {
    expect(registrationSchema.safeParse({
      ...validProfile,
      address: { ...validAddress, phone: "123" },
    }).success).toBe(false);
    expect(registrationSchema.safeParse({
      ...validProfile,
      address: { ...validAddress, countryCode: "IND" },
    }).success).toBe(false);
  });

  it("trims required address values and supplies the optional second line default", () => {
    const result = registrationSchema.parse({
      ...validProfile,
      address: { ...validAddress, line2: "  ", countryCode: "IN" },
    });

    expect(result.address?.line2).toBe("");
  });
});
