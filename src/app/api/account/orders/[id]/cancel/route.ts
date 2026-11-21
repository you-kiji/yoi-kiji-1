import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendOrderStatusUpdate } from "@/lib/notifications";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage this order." }, { status: 401 });

  const { id } = await params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id, userId: user.id },
        include: { items: true, payment: true },
      });
      if (!order) return { status: 404 as const, error: "Order not found." };
      if (order.status === "CANCELLED") return { status: 200 as const, alreadyCancelled: true };
      if (!["PENDING", "CONFIRMED", "PROCESSING"].includes(order.status)) {
        return { status: 409 as const, error: "This order can no longer be cancelled online. Please contact the store team." };
      }
      if (order.fulfillmentOrderId || order.trackingNumber) {
        return { status: 409 as const, error: "A shipping label or tracking reference already exists. Please contact the store team to stop the shipment." };
      }
      if (order.payment?.status === "CAPTURED" || order.payment?.status === "REFUNDED") {
        return { status: 409 as const, error: "This order has a captured payment. Contact the store team to arrange cancellation and refund." };
      }

      // Claim the transition before releasing any reservation. A concurrent
      // expiry/admin cancellation cannot restore the same stock twice.
      const claimed = await tx.order.updateMany({
        where: { id: order.id, userId: user.id, status: order.status },
        data: { status: "CANCELLED", checkoutKey: null, reservationExpiresAt: null },
      });
      if (claimed.count !== 1) {
        return { status: 409 as const, error: "This order changed while cancellation was being processed. Refresh and try again." };
      }

      const redemption = await tx.couponRedemption.findFirst({
        where: { orderId: order.id },
        select: { couponId: true },
      });
      if (redemption) {
        const released = await tx.couponRedemption.deleteMany({ where: { orderId: order.id } });
        if (released.count > 0) {
          await tx.coupon.update({
            where: { id: redemption.couponId },
            data: { usageCount: { decrement: released.count } },
          });
        }
      }

      for (const item of order.items) {
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
            reason: "CUSTOMER_ORDER_CANCELLED",
            reference: order.orderNumber,
            createdBy: user.id,
          },
        });
      }
      return { status: 200 as const, cancelled: true, orderId: order.id, orderNumber: order.orderNumber };
    }, { isolationLevel: "Serializable" });

    if (result.status !== 200) return NextResponse.json({ error: result.error }, { status: result.status });
    if ("cancelled" in result && result.cancelled) {
      await sendOrderStatusUpdate(result.orderId, "CANCELLED").catch(() => null);
    }
    return NextResponse.json(result);
  } catch (error) {
    if ((error as { code?: string })?.code === "P2034") {
      return NextResponse.json({ error: "This order was updated at the same time. Refresh and try again." }, { status: 409 });
    }
    throw error;
  }
}
