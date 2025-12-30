import { headers } from "next/headers";

export async function getTenantName() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");

  return host;
}
