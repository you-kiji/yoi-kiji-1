import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    order: { findFirst: vi.fn(), updateMany: vi.fn() },
    couponRedemption: { findFirst: vi.fn(), deleteMany: vi.fn() },
    coupon: { update: vi.fn() },
    product: { update: vi.fn() },
    productVariant: { update: vi.fn() },
    inventoryMovement: { create: vi.fn() },
  };
  return {
    tx,
    getCurrentUser: vi.fn(),
  sendOrderStatusUpdate: vi.fn(),
    prisma: {
      $transaction: vi.fn(),
    },
  };
});

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/notifications", () => ({ sendOrderStatusUpdate: mocks.sendOrderStatusUpdate }));

import { POST } from "./route";

const confirmedOrder = {
  id: "order-1",
  orderNumber: "YK-1001",
  userId: "user-1",
  status: "CONFIRMED",
  payment: { provider: "COD", status: "CREATED" },
  items: [
    { productId: "product-1", variantId: null, quantity: 2 },
    { productId: "product-2", variantId: "variant-2", quantity: 1 },
  ],
};

function request() {
  return new Request("http://localhost/api/account/orders/order-1/cancel", { method: "POST" });
}

describe("customer order cancellation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.sendOrderStatusUpdate.mockResolvedValue({ sent: true });
    mocks.tx.order.findFirst.mockResolvedValue(confirmedOrder);
    mocks.tx.order.updateMany.mockResolvedValue({ count: 1 });
    mocks.tx.couponRedemption.findFirst.mockResolvedValue({ couponId: "coupon-1" });
    mocks.tx.couponRedemption.deleteMany.mockResolvedValue({ count: 1 });
    mocks.tx.coupon.update.mockResolvedValue({});
    mocks.tx.product.update.mockResolvedValue({});
    mocks.tx.productVariant.update.mockResolvedValue({});
    mocks.tx.inventoryMovement.create.mockResolvedValue({});
    mocks.prisma.$transaction.mockImplementation(async (callback: (tx: typeof mocks.tx) => unknown) => callback(mocks.tx));
  });

  it("cancels an eligible COD order and restores stock and coupon usage once", async () => {
    const response = await POST(request(), { params: Promise.resolve({ id: "order-1" }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 200, cancelled: true, orderId: "order-1", orderNumber: "YK-1001" });
    expect(mocks.sendOrderStatusUpdate).toHaveBeenCalledWith("order-1", "CANCELLED");
    expect(mocks.tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: "order-1", userId: "user-1", status: "CONFIRMED" },
      data: { status: "CANCELLED", checkoutKey: null, reservationExpiresAt: null },
    });
    expect(mocks.tx.product.update).toHaveBeenCalledTimes(1);
    expect(mocks.tx.productVariant.update).toHaveBeenCalledTimes(1);
    expect(mocks.tx.inventoryMovement.create).toHaveBeenCalledTimes(2);
    expect(mocks.tx.couponRedemption.deleteMany).toHaveBeenCalledWith({ where: { orderId: "order-1" } });
    expect(mocks.tx.coupon.update).toHaveBeenCalledWith({
      where: { id: "coupon-1" }, data: { usageCount: { decrement: 1 } },
    });
  });

  it("does not cancel a captured payment or release stock", async () => {
    mocks.tx.order.findFirst.mockResolvedValue({
      ...confirmedOrder,
      payment: { provider: "RAZORPAY", status: "CAPTURED" },
    });
    const response = await POST(request(), { params: Promise.resolve({ id: "order-1" }) });
    expect(response.status).toBe(409);
    expect(mocks.tx.order.updateMany).not.toHaveBeenCalled();
    expect(mocks.tx.product.update).not.toHaveBeenCalled();
    expect(mocks.tx.productVariant.update).not.toHaveBeenCalled();
  });

  it("does not restore stock if another process already claimed cancellation", async () => {
    mocks.tx.order.updateMany.mockResolvedValue({ count: 0 });
    const response = await POST(request(), { params: Promise.resolve({ id: "order-1" }) });
    expect(response.status).toBe(409);
    expect(mocks.tx.couponRedemption.findFirst).not.toHaveBeenCalled();
    expect(mocks.tx.product.update).not.toHaveBeenCalled();
    expect(mocks.tx.productVariant.update).not.toHaveBeenCalled();
    expect(mocks.tx.inventoryMovement.create).not.toHaveBeenCalled();
  });

  it("requires the signed-in owner of the order", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const response = await POST(request(), { params: Promise.resolve({ id: "order-1" }) });
    expect(response.status).toBe(401);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("refuses cancellation after fulfilment has shipped", async () => {
    mocks.tx.order.findFirst.mockResolvedValue({ ...confirmedOrder, status: "SHIPPED" });
    const response = await POST(request(), { params: Promise.resolve({ id: "order-1" }) });
    expect(response.status).toBe(409);
    expect(mocks.tx.order.updateMany).not.toHaveBeenCalled();
    expect(mocks.tx.product.update).not.toHaveBeenCalled();
  });
});
