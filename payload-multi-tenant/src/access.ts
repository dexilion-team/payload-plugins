import { CollectionConfig, CollectionSlug, Where } from "payload";
import {
  getRelationshipID,
  getUserTenantIDsFromReq,
  tenantWhereForReq,
} from "./utils";
import { getPreference, isWhere } from "@dexilion/payload-utils";

const mergeWhere = (
  base: Where | boolean,
  tenantWhere: Where | false,
): Where | false => {
  if (!isWhere(base) || Object.keys(base).length === 0) {
    return tenantWhere;
  }

  if (!isWhere(tenantWhere) || Object.keys(tenantWhere).length === 0) {
    return base;
  }

  return { and: [base, tenantWhere] };
};

export const swizzleTenantFilteringInAccessControl = ({
  access,
  tenantFieldName,
  debug,
}: {
  access: CollectionConfig["access"];
  tenantFieldName: string;
  debug?: boolean;
}): CollectionConfig["access"] => {
  const originalAccess = access ?? {};
  return {
    ...originalAccess,
    read: async (args) => {
      const { result, reason } = await (async () => {
        const base =
          typeof originalAccess.read === "function"
            ? await originalAccess.read(args)
            : true;

        // No logged in user, no tenant associations possible
        if (!args.req?.user) {
          return {
            result: base,
            reason:
              "Unauthenticated user can't have tenants, fallback to user provided access.",
          };
        }

        // If there are no tenant associations, fall back to base access
        const userTenantIDs = getUserTenantIDsFromReq(
          args.req,
          tenantFieldName,
        );
        if (userTenantIDs.length === 0) {
          return {
            result: base,
            reason:
              "User has no tenant associations, fallback to user provided access.",
          };
        }

        // Use the user preference to filter reads in the admin interface
        const preference = await getPreference<number | undefined>({
          req: args.req,
          key: "admin-tenant-select",
        });
        if (preference != null) {
          return {
            result: mergeWhere(base, {
              [tenantFieldName]: { equals: preference },
            }),
            reason: "Narrowing by the user selected tenant preference.",
          };
        }

        // Fallback to filtering by all user tenants
        return {
          result: mergeWhere(base, {
            [tenantFieldName]: { in: userTenantIDs },
          }),
          reason: "Narrowing by all user tenant associations.",
        };
      })();

      if (debug) {
        console.log(
          `[@dexilion/payload-multi-tenant] Access Control - read: ${reason} |`,
          result,
        );
      }

      return result;
    },
    create: async (args) => {
      const { result, reason } = await (async () => {
        const base =
          typeof originalAccess.create === "function"
            ? await originalAccess.create(args)
            : true;

        // No logged in user, no tenant associations possible
        if (!args.req?.user) {
          return {
            result: false,
            reason:
              "Unauthenticated user can't have tenants, denying creation.",
          };
        }

        // Only restrict create if the tenant field is being set
        // Handles admin list view
        if (!args.data?.hasOwnProperty(tenantFieldName)) {
          return {
            result: base,
            reason: "Tenant field not set, fallback to user provided access.",
          };
        }

        // If the user has no tenant associations, fall back to base access
        const userTenantIDs = getUserTenantIDsFromReq(
          args.req,
          tenantFieldName,
        );
        if (userTenantIDs.length === 0) {
          return {
            result: base,
            reason:
              "User has no tenant associations, fallback to user provided access.",
          };
        }

        // If the document is not one with tenant association, fall back to base access
        const docTenantID = getRelationshipID(
          (args.data as Record<string, unknown> | undefined)?.[tenantFieldName],
        );
        if (docTenantID == null) {
          return {
            result: base,
            reason:
              "Document tenant ID is null, fallback to user provided access.",
          };
        }

        // Finally, check that the document tenant ID is in the user's tenant IDs
        return {
          result: userTenantIDs.includes(docTenantID),
          reason: "Checking document tenant ID is in user's tenant IDs.",
        };
      })();

      if (debug) {
        console.log(
          `[@dexilion/payload-multi-tenant] Access Control - create: ${reason} |`,
          result,
        );
      }

      return result;
    },
    update: async (args) => {
      const { result, reason } = await (async () => {
        const base =
          typeof originalAccess.update === "function"
            ? await originalAccess.update(args)
            : true;

        // If no user, no tenant checking is possible
        if (!args.req?.user) {
          return {
            result: false,
            reason: "Unauthenticated user can't have tenants, denying update.",
          };
        }

        // Check the tenant for the user
        const tenantWhere = tenantWhereForReq(args.req, tenantFieldName);
        return {
          result: mergeWhere(base, tenantWhere),
          reason: "Merging base where clause with tenant where clause.",
        };
      })();

      if (debug) {
        console.log(
          `[@dexilion/payload-multi-tenant] Access Control - update: ${reason} |`,
          result,
        );
      }

      return result;
    },
    delete: async (args) => {
      const { result, reason } = await (async () => {
        const base =
          typeof originalAccess.delete === "function"
            ? await originalAccess.delete(args)
            : true;

        // No user, no tenant checking is possible
        if (!args.req?.user) {
          return {
            result: false,
            reason: "Unauthenticated user can't have tenants, denying delete.",
          };
        }

        // Check the tenant for the user
        const tenantWhere = tenantWhereForReq(args.req, tenantFieldName);
        return {
          result: mergeWhere(base, tenantWhere),
          reason: "Merging base where clause with tenant where clause.",
        };
      })();

      if (debug) {
        console.log(
          `[@dexilion/payload-multi-tenant] Access Control - delete: ${reason} |`,
          result,
        );
      }

      return result;
    },
  };
};
