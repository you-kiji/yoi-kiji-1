import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), prisma: { order: { findUnique: vi.fn(), update: vi.fn() } } }));
vi.mock("@/lib/admin", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
import { PATCH } from "./route";
function request(body: unknown) { return new Request("http://localhost/api/admin/orders/order-1/return", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }) as never; }
describe("admin return review", () => {
 beforeEach(() => { vi.clearAllMocks(); mocks.requireAdmin.mockResolvedValue({ id: "admin-1", role: "ADMIN" }); mocks.prisma.order.findUnique.mockResolvedValue({ id: "order-1", returnRequest: { status: "REQUESTED", reason: "DAMAGED", details: "Box arrived torn" } }); mocks.prisma.order.update.mockResolvedValue({}); });
 it("allows an administrator to approve a requested return", async () => { const response = await PATCH(request({ status: "APPROVED" }), { params: Promise.resolve({ id: "order-1" }) }); expect(response.status).toBe(200); expect(mocks.prisma.order.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "order-1" }, data: { returnRequest: expect.objectContaining({ status: "APPROVED", reviewedBy: "admin-1" }) } })); });
 it("blocks staff from deciding return requests", async () => { mocks.requireAdmin.mockResolvedValue({ id: "staff-1", role: "STAFF" }); const response = await PATCH(request({ status: "APPROVED" }), { params: Promise.resolve({ id: "order-1" }) }); expect(response.status).toBe(403); expect(mocks.prisma.order.update).not.toHaveBeenCalled(); });
 it("only allows marking an approved return as received", async () => { mocks.prisma.order.findUnique.mockResolvedValue({ id: "order-1", returnRequest: { status: "REQUESTED" } }); const response = await PATCH(request({ status: "RECEIVED" }), { params: Promise.resolve({ id: "order-1" }) }); expect(response.status).toBe(409); expect(mocks.prisma.order.update).not.toHaveBeenCalled(); });
});
