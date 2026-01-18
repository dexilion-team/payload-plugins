import { getPreferences } from "@payloadcms/ui/utilities/upsertPreferences";
import { PayloadRequest } from "payload";

/**
 * Get the theme name for the current tenant
 */
const getThemeName = async ({ req }: { req: PayloadRequest }) => {
  if (!req.user) {
    return null;
  }

  const preference = await getPreferences(
    "admin-tenant-select",
    req.payload,
    req.user.id,
    "users",
  );
  const tenantId = preference?.value;

  if (!tenantId) {
    return null;
  }

  const tenant = await req.payload.findByID({
    collection: "tenants",
    id: Number(tenantId),
  });
  const themeName = "theme" in tenant && (tenant.theme as string);

  if (!themeName) {
    return null;
  }

  return themeName;
};

export default getThemeName;
