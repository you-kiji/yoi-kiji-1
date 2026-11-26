import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  reason: z.enum(["DAMAGED", "WRONG_ITEM", "QUALITY", "OTHER"]),
  details: z.string().trim().max(1000).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to request a return." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a return reason and check the details." }, { status: 400 });
  const { id } = await params;
  const order = await prisma.order.findFirst({ where: { id, userId: user.id }, select: { id: true, status: true, returnRequest: true } });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.status !== "DELIVERED") return NextResponse.json({ error: "A return can be requested after delivery." }, { status: 409 });
  if (order.returnRequest) return NextResponse.json({ error: "A return request already exists for this order." }, { status: 409 });

  const payload = { status: "REQUESTED", reason: parsed.data.reason, details: parsed.data.details ?? "", requestedAt: new Date().toISOString() };
  const claimed = await prisma.order.updateMany({
    where: { id, userId: user.id, status: "DELIVERED", returnRequest: { equals: Prisma.DbNull } },
    data: { returnRequest: payload },
  });
  if (claimed.count !== 1) return NextResponse.json({ error: "This order changed while the request was being submitted. Refresh and try again." }, { status: 409 });
  return NextResponse.json({ returnRequest: payload }, { status: 201 });
}
