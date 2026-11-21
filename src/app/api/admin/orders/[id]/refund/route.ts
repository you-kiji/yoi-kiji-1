import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, include: { payment: true } });
  if (!order || !order.payment) {
    return NextResponse.json({ error: "Order payment not found." }, { status: 404 });
  }

  const payment = order.payment;
  if (payment.status === "REFUNDED" || payment.refundStatus === "processed") {
    return NextResponse.json({ error: "This payment is already refunded." }, { status: 409 });
  }
  if (payment.refundStatus === "pending") {
    return NextResponse.json({ error: "A refund is already being processed by Razorpay." }, { status: 409 });
  }
  if (payment.provider !== "RAZORPAY" || payment.status !== "CAPTURED" || !payment.providerPaymentId) {
    return NextResponse.json({ error: "Only captured Razorpay payments can be refunded." }, { status: 409 });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !secret) {
    return NextResponse.json({ error: "Razorpay is not configured." }, { status: 503 });
  }

  // Claim the refund before calling Razorpay. This compare-and-set prevents two
  // administrators from issuing duplicate refunds for the same captured payment.
  const claim = await prisma.payment.updateMany({
    where: {
      id: payment.id,
      status: "CAPTURED",
      providerPaymentId: payment.providerPaymentId,
      OR: [{ refundStatus: null }, { refundStatus: "failed" }],
    },
    data: { refundStatus: "pending" },
  });
  if (claim.count !== 1) {
    return NextResponse.json({ error: "A refund was already started or this payment changed. Refresh the order before retrying." }, { status: 409 });
  }

  const releaseClaim = async () => {
    await prisma.payment.updateMany({
      where: { id: payment.id, status: "CAPTURED", refundStatus: "pending" },
      data: { refundStatus: "failed" },
    });
  };

  let providerAccepted = false;
  try {
    const auth = Buffer.from(keyId + ":" + secret).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/payments/" + payment.providerPaymentId + "/refund", {
      method: "POST",
      headers: { Authorization: "Basic " + auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: payment.amountPaise,
        receipt: "refund-" + order.orderNumber,
        notes: { orderNumber: order.orderNumber, initiatedBy: admin.id },
      }),
      cache: "no-store",
    });
    providerAccepted = response.ok;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      await releaseClaim();
      return NextResponse.json({ error: "Razorpay refund request failed. Check the payment dashboard before retrying." }, { status: 502 });
    }
    if (!data.id || !["created", "pending", "processed"].includes(data.status) || data.amount !== payment.amountPaise) {
      // A successful provider response with incomplete details is ambiguous. Keep
      // the claim locked until the signed webhook or manual reconciliation resolves it.
      return NextResponse.json({ error: "Razorpay accepted the request but returned incomplete refund details. Reconciliation is required." }, { status: 502 });
    }

    const processed = data.status === "processed";
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          refundId: data.id,
          refundStatus: data.status,
          refundAmountPaise: data.amount,
          status: processed ? "REFUNDED" : "CAPTURED",
        },
      }),
      ...(processed ? [prisma.order.update({ where: { id }, data: { status: "REFUNDED" } })] : []),
    ]);

    return NextResponse.json({ refundInitiated: true, processed, refundId: data.id, status: data.status });
  } catch {
    // Mark the claim failed so an administrator can retry after checking the
    // Razorpay dashboard. If the provider accepted the request but the response
    // was lost, the webhook remains the source of truth for reconciliation.
    if (!providerAccepted) await releaseClaim().catch(() => undefined);
    return NextResponse.json({ error: providerAccepted ? "Razorpay may have accepted the refund. The request is locked pending webhook reconciliation." : "Refund status could not be confirmed. Check Razorpay before retrying." }, { status: 502 });
  }
}
