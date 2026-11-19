import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSession, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const addressSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(7).max(20),
  line1: z.string().trim().min(3).max(180),
  line2: z.string().trim().max(180).optional().default(""),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().min(3).max(20),
  countryCode: z.string().trim().length(2).transform(value => value.toUpperCase()).default("IN"),
});

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  password: z.string().min(12).max(128),
  whatsappOptIn: z.boolean().default(false),
  address: addressSchema.optional(),
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please review your details. Passwords must contain at least 12 characters and delivery details must be complete." },
      { status: 400 },
    );
  }

  try {
    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        whatsappOptIn: parsed.data.whatsappOptIn,
        ...(parsed.data.address ? {
          addresses: {
            create: {
              ...parsed.data.address,
              isDefault: true,
            },
          },
        } : {}),
      },
      select: { id: true, name: true, email: true, whatsappOptIn: true },
    });

    await createSession(user.id);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Registration is temporarily unavailable." }, { status: 503 });
  }
}
