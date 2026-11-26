import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
 prisma: {
  order: { findUnique: vi.fn() },
  notificationLog: { upsert: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
 },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));

import { sendOrderConfirmation, sendOrderStatusUpdate } from "@/lib/notifications";

const order = {
 id: "order-1",
 orderNumber: "YK-1001",
 totalPaise: 259900,
 trackingNumber: "AWB-123",
 trackingUrl: "https://carrier.example/track/AWB-123",
 user: { email: "customer@example.com", name: "Customer" },
 items: [],
};

describe("order status email notifications", () => {
 beforeEach(() => {
  vi.clearAllMocks();
  process.env.EMAIL_API_KEY = "resend-test";
  process.env.EMAIL_FROM = "YOI KIJI <orders@example.com>";
  mocks.prisma.order.findUnique.mockResolvedValue(order);
  mocks.prisma.notificationLog.upsert.mockResolvedValue({ id: "log-1", status: "PENDING" });
  mocks.prisma.notificationLog.updateMany.mockResolvedValue({ count: 1 });
  mocks.prisma.notificationLog.update.mockResolvedValue({});
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
   ok: true,
   json: async () => ({ id: "email-1" }),
  }));
 });
 
 it("sends a shipment email with AWB and secure tracking link", async () => {
  const result = await sendOrderStatusUpdate("order-1", "SHIPPED");
  expect(result).toEqual({ sent: true });
  const request = vi.mocked(fetch).mock.calls[0];
  const payload = JSON.parse(String(request[1]?.body));
  expect(payload.subject).toContain("on its way");
  expect(payload.text).toContain("AWB-123");
  expect(payload.html).toContain("https://carrier.example/track/AWB-123");
  expect(mocks.prisma.notificationLog.update).toHaveBeenCalledWith({
   where: { id: "log-1" },
   data: { status: "SENT", providerId: "email-1", error: null },
  });
 });

 it("does not send a duplicate event already marked SENT", async () => {
  mocks.prisma.notificationLog.upsert.mockResolvedValue({ id: "log-1", status: "SENT" });
  const result = await sendOrderStatusUpdate("order-1", "DELIVERED");
  expect(result.sent).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
  expect(mocks.prisma.notificationLog.updateMany).not.toHaveBeenCalled();
 });

 it("does not include an insecure tracking URL in a shipment email", async () => {
  mocks.prisma.order.findUnique.mockResolvedValue({ ...order, trackingUrl: "http://unsafe.example/track" });
  await sendOrderStatusUpdate("order-1", "SHIPPED");
  const payload = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
  expect(payload.text).not.toContain("unsafe.example");
  expect(payload.html).not.toContain("unsafe.example");
 });

 it("sends an idempotent order confirmation email", async () => {
  const result = await sendOrderConfirmation("order-1");
  expect(result).toEqual({ sent: true });
  const payload = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
  expect(payload.to).toEqual(["customer@example.com"]);
  expect(payload.subject).toContain("YK-1001");
  expect(payload.text).toContain("Order total: INR 2599.00");
  expect(mocks.prisma.notificationLog.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "SENT", providerId: "email-1", error: null } }));
 });

 it("does not resend an order confirmation already marked SENT", async () => {
  mocks.prisma.notificationLog.upsert.mockResolvedValue({ id: "log-1", status: "SENT" });
  const result = await sendOrderConfirmation("order-1");
  expect(result.sent).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
 });

 it("sends a refund notification after a processed refund", async () => {
  await sendOrderStatusUpdate("order-1", "REFUNDED");
  const payload = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
  expect(payload.subject).toContain("refund has been processed");
  expect(payload.text).toContain("bank or card issuer");
 });

 it("records provider delivery failures for operational retry", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
   ok: false,
   json: async () => ({ message: "Provider unavailable" }),
  }));
  const result = await sendOrderStatusUpdate("order-1", "PROCESSING");
  expect(result.sent).toBe(false);
  expect(mocks.prisma.notificationLog.update).toHaveBeenCalledWith(expect.objectContaining({
   where: { id: "log-1" },
   data: expect.objectContaining({ status: "FAILED", error: "Provider unavailable" }),
  }));
 });
});
