import {
  getPreferences,
  upsertPreferences,
} from "@payloadcms/ui/utilities/upsertPreferences";
import { PayloadRequest } from "payload";

type TenantOrID = number | { id: number };
type UserWithTenants = {
  id: number;
  email: string;
  tenant?: {
    docs?: TenantOrID[];
    hasNextPage?: boolean;
    totalDocs?: number;
  };
};

/**
 * Get the theme name for the current tenant
 */
const getThemeName = async ({ req }: { req: PayloadRequest }) => {
  if (!req.user) {
    return null;
  }

  const preference = await getPreferences<string>(
    "admin-tenant-select",
    req.payload,
    req.user.id,
    "users",
  );
  let tenantId = preference?.value;

  if (!tenantId) {
    const user = req.user as UserWithTenants;
    const firstTenant = user.tenant?.docs?.[0];
    if (firstTenant) {
      tenantId =
        typeof firstTenant === "number"
          ? String(firstTenant)
          : String(firstTenant.id);
      await upsertPreferences({
        key: "admin-tenant-select",
        req,
        value: tenantId,
      });
    }
  }

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
