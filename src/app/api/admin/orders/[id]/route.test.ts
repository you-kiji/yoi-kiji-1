import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  sendOrderStatusUpdate: vi.fn(),
  prisma: {
    order: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
  tx: {
    order: { findUnique: vi.fn(), updateMany: vi.fn() },
    product: { update: vi.fn() },
    productVariant: { update: vi.fn() },
    inventoryMovement: { create: vi.fn() },
    couponRedemption: { findFirst: vi.fn(), deleteMany: vi.fn() },
    coupon: { update: vi.fn() },
  },
}));

vi.mock("@/lib/admin", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/notifications", () => ({ sendOrderStatusUpdate: mocks.sendOrderStatusUpdate }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));

import { PATCH } from "./route";

const pendingOrder = {
  id: "order-1",
  orderNumber: "YK-1001",
  status: "PENDING",
  fulfillmentProvider: null,
  trackingNumber: null,
  payment: { status: "CREATED" },
  items: [
    { productId: "product-1", variantId: null, quantity: 2 },
    { productId: "product-2", variantId: "variant-2", quantity: 1 },
  ],
};

function request() {
  return new Request("http://localhost/api/admin/orders/order-1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "CANCELLED" }),
  }) as never;
}

describe("admin order status transitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ id: "admin-1" });
    mocks.sendOrderStatusUpdate.mockResolvedValue({ sent: true });
    mocks.prisma.order.findUnique.mockResolvedValue({ id: "order-1" });
    mocks.prisma.$transaction.mockImplementation(async (callback: (tx: typeof mocks.tx) => unknown) => callback(mocks.tx));
    mocks.tx.order.findUnique
      .mockResolvedValueOnce(pendingOrder)
      .mockResolvedValueOnce({ ...pendingOrder, status: "CANCELLED" });
    mocks.tx.order.updateMany.mockResolvedValue({ count: 1 });
    mocks.tx.product.update.mockResolvedValue({});
    mocks.tx.productVariant.update.mockResolvedValue({});
    mocks.tx.inventoryMovement.create.mockResolvedValue({});
    mocks.tx.couponRedemption.findFirst.mockResolvedValue(null);
    mocks.tx.couponRedemption.deleteMany.mockResolvedValue({ count: 0 });
    mocks.tx.coupon.update.mockResolvedValue({});
  });

  it("claims cancellation before restoring each stock item exactly once", async () => {
    const response = await PATCH(request(), { params: Promise.resolve({ id: "order-1" }) });
    expect(response.status).toBe(200);
    expect(mocks.tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: "order-1", status: "PENDING" },
      data: { status: "CANCELLED", checkoutKey: null },
    });
    expect(mocks.tx.product.update).toHaveBeenCalledTimes(1);
    expect(mocks.tx.productVariant.update).toHaveBeenCalledTimes(1);
    expect(mocks.tx.inventoryMovement.create).toHaveBeenCalledTimes(2);
    expect(mocks.sendOrderStatusUpdate).toHaveBeenCalledWith("order-1", "CANCELLED");
  });

  it("releases a redeemed coupon when a COD order is cancelled", async () => {
    mocks.tx.couponRedemption.findFirst.mockResolvedValue({ couponId: "coupon-1" });
    mocks.tx.couponRedemption.deleteMany.mockResolvedValue({ count: 1 });
    const response = await PATCH(request(), { params: Promise.resolve({ id: "order-1" }) });
    expect(response.status).toBe(200);
    expect(mocks.tx.couponRedemption.deleteMany).toHaveBeenCalledWith({ where: { orderId: "order-1" } });
    expect(mocks.tx.coupon.update).toHaveBeenCalledWith({ where: { id: "coupon-1" }, data: { usageCount: { decrement: 1 } } });
  });

  it("does not restore stock when another admin already claimed the transition", async () => {
    mocks.tx.order.updateMany.mockResolvedValue({ count: 0 });
    const response = await PATCH(request(), { params: Promise.resolve({ id: "order-1" }) });
    expect(response.status).toBe(409);
    expect(mocks.tx.product.update).not.toHaveBeenCalled();
    expect(mocks.tx.productVariant.update).not.toHaveBeenCalled();
    expect(mocks.tx.inventoryMovement.create).not.toHaveBeenCalled();
    expect(mocks.sendOrderStatusUpdate).not.toHaveBeenCalled();
  });

  it("refuses cancellation of a captured payment without changing inventory", async () => {
    mocks.tx.order.findUnique.mockReset().mockResolvedValue({
      ...pendingOrder,
      payment: { status: "CAPTURED" },
    });
    const response = await PATCH(request(), { params: Promise.resolve({ id: "order-1" }) });
    expect(response.status).toBe(409);
    expect(mocks.tx.order.updateMany).not.toHaveBeenCalled();
    expect(mocks.tx.product.update).not.toHaveBeenCalled();
    expect(mocks.tx.inventoryMovement.create).not.toHaveBeenCalled();
  });
});
