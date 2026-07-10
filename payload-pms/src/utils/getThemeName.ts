import { getPreferences } from "@payloadcms/ui/utilities/upsertPreferences";
import { PayloadRequest } from "payload";

const TENANT_COOKIE_NAME = "payload-tenant-id";

function parseCookie(
  cookieHeader: string | null | undefined,
  name: string,
): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp("(?:^|;)\\s*" + name + "\\s*=\\s*([^;]+)"),
  );
  return match ? match[1].trim() : null;
}

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
 * Get the theme name for the current tenant.
 *
 * Pass `tenantId` to resolve via the document's own tenant (preferred).
 * Falls back to the client-authoritative cookie, then the `admin-tenant-select`
 * user preference when not provided.
 */
const getThemeName = async ({
  req,
  tenantId: explicitTenantId,
}: {
  req: PayloadRequest;
  tenantId?: string;
}) => {
  if (!req.user) {
    return null;
  }

  // If the caller knows the tenant ID from the document itself, skip the
  // user-preference lookup entirely to avoid theme/tenant mismatch on autosave.
  if (explicitTenantId) {
    const tenant = await req.payload.findByID({
      collection: "tenants",
      id: Number(explicitTenantId),
      disableErrors: true,
    });
    if (tenant) {
      const themeName = "theme" in tenant && (tenant.theme as string);
      if (themeName) return themeName;
    }
  }

  // Client-authoritative: check cookie first
  const cookieValue = parseCookie(
    req.headers?.get("cookie"),
    TENANT_COOKIE_NAME,
  );
  if (cookieValue) {
    const parsed = Number(cookieValue);
    if (Number.isFinite(parsed)) {
      const tenant = await req.payload.findByID({
        collection: "tenants",
        id: parsed,
        disableErrors: true,
      });
      if (tenant) {
        const themeName = "theme" in tenant && (tenant.theme as string);
        if (themeName) return themeName;
      }
    }
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
      const userId = typeof req.user === "number" ? req.user : Number(req.user);
      user = (await req.payload.findByID({
        collection: "users",
        id: userId,
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
    disableErrors: true,
  });

  if (!tenant) {
    return null;
  }
  const themeName = "theme" in tenant && (tenant.theme as string);

  if (!themeName) {
    return null;
  }

  return themeName;
};

export default getThemeName;
