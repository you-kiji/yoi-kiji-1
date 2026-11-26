import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequestError } from "./instrumentation";

describe("request error instrumentation", () => {
  afterEach(() => vi.restoreAllMocks());
  it("writes structured request error metadata without logging headers", async () => {
    const logger = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await onRequestError(new Error("database unavailable"), {
      path: "/api/checkout", method: "POST", headers: { authorization: "do-not-log" },
    }, { routerKind: "App Router", routePath: "/api/checkout", routeType: "route", revalidateReason: undefined });
    const entry = JSON.parse(String(logger.mock.calls[0][0]));
    expect(entry).toMatchObject({ level: "error", event: "next_request_error", path: "/api/checkout", method: "POST", route: "/api/checkout", errorName: "Error", errorMessage: "database unavailable" });
    expect(entry).not.toHaveProperty("headers");
    expect(JSON.stringify(entry)).not.toContain("do-not-log");
  });
});
