import { createHash } from "crypto";
import { SyncTarget } from "../types";

export function hashTargets(targets: SyncTarget[]): string {
  const stable = JSON.stringify(
    targets
      .map((t) => ({
        key: t.key,
        url: t.url,
        cronExpression: t.cronExpression,
      }))
      .sort((a, b) => a.key.localeCompare(b.key)),
  );
  return createHash("sha256").update(stable).digest("hex");
}
