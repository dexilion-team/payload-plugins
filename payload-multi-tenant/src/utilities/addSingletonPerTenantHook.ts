import { CollectionConfig, CollectionSlug } from "payload";
import { getActiveTenantIDFromReq, getRelationshipID } from "../utils";

export const addSingletonPerTenantHook = (
  collection: CollectionConfig,
  tenantFieldName: string,
  tenantsSlug: CollectionSlug,
) => {
  collection.hooks = collection.hooks ?? {};
  collection.hooks.beforeChange = [
    ...(collection.hooks.beforeChange ?? []),
    async ({ data, operation, req }) => {
      if (operation !== "create") {
        return data;
      }

      const dataTenantID = getRelationshipID(
        (data as Record<string, unknown> | undefined)?.[tenantFieldName],
      );
      const activeTenantID =
        dataTenantID ??
        (await getActiveTenantIDFromReq(req, tenantFieldName, tenantsSlug));

      if (activeTenantID == null) {
        return data;
      }

      if (
        data &&
        !Object.prototype.hasOwnProperty.call(data, tenantFieldName)
      ) {
        (data as Record<string, unknown>)[tenantFieldName] = activeTenantID;
      }

      const existing = await req.payload.find({
        collection: collection.slug as CollectionSlug,
        limit: 1,
        pagination: false,
        overrideAccess: true,
        req,
        where: {
          [tenantFieldName]: {
            equals: activeTenantID,
          },
        },
      });

      if (existing.totalDocs > 0) {
        throw new Error(
          "[@dexilion/payload-multi-tenant] Global " +
            `"${collection.slug}" already exists for this tenant.`,
        );
      }

      return data;
    },
  ];
};
