import type { CollectionConfig, PayloadRequest, Where } from "payload";
import { isObject, isWhere } from "@dexilion/payload-utils";

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
