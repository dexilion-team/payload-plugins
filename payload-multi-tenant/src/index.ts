import type { CollectionSlug, Config } from "payload";
import translationEn from "../translations/en.json";
import { scopeCollectionToTenant } from "./utilities/scopeCollectionToTenant";
import { setTenantPreference } from "./utilities/setTenantPreference";
import { createDefaultTenantsCollection } from "./collections/Tenant";
import { transformTenantScopedGlobals } from "./utilities/transformTenantScopedGlobals";

export { isUserInTenant } from "./isUserInTenant";
export { getTenantDomain } from "./getTenantDomain";
export { getRelationshipIDs } from "./utils";

export type PayloadMultiTenantPluginOptions = {
  /**
   * Collection slug for holding tenants.
   * @default "tenants"
   */
  tenantsSlug?: string;

  /**
   * Field name that links a document to a tenant.
   * @default "tenant"
   */
  tenantFieldName?: string;
  tenantFieldLabelOnAuthCollection?: string;
  tenantFieldLabelOnTenantsCollection?: string;
  tenantLabelFieldName?: string;

  /**
   * Collection slug for media uploads.
   * @default "media"
   */
  mediaSlug?: string;

  /**
   * Collection slugs that should be tenant-scoped (non-auth collections only).
   */
  collections?: string[];

  /**
   * Global slugs that should be tenant-scoped (emulated via collections).
   */
  globals?: string[];

  /**
   * Enable debug logging.
   */
  debug?: boolean;
};

export const multiTenantPlugin =
  (options: PayloadMultiTenantPluginOptions = {}) =>
  (incomingConfig: Config): Config => {
    // Set defaults
    const tenantsSlug = (options.tenantsSlug ?? "tenants") as CollectionSlug;
    const tenantFieldName = options.tenantFieldName ?? "tenant";
    const tenantScopedGlobalSlugs = options.globals ?? [];

    const config: Config = { ...incomingConfig };
    config.collections = [...(incomingConfig.collections ?? [])];
    config.globals = [...(incomingConfig.globals ?? [])];

    // Find auth collection
    const authCollection =
      config.collections.find((c) => c.slug === config.admin?.user) ??
      config.collections.find((c) => Boolean(c.auth));
    if (!authCollection) {
      throw new Error(
        "[@dexilion/payload-multi-tenant] No auth-enabled collection found" +
          ' (e.g. "users").',
      );
    }

    // Find the tenants collection if exists, or create it
    let tenantsCollection = config.collections.find(
      (c) => c.slug === tenantsSlug,
    );
    if (!tenantsCollection) {
      tenantsCollection = createDefaultTenantsCollection(
        tenantsSlug,
        options.mediaSlug,
      );
      config.collections.push(tenantsCollection);
    }

    // Add tenantField relation to auth collection
    authCollection.fields.push({
      name: tenantFieldName,
      label: options.tenantFieldLabelOnAuthCollection ?? "Tenants",
      type: "join",
      collection: tenantsCollection.slug as CollectionSlug,
      on: tenantFieldName,
      admin: {
        allowCreate: false,
      },
    });

    // Add join field to tenants collection linking to auth collection
    tenantsCollection.fields.push({
      name: tenantFieldName,
      label: options.tenantFieldLabelOnTenantsCollection ?? "Users",
      type: "relationship",
      relationTo: authCollection.slug as CollectionSlug,
      hasMany: true,
      required: false,
      admin: {
        disableListColumn: true,
      },
      hooks: {
        afterChange: [setTenantPreference],
      },
    });

    // Set access control on tenants collection
    tenantsCollection.access = {
      read: ({ req }) => {
        const host =
          req.headers.get("x-forwarded-host") ?? req.headers.get("host");
        const user = req.user;

        if (!host && !user) {
          return false;
        }

        return { [tenantFieldName]: { contains: user?.id } };
      },
    };

    // Transform tenant-scoped globals into collections
    const tenantScopedGlobalCollectionSlugs = [
      ...(options.collections ?? []),
      ...transformTenantScopedGlobals(
        tenantScopedGlobalSlugs,
        config.globals,
        config.collections,
        tenantFieldName,
        tenantsSlug,
      ),
    ];

    // Remove tenant-scoped globals from config.globals
    if (tenantScopedGlobalSlugs.length > 0) {
      config.globals = config.globals.filter(
        (global) => !tenantScopedGlobalSlugs.includes(global.slug),
      );
    }

    // Add tenantField and access control to tenant-scoped collections
    for (const slug of tenantScopedGlobalCollectionSlugs) {
      const collection = config.collections.find((c) => c.slug === slug);
      if (!collection) {
        throw new Error(
          `[@dexilion/payload-multi-tenant] Collection "${slug}" not found in` +
            ` config.collections.`,
        );
      }

      // Check if this is the redirects collection from @payloadcms/plugin-redirects
      // and add filterOptions to filter pages by selected tenant
      if (slug === "redirects") {
        const toField = collection.fields?.find(
          (f) =>
            "name" in f && f.name === "to" && "type" in f && f.type === "group",
        );
        if (toField && "fields" in toField && Array.isArray(toField.fields)) {
          const referenceField = toField.fields.find(
            (f: any) => f.name === "reference",
          );
          if (referenceField && "relationTo" in referenceField) {
            // Add filterOptions to filter the relationship by selected tenant
            (referenceField as any).filterOptions = async ({
              req,
            }: {
              req: any;
            }) => {
              if (!req.user) {
                return { id: { equals: "none" } };
              }

              // Get preference using the same key as TenantSelect
              const { getPreferences } = await import(
                "@payloadcms/ui/utilities/upsertPreferences"
              );
              const preference = await getPreferences<number | undefined>(
                "admin-tenant-select",
                req.payload,
                req.user.id,
                "users",
              );

              // If no tenant selected, don't show any pages
              if (!preference?.value) {
                return { id: { equals: "none" } };
              }

              // Filter pages by the selected tenant
              return {
                tenant: { equals: preference.value },
              };
            };
          }
        }
      }

      scopeCollectionToTenant(
        collection,
        tenantsSlug,
        tenantFieldName,
        options.debug,
      );
    }

    // Add tenant selector to admin UI
    config.admin = config.admin || {};
    config.admin.components = config.admin.components || {};
    config.admin.components.actions = config.admin.components.actions || [];
    config.admin.components.actions.push({
      path: "@dexilion/payload-multi-tenant/TenantSelect",
      clientProps: {
        tenantSlug: tenantsSlug,
        tenantLabelFieldName: options.tenantLabelFieldName ?? "name",
      },
    });

    // Add i18n
    config.i18n = {
      ...(config.i18n || {}),
      translations: {
        ...(config.i18n?.translations || {}),
        en: {
          ...(config.i18n?.translations?.en || {}),
          ...translationEn,
        },
      },
    };

    return config;
  };
