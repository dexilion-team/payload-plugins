import { PayloadRequest } from "payload";
import { AuditAction } from "./types";

export function getIpAddress(req: PayloadRequest): string | undefined {
  const ip =
    req.headers?.get("cf-connecting-ip")?.split(",")[0]?.trim() ??
    req.headers?.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers?.get("x-real-ip")?.trim();

  if (ip) {
    return ip?.split(",")[0]?.trim();
  }
}

/**
 * Infers the attempted operation from the HTTP request when the operation
 * is not directly available (e.g. inside an afterError hook).
 *
 * This relies on Payload's REST route structure. For local API calls
 * (`req.payloadAPI === 'local'`) there is no HTTP context, so the operation
 * cannot be inferred reliably and "unknown" is returned.
 */
export function inferOperationFromRequest(
  req: PayloadRequest,
): AuditAction | "unknown" {
  const method = req.method?.toUpperCase() ?? "";
  const pathname = req.pathname ?? "";

  if (pathname.endsWith("/login")) return "login";
  if (pathname.endsWith("/forgot-password")) return "forgotPassword";
  if (pathname.endsWith("/reset-password")) return "resetPassword";
  if (pathname.endsWith("/unlock")) return "unlock";
  if (pathname.endsWith("/refresh-token")) return "refresh";
  if (pathname.endsWith("/logout")) return "unknown";

  // Match the last occurrence of "/versions" to handle nested paths safely.
  const versionsIdx = pathname.lastIndexOf("/versions");
  if (versionsIdx !== -1) {
    const afterVersions = pathname.slice(versionsIdx + "/versions".length);

    if (afterVersions === "" || afterVersions === "/") {
      return method === "GET" ? "findVersions" : "unknown";
    }

    if (afterVersions === "/count") {
      return method === "GET" ? "countVersions" : "unknown";
    }

    if (method === "POST") return "restoreVersion";
    if (method === "GET") return "findVersionByID";
    return "unknown";
  }

  if (pathname.endsWith("/count") && method === "GET") return "count";

  if (pathname.endsWith("/duplicate")) return "unknown";

  const hasId = Boolean(req.routeParams?.id);

  switch (method) {
    case "GET":
      return hasId ? "findByID" : "find";
    case "POST":
      return "create";
    case "PATCH":
      return hasId ? "updateByID" : "update";
    case "DELETE":
      return hasId ? "deleteByID" : "delete";
    default:
      return "unknown";
  }
}
