import type {
  CollectionConfig,
  CollectionSlug,
  Config,
  FieldHook,
} from "payload";
import { hasNamedField } from "./utils";
import { swizzleTenantFilteringInAccessControl } from "./access";
import { getPreference, setPreference } from "@dexilion/payload-utils";
import translationEn from "../translations/en.json";

export { isUserInTenant } from "./isUserInTenant";
export { getTenantName } from "./getTenantName";

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
   * Enable debug logging.
   */
  debug?: boolean;
};

const DEFAULT_TENANTS_SLUG = "tenants";
const DEFAULT_TENANT_FIELD_NAME = "tenant";
const DEFAULT_TENANT_FIELD_LABEL_ON_AUTH_COLLECTION = "Tenants";
const DEFAULT_TENANT_FIELD_LABEL_ON_TENANTS_COLLECTION = "Users";
const DEFAULT_TENANT_LABEL_FIELD_NAME = "domain";

export const multiTenantPlugin =
  (options: PayloadMultiTenantPluginOptions = {}) =>
  (incomingConfig: Config): Config => {
    // Set defaults
    const tenantsSlug = (options.tenantsSlug ??
      DEFAULT_TENANTS_SLUG) as CollectionSlug;
    const tenantFieldName =
      options.tenantFieldName ?? DEFAULT_TENANT_FIELD_NAME;
    const tenantScopedCollectionSlugs = options.collections ?? [];

    const config: Config = { ...incomingConfig };
    config.collections = [...(incomingConfig.collections ?? [])];

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

    // Identify the tenants collection
    let tenantsCollection = config.collections.find(
      (c) => c.slug === tenantsSlug,
    );
    if (!tenantsCollection) {
      tenantsCollection = {
        slug: tenantsSlug,
        access: {
          read: () => true,
        },
        admin: {
          defaultColumns: ["name"],
          useAsTitle: "name",
        },
        fields: [
          {
            name: "name",
            type: "text",
            required: true,
            unique: true,
          },
          {
            name: "logo",
            type: "upload",
            relationTo: (options.mediaSlug ?? "media") as CollectionSlug,
            access: {
              create: () => false,
            },
            admin: {
              description: ({ t }) =>
                // @ts-ignore
                t("plugin-multi-tenant:logoFieldDescription"),
            },
          },
        ],
      } satisfies CollectionConfig;
      config.collections.push(tenantsCollection);
    }

    // Add tenantField relation to auth collection
    authCollection.fields.push({
      name: tenantFieldName,
      label:
        options.tenantFieldLabelOnAuthCollection ??
        DEFAULT_TENANT_FIELD_LABEL_ON_AUTH_COLLECTION,
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
      label:
        options.tenantFieldLabelOnTenantsCollection ??
        DEFAULT_TENANT_FIELD_LABEL_ON_TENANTS_COLLECTION,
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
    tenantsCollection.access = {
      read: ({ req }) => {
        const domainFieldName =
          options.tenantLabelFieldName ?? DEFAULT_TENANT_LABEL_FIELD_NAME;
        const host =
          req.headers.get("x-forwarded-host") ?? req.headers.get("host");
        const user = req.user;

        if (!host && !user) {
          return false;
        }

        return {
          or: [
            //{ [domainFieldName]: { equals: host } },
            { [tenantFieldName]: { contains: user?.id } },
          ],
        };
      },
    };

    // Add tenantField and access control to tenant-scoped collections
    for (const slug of tenantScopedCollectionSlugs) {
      const collection = config.collections.find((c) => c.slug === slug);
      if (!collection) {
        throw new Error(
          `[@dexilion/payload-multi-tenant] Collection "${slug}" not found in` +
            ` config.collections.`,
        );
      }
      if (collection.auth) {
        throw new Error(
          `[@dexilion/payload-multi-tenant] Collection "${slug}" is ` +
            `auth-enabled and cannot be tenant-scoped via "collections".`,
        );
      }

      collection.fields = collection.fields ?? [];
      if (!hasNamedField(collection.fields, tenantFieldName)) {
        collection.fields.push({
          name: tenantFieldName,
          type: "relationship",
          // Payload types narrow `relationTo` to known collection slugs.
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
            `"${slug}" already has a field named "${tenantFieldName}".`,
        );
      }

      // Wrap existing access control with tenant scoping
      const originalAccess = collection.access ?? {};
      collection.access = swizzleTenantFilteringInAccessControl({
        access: originalAccess,
        tenantFieldName,
        debug: options.debug,
      });
    }

    // Add tenant selector to admin UI
    config.admin = config.admin || {};
    config.admin.components = config.admin.components || {};
    config.admin.components.actions = config.admin.components.actions || [];
    config.admin.components.actions.push({
      path: "@dexilion/payload-multi-tenant/TenantSelect",
      clientProps: {
        tenantSlug: tenantsSlug,
        tenantLabelFieldName:
          options.tenantLabelFieldName ?? DEFAULT_TENANT_LABEL_FIELD_NAME,
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

const setTenantPreference: FieldHook<any, any, any> = async ({
  req,
  operation,
}) => {
  if (operation === "create") {
    const existingPreference = await getPreference<number | undefined>({
      req,
      key: "admin-tenant-select",
    });
    if (existingPreference == null) {
      setPreference({
        req,
        key: "admin-tenant-select",
        value: 1,
      });
    }
  }
};
