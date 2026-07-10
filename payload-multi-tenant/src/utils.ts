import type {
  CollectionConfig,
  CollectionSlug,
  Payload,
  PayloadRequest,
  Where,
} from "payload";
import { isObject } from "@dexilion/payload-utils";

type TenantDoc = Record<string, unknown> & { id: RelationshipID };
type RelationshipID = number | string;

export const isValidRelationshipID = (
  value: unknown,
): value is RelationshipID => {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return value.trim().length > 0;
  return false;
};
export const TENANT_COOKIE_NAME = "payload-tenant-id";

export function parseCookie(
  cookieHeader: string | null | undefined,
  name: string,
): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp("(?:^|;)\\s*" + name + "\\s*=\\s*([^;]+)"),
  );
  return match ? (match[1]?.trim() ?? null) : null;
}

export function getTenantIdFromHeaders(
  headers: Headers | undefined,
): RelationshipID | null {
  if (!headers) return null;
  const cookieHeader = headers.get("cookie");
  const value = parseCookie(cookieHeader, TENANT_COOKIE_NAME);
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export const getRelationshipID = (value: unknown): RelationshipID | null => {
  if (typeof value === "number" || typeof value === "string") return value;
  if (!isObject(value)) return null;

  const maybeID = value.id;
  if (typeof maybeID === "number" || typeof maybeID === "string")
    return maybeID;

  const maybeValue = value.value;
  if (typeof maybeValue === "number" || typeof maybeValue === "string")
    return maybeValue;

  if (isObject(value.value)) {
    const nestedID = value.value.id;
    if (typeof nestedID === "number" || typeof nestedID === "string")
      return nestedID;
  }

  return null;
};

export const getRelationshipIDs = (value: unknown): RelationshipID[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map(getRelationshipID)
      .filter((id): id is RelationshipID => id != null);
  }
  const id = getRelationshipID(value);
  return id == null ? [] : [id];
};

export const hasNamedField = (
  fields: CollectionConfig["fields"],
  name: string,
): boolean =>
  fields.some(
    (field) => isObject(field) && "name" in field && field.name === name,
  );

export const getUserTenantIDsFromReq = (
  req: PayloadRequest | undefined,
  tenantFieldName: string,
): RelationshipID[] => {
  if (!req?.user) {
    return [];
  }

  const tenantField = req.user[tenantFieldName as keyof typeof req.user] as any;
  return getRelationshipIDs(tenantField?.docs);
};

export const findUserTenants = async ({
  payload,
  req,
  tenantFieldName,
  tenantsSlug,
  user,
}: {
  payload: Payload;
  req?: PayloadRequest;
  tenantFieldName: string;
  tenantsSlug: CollectionSlug;
  user: PayloadRequest["user"] | null | undefined;
}): Promise<TenantDoc[]> => {
  if (!user?.id) {
    return [];
  }

  const result = await payload.find({
    collection: tenantsSlug,
    pagination: false,
    overrideAccess: true,
    req,
    where: {
      [tenantFieldName]: {
        contains: user.id,
      },
    },
  });

  return (result.docs as TenantDoc[]).filter(
    (tenant) => Boolean(tenant.hidden) !== true,
  );
};

export const getActiveTenantIDFromReq = async (
  req: PayloadRequest | undefined,
  tenantFieldName: string,
  tenantsSlug: CollectionSlug = "tenants",
): Promise<RelationshipID | null> => {
  if (!req) {
    return null;
  }

  // Client-authoritative fast path: trust the cookie
  const cookieTenant = getTenantIdFromHeaders(req.headers);
  if (
    cookieTenant != null &&
    (!req.user ||
      isUserTenant(getUserTenantIDsFromReq(req, tenantFieldName), cookieTenant))
  ) {
    return cookieTenant;
  }

  const tenants = await findUserTenants({
    payload: req.payload,
    req,
    tenantFieldName,
    tenantsSlug,
    user: req.user,
  });
  const cookieMatch =
    cookieTenant == null
      ? undefined
      : tenants.find((tenant) => String(tenant.id) === String(cookieTenant));

  return (cookieMatch ?? tenants[0])?.id ?? null;
};

export const resolveDefaultTenantID = async (
  req: PayloadRequest | undefined,
  tenantFieldName: string,
  tenantsSlug: CollectionSlug = "tenants",
): Promise<RelationshipID | null> => {
  const activeTenantID = await getActiveTenantIDFromReq(
    req,
    tenantFieldName,
    tenantsSlug,
  );
  if (activeTenantID != null) {
    return activeTenantID;
  }

  const userTenantIDs = getUserTenantIDsFromReq(req, tenantFieldName);
  return userTenantIDs[0] ?? null;
};

export const isUserTenant = (
  userTenantIDs: RelationshipID[],
  tenantID: RelationshipID | null | undefined,
): boolean => {
  if (tenantID == null) return false;
  return userTenantIDs.some((id) => String(id) === String(tenantID));
};

export const getActiveTenantIDFromUser = async ({
  payload,
  tenantFieldName,
  tenantsSlug,
  user,
  cookieTenantId,
}: {
  payload: Payload;
  tenantFieldName: string;
  tenantsSlug: CollectionSlug;
  user: PayloadRequest["user"] | undefined;
  cookieTenantId?: RelationshipID | null;
}): Promise<RelationshipID | null> => {
  if (!user?.id) {
    return null;
  }

  // Client-authoritative: the cookie tenant when the user has access to it,
  // otherwise the first tenant the selector dropdown would show.
  const tenants = await findUserTenants({
    payload,
    tenantFieldName,
    tenantsSlug,
    user,
  });
  const cookieMatch =
    cookieTenantId == null
      ? undefined
      : tenants.find((tenant) => String(tenant.id) === String(cookieTenantId));

  return (cookieMatch ?? tenants[0])?.id ?? null;
};

export const tenantWhereForReq = (
  req: PayloadRequest | undefined,
  tenantFieldName: string,
): Where | false => {
  const userTenantIDs = getUserTenantIDsFromReq(req, tenantFieldName);

  if (userTenantIDs.length === 0) {
    return false;
  }

  return { [tenantFieldName]: { in: userTenantIDs } };
};
