import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  sendOrderStatusUpdate: vi.fn(),
  prisma: {
    order: { findUnique: vi.fn(), update: vi.fn() },
    payment: { updateMany: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/admin", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/notifications", () => ({ sendOrderStatusUpdate: mocks.sendOrderStatusUpdate }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));

import { POST } from "./route";

const order = {
  id: "order-1",
  orderNumber: "YK-1001",
  payment: {
    id: "payment-1",
    provider: "RAZORPAY",
    providerPaymentId: "pay_1",
    status: "CAPTURED",
    amountPaise: 259900,
    refundStatus: null,
  },
};

function request() {
  return new Request("http://localhost/api/admin/orders/order-1/refund", { method: "POST" });
}

describe("admin Razorpay refund", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RAZORPAY_KEY_ID", "key_test");
    vi.stubEnv("RAZORPAY_KEY_SECRET", "secret_test");
    mocks.requireAdmin.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    mocks.sendOrderStatusUpdate.mockResolvedValue({ sent: true });
    mocks.prisma.order.findUnique.mockResolvedValue(order);
    mocks.prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    mocks.prisma.payment.update.mockResolvedValue({});
    mocks.prisma.order.update.mockResolvedValue({});
    mocks.prisma.$transaction.mockImplementation(async (operations: Promise<unknown>[]) => Promise.all(operations));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "rfnd_1", status: "processed", amount: 259900,
    }), { status: 200, headers: { "content-type": "application/json" } })));
  });

  it("claims the payment before requesting the full refund and marks processed refunds", async () => {
    const response = await POST(request(), { params: Promise.resolve({ id: "order-1" }) });
    expect(response.status).toBe(200);
    expect(mocks.prisma.payment.updateMany).toHaveBeenCalledWith({
      where: {
        id: "payment-1",
        status: "CAPTURED",
        providerPaymentId: "pay_1",
        OR: [{ refundStatus: null }, { refundStatus: "failed" }],
      },
      data: { refundStatus: "pending" },
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.payment.update).toHaveBeenCalledWith({
      where: { id: "payment-1" },
      data: {
        refundId: "rfnd_1",
        refundStatus: "processed",
        refundAmountPaise: 259900,
        status: "REFUNDED",
      },
    });
    expect(mocks.prisma.order.update).toHaveBeenCalledWith({
      where: { id: "order-1" }, data: { status: "REFUNDED" },
    });
    expect(mocks.sendOrderStatusUpdate).toHaveBeenCalledWith("order-1", "REFUNDED");
  });

  it("does not call Razorpay when another admin already claimed the refund", async () => {
    mocks.prisma.payment.updateMany.mockResolvedValue({ count: 0 });
    const response = await POST(request(), { params: Promise.resolve({ id: "order-1" }) });
    expect(response.status).toBe(409);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mocks.prisma.payment.update).not.toHaveBeenCalled();
  });

  it("releases the claim when Razorpay rejects the refund", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "declined" }), { status: 400 })));
    const response = await POST(request(), { params: Promise.resolve({ id: "order-1" }) });
    expect(response.status).toBe(502);
    expect(mocks.prisma.payment.updateMany).toHaveBeenLastCalledWith({
      where: { id: "payment-1", status: "CAPTURED", refundStatus: "pending" },
      data: { refundStatus: "failed" },
    });
    expect(mocks.prisma.order.update).not.toHaveBeenCalled();
  });

  it("requires an administrator role", async () => {
    mocks.requireAdmin.mockResolvedValue({ id: "staff-1", role: "STAFF" });
    const response = await POST(request(), { params: Promise.resolve({ id: "order-1" }) });
    expect(response.status).toBe(403);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
