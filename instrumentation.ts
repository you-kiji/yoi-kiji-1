type RequestErrorContext = {
  routerKind: "Pages Router" | "App Router";
  routePath: string;
  routeType: "render" | "route" | "action" | "middleware";
  renderSource?: "react-server-components" | "react-server-components-payload" | "server-rendering";
  revalidateReason: "on-demand" | "stale" | undefined;
};
type ErrorRequest = Readonly<{ path: string; method: string; headers: NodeJS.Dict<string | string[]> }>;

export async function onRequestError(error: unknown, request: ErrorRequest, context: Readonly<RequestErrorContext>) {
  const normalized = error instanceof Error ? error : new Error(String(error));
  console.error(JSON.stringify({
    level: "error",
    event: "next_request_error",
    timestamp: new Date().toISOString(),
    path: request.path,
    method: request.method,
    route: context.routePath,
    routeType: context.routeType,
    routerKind: context.routerKind,
    errorName: normalized.name,
    errorMessage: normalized.message,
  }));
}
