import { CollectionConfig, CollectionSlug } from "payload";
import { getPreference } from "@dexilion/payload-utils";
import { hasNamedField } from "../utils";
import { swizzleTenantFilteringInAccessControl } from "../access/swizzleTenantFilteringInAccessControl";

export const scopeCollectionToTenant = (
  collection: CollectionConfig,
  tenantsSlug: CollectionSlug,
  tenantFieldName: string,
  debug?: boolean,
) => {
  if (collection.auth) {
    throw new Error(
      `[@dexilion/payload-multi-tenant] Collection "${collection.slug}" is ` +
        `auth-enabled and cannot be tenant-scoped via "collections".`,
    );
  }

  collection.fields = collection.fields ?? [];
  if (!hasNamedField(collection.fields, tenantFieldName)) {
    collection.fields.push({
      name: tenantFieldName,
      type: "relationship",
      relationTo: tenantsSlug,
      hasMany: false,
      required: true,
      admin: {
        allowCreate: true,
        hidden: true,
      },
      defaultValue: async ({ req }) => {
        const preference = await getPreference<number | undefined>({
          req,
          key: "admin-tenant-select",
        });

        const tenants = req.user?.[
          tenantFieldName as keyof typeof req.user
        ] as any;

        return preference ?? tenants?.[0]?.id;
      },
    });
  } else {
    throw new Error(
      "[@dexilion/payload-multi-tenant] Collection " +
        `"${collection.slug}" already has a field named "${tenantFieldName}".`,
    );
  }

  // Hide collection from admin UI if user has no tenants
  collection.admin = collection.admin ?? {};
  const originalHidden = collection.admin.hidden;
  collection.admin.hidden = ({ user }) => {
    // If there's already a hidden function/value, respect it
    if (typeof originalHidden === "function") {
      return originalHidden({ user });
    } else if (originalHidden === true) {
      return true;
    }

    // Hide if user has no tenants
    const tenantsDocs = user?.[tenantFieldName as keyof typeof user] as any;
    const tenants = tenantsDocs?.docs ?? [];
    
    return !tenants || (Array.isArray(tenants) && tenants.length === 0);
  };

  // Wrap existing access control with tenant scoping
  const originalAccess = collection.access ?? {};
  collection.access = swizzleTenantFilteringInAccessControl({
    access: originalAccess,
    tenantFieldName,
    debug,
  });
};
