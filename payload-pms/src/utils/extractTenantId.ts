/**
 * Extract a stable tenant ID from a page document.
 * The tenant field can be a raw ID (number/string) or a populated object.
 * Returns undefined for new documents that have not yet been assigned a tenant.
 */
export function extractTenantIdFromDoc(data: any): string | undefined {
  const tenant = data?.tenant;

  if (!tenant) {
    return undefined;
  }

  if (typeof tenant === "object" && "id" in tenant) {
    return String(tenant.id);
  }

  return String(tenant);
}
