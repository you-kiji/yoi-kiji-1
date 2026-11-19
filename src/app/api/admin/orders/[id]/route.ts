import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { sendOrderStatusUpdate } from "@/lib/notifications";

const schema = z.object({
  status: z.enum(["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
});

const allowedTransitions: Record<string, string[]> = {
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
  PENDING: ["CANCELLED"],
};

function conflict(message: string) {
  return Object.assign(new Error(message), { code: "ORDER_TRANSITION_CONFLICT" });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const existing = await prisma.order.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      // Read and validate inside the transaction; the earlier existence check is not
      // used to authorize a transition because another admin may have changed it.
      const current = await tx.order.findUnique({
        where: { id },
        include: { items: true, payment: true },
      });
      if (!current) throw conflict("Order no longer exists.");

      if (!allowedTransitions[current.status]?.includes(parsed.data.status)) {
        throw conflict(`Cannot change order from ${current.status} to ${parsed.data.status}.`);
      }

      if (
        parsed.data.status === "SHIPPED" &&
        (!current.fulfillmentProvider || !current.trackingNumber?.trim())
      ) {
        throw conflict("Add the shipping provider and tracking / AWB number before marking this order as shipped.");
      }

      if (parsed.data.status === "CANCELLED" && current.payment?.status === "CAPTURED") {
        throw conflict("This order has been paid. Issue a Razorpay refund before cancelling it.");
      }

      // Compare-and-set the status before restoring stock. A concurrent request
      // cannot pass this claim and therefore cannot restore the same quantities twice.
      const claimed = await tx.order.updateMany({
        where: { id, status: current.status },
        data: {
          status: parsed.data.status,
          ...(parsed.data.status === "CANCELLED" ? { checkoutKey: null } : {}),
        },
      });
      if (claimed.count !== 1) {
        throw conflict("This order was updated by another administrator. Refresh and try again.");
      }

      if (parsed.data.status === "DELIVERED" && current.payment?.provider === "COD" && current.payment.status !== "CAPTURED") {
        await tx.payment.update({ where: { orderId: current.id }, data: { status: "CAPTURED" } });
      }

      if (parsed.data.status === "CANCELLED") {
        const redemption = await tx.couponRedemption.findFirst({ where: { orderId: current.id }, select: { couponId: true } });
        if (redemption) {
          const released = await tx.couponRedemption.deleteMany({ where: { orderId: current.id } });
          if (released.count > 0) {
            await tx.coupon.update({ where: { id: redemption.couponId }, data: { usageCount: { decrement: released.count } } });
          }
        }
        for (const item of current.items) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { inventoryQty: { increment: item.quantity } },
            });
          } else {
            await tx.product.update({
              where: { id: item.productId },
              data: { inventoryQty: { increment: item.quantity } },
            });
          }

          await tx.inventoryMovement.create({
            data: {
              productId: item.productId,
              variantId: item.variantId,
              quantityDelta: item.quantity,
              reason: "ORDER_CANCELLED",
              reference: current.orderNumber,
              createdBy: admin.id,
            },
          });
        }
      }

      return tx.order.findUnique({ where: { id } });
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "ORDER_TRANSITION_CONFLICT" || code === "P2034") {
      const message = error instanceof Error
        ? error.message
        : "This order was updated by another administrator. Refresh and try again.";
      return NextResponse.json({ error: message }, { status: 409 });
    }
    throw error;
  }

  if (updated) {
    await sendOrderStatusUpdate(id, parsed.data.status).catch(() => ({
      sent: false,
      reason: "Notification could not be sent.",
    }));
  }

  return NextResponse.json({ order: updated });
}
