import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
 const tx = {
  order: { updateMany: vi.fn(), findUnique: vi.fn() },
  payment: { update: vi.fn() },
 };
 return {
  tx,
  prisma: {
   payment: { findUnique: vi.fn(), update: vi.fn() },
   order: { update: vi.fn() },
   $transaction: vi.fn(async (arg: unknown) => {
    if (typeof arg === "function") return (arg as (client: typeof tx) => Promise<unknown>)(tx);
    return Promise.all(arg as Promise<unknown>[]);
   }),
  },
  sendOrderConfirmation: vi.fn(),
  sendWhatsAppOrderConfirmation: vi.fn(),
 };
});

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/notifications", () => ({
 sendOrderConfirmation: mocks.sendOrderConfirmation,
 sendWhatsAppOrderConfirmation: mocks.sendWhatsAppOrderConfirmation,
}));

import { POST } from "@/app/api/payments/razorpay/webhook/route";

const storedPayment = {
 id: "payment-1",
 orderId: "order-1",
 providerOrderId: "order_gateway_1",
 providerPaymentId: null,
 amountPaise: 259900,
 currency: "INR",
 status: "CREATED",
 webhookEventId: null,
 order: { id: "order-1", orderNumber: "YK-1001", status: "PENDING", items: [] },
};

function signedRequest(overrides: Record<string, unknown> = {}, signatureOverride?: string) {
 const body = {
  event: "payment.captured",
  payload: { payment: { entity: {
   id: "pay_1", order_id: "order_gateway_1", amount: 259900, currency: "INR", status: "captured",
   ...overrides,
  } } },
 };
 const raw = JSON.stringify(body);
 const signature = signatureOverride ?? createHmac("sha256", "webhook-test").update(raw).digest("hex");
 return new NextRequest("http://localhost/api/payments/razorpay/webhook", {
  method: "POST",
  headers: { "content-type": "application/json", "x-razorpay-signature": signature, "x-razorpay-event-id": "evt_1" },
  body: raw,
 });
}

function refundRequest(refund: Record<string, unknown> = {}) {
 const raw=JSON.stringify({event:"refund.processed",payload:{refund:{entity:{
  id:"rfnd_1",payment_id:"pay_1",amount:259900,currency:"INR",...refund,
 }}}});
 const signature=createHmac("sha256","webhook-test").update(raw).digest("hex");
 return new NextRequest("http://localhost/api/payments/razorpay/webhook",{
  method:"POST",
  headers:{"content-type":"application/json","x-razorpay-signature":signature,"x-razorpay-event-id":"evt_refund_1"},
  body:raw,
 });
}

describe("Razorpay webhook payment integrity", () => {
 beforeEach(() => {
  vi.clearAllMocks();
  process.env.RAZORPAY_WEBHOOK_SECRET = "webhook-test";
  mocks.prisma.payment.findUnique.mockResolvedValue(storedPayment);
  mocks.tx.order.updateMany.mockResolvedValue({ count: 1 });
  mocks.tx.payment.update.mockResolvedValue({});
  mocks.sendOrderConfirmation.mockResolvedValue({ sent: true });
  mocks.sendWhatsAppOrderConfirmation.mockResolvedValue({ sent: true });
 });

 it("rejects a correctly signed capture with a mismatched amount", async () => {
  const response = await POST(signedRequest({ amount: 259800 }));
  expect(response.status).toBe(400);
  expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  expect(mocks.tx.payment.update).not.toHaveBeenCalled();
 });

 it("rejects a correctly signed capture with a mismatched currency", async () => {
  const response = await POST(signedRequest({ currency: "USD" }));
  expect(response.status).toBe(400);
  expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
 });

 it("rejects a payment tied to a different gateway order", async () => {
  const response = await POST(signedRequest({ order_id: "order_gateway_other" }));
  expect(response.status).toBe(400);
  expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
 });

 it("confirms an order only after the captured payment matches amount and currency", async () => {
  const response = await POST(signedRequest());
  expect(response.status).toBe(200);
  expect(mocks.tx.order.updateMany).toHaveBeenCalledWith({
   where: { id: "order-1", status: "PENDING" }, data: { status: "CONFIRMED" },
  });
  expect(mocks.tx.payment.update).toHaveBeenCalledWith({
   where: { id: "payment-1" },
   data: { status: "CAPTURED", providerPaymentId: "pay_1", webhookEventId: "evt_1" },
  });
 });

 it("rejects an invalid webhook signature", async () => {
  const response = await POST(signedRequest({}, "invalid"));
  expect(response.status).toBe(400);
  expect(mocks.prisma.payment.findUnique).not.toHaveBeenCalled();
 });
});
