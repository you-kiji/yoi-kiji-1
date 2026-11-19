import { NextRequest, NextResponse } from "next/server";
import { createSession, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { registrationSchema } from "@/lib/registration-schema";

export async function POST(request: NextRequest) {
  const parsed = registrationSchema.safeParse(await request.json().catch(() => null));
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
