import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), prisma: { order: { findFirst: vi.fn(), updateMany: vi.fn() } } }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
import { POST } from "./route";
function request(body: unknown) { return new Request("http://localhost/api/account/orders/order-1/return", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }) as never; }
describe("customer return requests", () => {
 beforeEach(() => { vi.clearAllMocks(); mocks.getCurrentUser.mockResolvedValue({ id: "user-1" }); mocks.prisma.order.findFirst.mockResolvedValue({ id: "order-1", status: "DELIVERED", returnRequest: null }); mocks.prisma.order.updateMany.mockResolvedValue({ count: 1 }); });
 it("creates a return request for an owned delivered order", async () => { const response = await POST(request({ reason: "DAMAGED", details: "Box arrived torn" }), { params: Promise.resolve({ id: "order-1" }) }); expect(response.status).toBe(201); expect(mocks.prisma.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "order-1", userId: "user-1", status: "DELIVERED" }), data: { returnRequest: expect.objectContaining({ status: "REQUESTED", reason: "DAMAGED" }) } })); });
 it("rejects returns before delivery", async () => { mocks.prisma.order.findFirst.mockResolvedValue({ id: "order-1", status: "SHIPPED", returnRequest: null }); const response = await POST(request({ reason: "OTHER" }), { params: Promise.resolve({ id: "order-1" }) }); expect(response.status).toBe(409); expect(mocks.prisma.order.updateMany).not.toHaveBeenCalled(); });
 it("prevents duplicate return requests", async () => { mocks.prisma.order.findFirst.mockResolvedValue({ id: "order-1", status: "DELIVERED", returnRequest: { status: "REQUESTED" } }); const response = await POST(request({ reason: "OTHER" }), { params: Promise.resolve({ id: "order-1" }) }); expect(response.status).toBe(409); expect(mocks.prisma.order.updateMany).not.toHaveBeenCalled(); });
 it("rejects a concurrent request when another request wins the claim", async () => { mocks.prisma.order.updateMany.mockResolvedValue({ count: 0 }); const response = await POST(request({ reason: "OTHER" }), { params: Promise.resolve({ id: "order-1" }) }); expect(response.status).toBe(409); });
});
