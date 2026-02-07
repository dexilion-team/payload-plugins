import {
  CollectionSlug,
  Config,
  deepMergeWithSourceArrays,
  Field,
  PayloadRequest,
} from "payload";
import translationEn from "../translations/en.json";

export type PayloadNextedDocsPluginOptions = {
  /**
   * Collection slugs that should have nested docs functionality.
   */
  collections: string[];

  /**
   * Override where to find the slug field for the pages collection.
   */
  pagesSlugPath?: string;
};

export const nestedDocsPlugin =
  (options: PayloadNextedDocsPluginOptions) =>
  (incomingConfig: Config): Config => {
    const config: Config = { ...incomingConfig };

    // Extend collections with nested docs fields
    config.collections = [...(incomingConfig.collections ?? [])];
    for (const slug of options.collections) {
      const collection = config.collections.find((c) => c.slug === slug);
      if (!collection) {
        throw new Error(
          `[@dexilion/payload-nested-docs] Collection with slug "${slug}" not found.`,
        );
      }

      // Only add the parent field if it doesn't already exist
      if (!recursivelySearchForFieldByName(collection.fields, "parent")) {
        collection.fields.unshift(
          createParentField(
            slug as CollectionSlug,
            options.pagesSlugPath ?? "slug",
          ),
        );
      }
    }

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

function recursivelySearchForFieldByName(
  fields: Field[],
  name: string,
): Field | null {
  for (const field of fields) {
    if ("name" in field && field.name === name) {
      return field;
    }

    if ("tabs" === field.type && "tabs" in field) {
      for (const tab of field.tabs) {
        const nestedField = recursivelySearchForFieldByName(tab.fields, name);
        if (nestedField) {
          return nestedField;
        }
      }
    }

    if ("group" === field.type && "fields" in field) {
      const nestedField = recursivelySearchForFieldByName(field.fields, name);
      if (nestedField) {
        return nestedField;
      }
    }
  }

  return null;
}

export function recursivelySearchForDataByName<R>(
  data: Record<string, unknown>,
  name: string,
  blacklist: string[] = [],
): R | null {
  for (const key in data) {
    if (key === name && data.hasOwnProperty(key)) {
      return data[key] as R;
    }

    const value = data[key];
    if (
      typeof value === "object" &&
      value !== null &&
      !blacklist.includes(key)
    ) {
      const nestedValue = recursivelySearchForDataByName<R>(
        value as Record<string, unknown>,
        name,
        blacklist,
      );
      if (nestedValue !== null) {
        return nestedValue;
      }
    }
  }

  return null;
}

export function createParentField(
  slug: CollectionSlug,
  pagesSlugPath: string,
  overrides?: Partial<Field>,
): Field {
  return deepMergeWithSourceArrays(
    {
      name: "parent",
      label: "Parent",
      type: "relationship",
      relationTo: slug as CollectionSlug,
      hasMany: false,
      admin: {
        allowCreate: false,
        description:
          "Select the parent document for nesting. Leave empty for top-level documents.",
        placeholder: "",
      },
      defaultValue: async ({
        req,
        data,
      }: {
        req: PayloadRequest;
        data: Record<string, unknown>;
      }) => {
        // Don't set default for the home page itself
        const currentSlug = recursivelySearchForDataByName(data, "slug");
        if (currentSlug === "home") {
          return undefined;
        }

        // Find the home page within the same tenant
        const tenant = recursivelySearchForDataByName(data, "tenant");

        const query: Record<string, any> = {
          [pagesSlugPath]: { equals: "home" },
        };

        // Filter by tenant if tenant field exists
        if (tenant !== null) {
          query.tenant = { equals: tenant };
        }

        try {
          const homePage = await req.payload.find({
            collection: slug as CollectionSlug,
            where: query,
            limit: 1,
          });

          if (homePage.docs[0]) {
            return homePage.docs[0].id;
          }
        } catch (error) {
          console.error(
            "[@dexilion/payload-nested-docs] Error finding home page:",
            error,
          );
        }

        return undefined;
      },
      filterOptions: ({ data }: { data: any }) => {
        return {
          id: { not_equals: data.id },
        };
      },
    },
    overrides || {},
  );
}

export function createSlugField(
  collection: CollectionSlug,
  pagesSlugPath: string,
): Field {
  return {
    name: "slug",
    type: "text",
    admin: {
      description: ({ t }) =>
        // @ts-ignore
        t("plugin-nested-docs:urlSlugDescription"),
    },
    required: true,
    hasMany: false,
    validate: async (value, { req: { t, payload }, data, id }) => {
      // Check format
      if (!Boolean(value?.match(/^[a-z0-9-]+$/))) {
        // @ts-ignore
        return t("validation:pages:urlSlugFormat");
      }

      // Check uniqueness within parent and tenant
      if (collection && value) {
        const tenant = recursivelySearchForDataByName(data, "tenant");

        const query: Record<string, any> = {
          [pagesSlugPath]: { equals: value },
        };

        // Exclude current document from the query
        if (id) {
          query.id = { not_equals: id };
        }

        // Check within the same tenant if tenant field exists
        if (tenant !== null) {
          query.tenant = { equals: tenant };
        }

        try {
          const existingDocs = await payload.find({
            collection: collection as CollectionSlug,
            where: query,
            limit: 1,
          });

          if (existingDocs.docs.length > 0) {
            // @ts-ignore
            return t("plugin-nested-docs:slugMustBeUnique");
          }
        } catch (error) {
          console.error(
            "[@dexilion/payload-nested-docs] Error validating slug uniqueness:",
            error,
          );
        }
      }

      return true;
    },
  };
}

const generatePath =
  ({
    collection,
    options,
  }: {
    collection: string;
    options?: {
      slugFieldName: string;
      slugFieldLabel: string;
      parentFieldName: string;
    };
  }) =>
  async ({
    req: { payload },
    originalDoc,
  }: {
    req: { payload: any };
    originalDoc?: any;
  }): Promise<string> => {
    const slugFieldName = options?.slugFieldName || "slug";
    const parentFieldName = options?.parentFieldName || "parent";
    const slug = recursivelySearchForDataByName(originalDoc, slugFieldName);
    const parent = recursivelySearchForDataByName(originalDoc, parentFieldName);

    if (slug == null || slug === "") {
      return `/${originalDoc.id}`;
    }

    if (slug === "home") {
      return "/";
    }

    if (parent == null) {
      return `/${slug ?? ""}`;
    }
    //console.log({ parent, slug });
    let doc = await payload.findByID({
      collection: collection as CollectionSlug,
      id: parent,
      depth: 0,
      draft: false,
    });
    if ((doc as any)[parentFieldName] == null) {
      doc = await payload.findByID({
        collection: collection as CollectionSlug,
        id: parent,
        depth: 0,
        draft: true,
      });
    }
    const path = recursivelySearchForDataByName(doc, "path");

    return `${path ? path : ""}/${slug}`.replace(/\/\/+/g, "/");
  };

export function createPathField(
  collection: string,
  options?: {
    slugFieldName: string;
    slugFieldLabel: string;
    parentFieldName: string;
  },
): Field {
  return {
    name: "path",
    type: "text",
    admin: {
      readOnly: true,
      description: ({ t }) =>
        // @ts-ignore
        t("plugin-nested-docs:pathDescription", {
          slugFieldLabel: options?.slugFieldLabel || "Slug",
        }),
    },
    hooks: {
      afterChange: [
        generatePath({
          collection,
          options,
        }),
      ],
      afterRead: [
        generatePath({
          collection,
          options,
        }),
      ],
    },
  };
}
