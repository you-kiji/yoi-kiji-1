import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  prisma: { user: { create: vi.fn() } },
  hashPassword: vi.fn(),
  createSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/auth", () => ({
  hashPassword: mocks.hashPassword,
  createSession: mocks.createSession,
}));

import { POST } from "@/app/api/auth/register/route";

function request(body: unknown) {
  return new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const profile = {
  name: "Aiko Tanaka",
  email: "AIKO@example.com",
  password: "a-secure-password-123",
  whatsappOptIn: true,
  address: {
    fullName: "Aiko Tanaka",
    phone: "+91 98765 43210",
    line1: "12 Sakura Road",
    line2: "Near the garden",
    city: "Jaipur",
    state: "Rajasthan",
    postalCode: "302019",
    countryCode: "IN",
  },
};

describe("customer registration API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hashPassword.mockResolvedValue("scrypt:hashed-value");
    mocks.prisma.user.create.mockResolvedValue({
      id: "customer-1",
      name: "Aiko Tanaka",
      email: "aiko@example.com",
      whatsappOptIn: true,
    });
    mocks.createSession.mockResolvedValue(undefined);
  });

  it("creates the customer, default delivery address and session", async () => {
    const response = await POST(request(profile));

    expect(response.status).toBe(201);
    expect(mocks.hashPassword).toHaveBeenCalledWith(profile.password);
    expect(mocks.prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Aiko Tanaka",
        email: "aiko@example.com",
        passwordHash: "scrypt:hashed-value",
        whatsappOptIn: true,
        addresses: {
          create: expect.objectContaining({
            fullName: "Aiko Tanaka",
            phone: "+91 98765 43210",
            line1: "12 Sakura Road",
            isDefault: true,
          }),
        },
      }),
      select: { id: true, name: true, email: true, whatsappOptIn: true },
    });
    expect(mocks.createSession).toHaveBeenCalledWith("customer-1");
  });

  it("supports account-only registration without a delivery address", async () => {
    const response = await POST(request({
      name: "Aiko Tanaka",
      email: "aiko@example.com",
      password: "a-secure-password-123",
    }));

    expect(response.status).toBe(201);
    const createArgs = mocks.prisma.user.create.mock.calls[0][0];
    expect(createArgs.data.addresses).toBeUndefined();
    expect(createArgs.data.whatsappOptIn).toBe(false);
  });

  it("rejects invalid fields before hashing or writing to the database", async () => {
    const response = await POST(request({
      ...profile,
      password: "too-short",
      address: { ...profile.address, phone: "123" },
    }));

    expect(response.status).toBe(400);
    expect(mocks.hashPassword).not.toHaveBeenCalled();
    expect(mocks.prisma.user.create).not.toHaveBeenCalled();
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("returns a conflict when the email address is already registered", async () => {
    mocks.prisma.user.create.mockRejectedValue({ code: "P2002" });

    const response = await POST(request(profile));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "An account with this email already exists." });
    expect(mocks.createSession).not.toHaveBeenCalled();
  });
});
