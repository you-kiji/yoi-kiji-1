import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

function csv(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
  return '"' + safe.replace(/"/g, '""') + '"';
}
export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const status = request.nextUrl.searchParams.get("status");
  const paymentStatus = request.nextUrl.searchParams.get("payment");
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
  const allowedStatuses = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];
  const allowedPayments = ["CREATED", "AUTHORIZED", "CAPTURED", "FAILED", "REFUNDED"];
  const orders = await prisma.order.findMany({
    where: {
      ...(status && allowedStatuses.includes(status) ? { status: status as never } : {}),
      ...(paymentStatus === "NONE" ? { payment: { is: null } } : paymentStatus && allowedPayments.includes(paymentStatus) ? { payment: { is: { status: paymentStatus as never } } } : {}),
      ...(query ? { OR: [{ orderNumber: { contains: query, mode: "insensitive" as const } }, { guestName: { contains: query, mode: "insensitive" as const } }, { guestEmail: { contains: query, mode: "insensitive" as const } }, { user: { is: { OR: [{ name: { contains: query, mode: "insensitive" as const } }, { email: { contains: query, mode: "insensitive" as const } }] } } }] } : {}),
    },
    include: { user: { select: { name: true, email: true } }, items: true, payment: true },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });
  const rows = [
    ["Order number", "Customer", "Email", "Phone", "Customer type", "Status", "Payment method", "Payment status", "Subtotal paise", "Discount paise", "Shipping paise", "Total paise", "Items", "Created at", "Tracking number"],
    ...orders.map(order => [
      order.orderNumber, order.user?.name ?? order.guestName ?? "", order.user?.email ?? order.guestEmail ?? "", order.guestPhone ?? "", order.userId ? "REGISTERED" : "GUEST", order.status, order.payment?.provider ?? "", order.payment?.status ?? "",
      order.subtotalPaise, order.discountPaise, order.shippingPaise, order.totalPaise,
      order.items.map(item => item.productName + " x" + item.quantity).join("; "),
      order.createdAt.toISOString(), order.trackingNumber ?? "",
    ]),
  ];
  const content = rows.map(row => row.map(csv).join(",")).join("\r\n");
  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="yoi-kiji-orders.csv"',
      "Cache-Control": "no-store",
    },
  });
}
