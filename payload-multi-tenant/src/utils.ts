import type {
  CollectionConfig,
  CollectionSlug,
  Payload,
  PayloadRequest,
  Where,
} from "payload";
import { getPreference, isObject, isWhere } from "@dexilion/payload-utils";

type RelationshipID = number | string;

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

const getRelationshipIDs = (value: unknown): RelationshipID[] => {
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

export const getActiveTenantIDFromReq = async (
  req: PayloadRequest | undefined,
  tenantFieldName: string,
  tenantsSlug: CollectionSlug = "tenants",
): Promise<RelationshipID | null> => {
  if (!req) {
    return null;
  }

  const preference = await getPreference<number | undefined>({
    req,
    key: "admin-tenant-select",
  });

  if (preference != null) {
    return preference;
  }

  const userTenantIDs = getUserTenantIDsFromReq(req, tenantFieldName);
  if (userTenantIDs.length > 0) {
    return userTenantIDs[0] ?? null;
  }

  if (!req.user?.id) {
    return null;
  }

  const tenantMatch = await req.payload.find({
    collection: tenantsSlug,
    limit: 1,
    pagination: false,
    overrideAccess: true,
    req,
    where: {
      [tenantFieldName]: {
        contains: req.user.id,
      },
    },
  });

  return tenantMatch.docs[0]?.id ?? null;
};

export const getActiveTenantIDFromUser = async ({
  payload,
  tenantFieldName,
  tenantsSlug,
  user,
}: {
  payload: Payload;
  tenantFieldName: string;
  tenantsSlug: CollectionSlug;
  user: PayloadRequest["user"] | undefined;
}): Promise<RelationshipID | null> => {
  if (!user?.id) {
    return null;
  }

  const userSlug = payload.config.admin.user;
  const preferenceResult = await payload.find({
    collection: "payload-preferences" as CollectionSlug,
    limit: 1,
    pagination: false,
    overrideAccess: true,
    where: {
      and: [
        { key: { equals: "admin-tenant-select" } },
        { "user.value": { equals: user.id } },
        { "user.relationTo": { equals: userSlug } },
      ],
    },
  });

  const preference = preferenceResult.docs[0] as any;
  const preferenceValue = getRelationshipID(preference?.value);
  if (preferenceValue != null) {
    return preferenceValue;
  }

  const tenantMatch = await payload.find({
    collection: tenantsSlug,
    limit: 1,
    pagination: false,
    overrideAccess: true,
    where: {
      [tenantFieldName]: {
        contains: user.id,
      },
    },
  });

  return tenantMatch.docs[0]?.id ?? null;
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
