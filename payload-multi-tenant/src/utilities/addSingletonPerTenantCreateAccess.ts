import { CollectionConfig, CollectionSlug } from "payload";
import { getActiveTenantIDFromReq } from "../utils";

export const addSingletonPerTenantCreateAccess = (
  collection: CollectionConfig,
  tenantFieldName: string,
  tenantsSlug: CollectionSlug,
) => {
  const originalCreate = collection.access?.create;

  collection.access = {
    ...(collection.access ?? {}),
    create: async (args) => {
      const baseResult =
        typeof originalCreate === "function"
          ? await originalCreate(args)
          : (originalCreate ?? true);

      if (baseResult !== true) {
        return baseResult;
      }

      const activeTenantID = await getActiveTenantIDFromReq(
        args.req,
        tenantFieldName,
        tenantsSlug,
      );
      if (activeTenantID == null) {
        return true;
      }

      const existing = await args.req.payload.find({
        collection: collection.slug as CollectionSlug,
        limit: 1,
        pagination: false,
        overrideAccess: true,
        req: args.req,
        where: {
          [tenantFieldName]: {
            equals: activeTenantID,
          },
        },
      });

      return existing.totalDocs === 0;
    },
  };
};
