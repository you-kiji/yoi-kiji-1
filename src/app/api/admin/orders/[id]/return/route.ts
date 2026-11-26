import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const schema = z.object({ status: z.enum(["APPROVED", "REJECTED", "RECEIVED"]), adminNote: z.string().trim().max(1000).optional() });
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid return decision." }, { status: 400 });
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, select: { id: true, returnRequest: true } });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (!order.returnRequest || typeof order.returnRequest !== "object" || Array.isArray(order.returnRequest)) return NextResponse.json({ error: "No return request exists for this order." }, { status: 404 });
  const current = order.returnRequest as Record<string, unknown>;
  const allowed = (current.status === "REQUESTED" && ["APPROVED", "REJECTED"].includes(parsed.data.status)) || (current.status === "APPROVED" && parsed.data.status === "RECEIVED");
  if (!allowed) return NextResponse.json({ error: "This return request has already been reviewed or cannot make that transition." }, { status: 409 });
  const updated = { ...current, status: parsed.data.status, adminNote: parsed.data.adminNote ?? "", reviewedAt: new Date().toISOString(), reviewedBy: admin.id };
  await prisma.order.update({ where: { id }, data: { returnRequest: updated } });
  return NextResponse.json({ returnRequest: updated });
}
