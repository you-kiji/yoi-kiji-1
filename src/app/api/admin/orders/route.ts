import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const statuses = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"] as const;
const payments = ["CREATED", "AUTHORIZED", "CAPTURED", "FAILED", "REFUNDED"] as const;

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });

  const params = request.nextUrl.searchParams;
  const status = params.get("status") ?? "ALL";
  const payment = params.get("payment") ?? "ALL";
  const query = (params.get("q") ?? "").trim().slice(0, 100);
  const page = Math.max(1, Math.min(10000, Number(params.get("page")) || 1));
  const pageSize = 20;
  const where = {
    ...(statuses.includes(status as typeof statuses[number]) ? { status: status as typeof statuses[number] } : {}),
    ...(payment === "NONE" ? { payment: { is: null } } : payments.includes(payment as typeof payments[number]) ? { payment: { is: { status: payment as typeof payments[number] } } } : {}),
    ...(query ? {
      OR: [
        { orderNumber: { contains: query, mode: "insensitive" as const } },
        { guestName: { contains: query, mode: "insensitive" as const } },
        { guestEmail: { contains: query, mode: "insensitive" as const } },
        { user: { is: { OR: [{ name: { contains: query, mode: "insensitive" as const } }, { email: { contains: query, mode: "insensitive" as const } }] } } },
      ],
    } : {}),
  };
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { user: { select: { name: true, email: true } }, items: true, payment: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);
  return NextResponse.json({ orders, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
}
