import { CollectionConfig, CollectionSlug, GlobalConfig } from "payload";
import { addSingletonPerTenantHook } from "./addSingletonPerTenantHook";
import { addSingletonPerTenantCreateAccess } from "./addSingletonPerTenantCreateAccess";

export const transformTenantScopedGlobals = (
  tenantScopedGlobalSlugs: string[],
  globals: GlobalConfig[],
  collections: CollectionConfig[],
  tenantFieldName: string,
  tenantsSlug: CollectionSlug,
) => {
  const tenantScopedCollectionSlugs: string[] = [];

  // Emulate tenant-scoped globals as collections
  for (const slug of tenantScopedGlobalSlugs) {
    // Find the global
    const global = globals.find((entry) => entry.slug === slug);
    if (!global) {
      throw new Error(
        `[@dexilion/payload-multi-tenant] Global "${slug}" not found in` +
          ` config.globals.`,
      );
    }

    // Ensure no collection with the same slug exists
    if (collections.some((collection) => collection.slug === slug)) {
      throw new Error(
        `[@dexilion/payload-multi-tenant] Collection "${slug}" already exists.` +
          " Remove the collection or the global override to avoid collisions.",
      );
    }

    const globalLabel = global.label;
    const globalCollection: CollectionConfig = {
      slug: global.slug,
      fields: [...global.fields],
      access: {
        ...(global.access?.read ? { read: global.access.read } : {}),
        ...(global.access?.update
          ? { create: global.access.update, update: global.access.update }
          : {}),
        ...(global.access?.readVersions
          ? { readVersions: global.access.readVersions }
          : {}),
        delete: () => false,
      },
      admin: {
        ...(global.admin?.group ? { group: global.admin.group } : {}),
        ...(global.admin?.description
          ? { description: global.admin.description }
          : {}),
        ...(global.admin?.preview ? { preview: global.admin.preview } : {}),
        ...(global.admin?.livePreview
          ? { livePreview: global.admin.livePreview }
          : {}),
        ...(global.admin?.meta ? { meta: global.admin.meta } : {}),
      },
      disableBulkEdit: true,
      disableDuplicate: true,
      labels: globalLabel
        ? { singular: globalLabel, plural: globalLabel }
        : undefined,
    };
    console.log(globalLabel);
    globalCollection.admin = globalCollection.admin ?? {};
    globalCollection.admin.components = globalCollection.admin.components ?? {};
    globalCollection.admin.components.views =
      globalCollection.admin.components.views ?? {};
    globalCollection.admin.components.views.list = {
      Component: {
        path: "@dexilion/payload-multi-tenant/GlobalCollectionRedirect",
        serverProps: {
          collectionSlug: global.slug,
          tenantFieldName,
          tenantsSlug,
        },
      },
    };

    addSingletonPerTenantHook(globalCollection, tenantFieldName, tenantsSlug);
    addSingletonPerTenantCreateAccess(
      globalCollection,
      tenantFieldName,
      tenantsSlug,
    );
    collections.push(globalCollection);
    tenantScopedCollectionSlugs.push(globalCollection.slug);
  }

  return tenantScopedCollectionSlugs;
};
