import { setPreference } from "@dexilion/payload-utils";
import { getPreferences } from "@payloadcms/ui/utilities/upsertPreferences";
import { PayloadRequest } from "payload";

type TenantOrID = number | { id: number };
type UserWithTenants = {
  id: string | number;
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
    let user: UserWithTenants | null = null;
    if (typeof req.user === "number") {
      user = (await req.payload.findByID({
        collection: "users",
        id: req.user,
        depth: 1,
      })) as UserWithTenants | null;
    } else {
      user = req.user as UserWithTenants;
    }

    if (!user) {
      return null;
    }

    const firstTenant = user.tenant?.docs?.[0];
    if (firstTenant) {
      tenantId =
        typeof firstTenant === "number"
          ? String(firstTenant)
          : String(firstTenant.id);
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
