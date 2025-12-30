import { recursivelyMergeObjects } from "@dexilion/payload-utils";
import { CollectionSlug, Config, Field, slugField } from "payload";
import translationEn from "../translations/en.json";

export type PayloadNextedDocsPluginOptions = {
  /**
   * Collection slugs that should have nested docs functionality.
   */
  collections: string[];
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
        collection.fields.unshift(createParentField(slug as CollectionSlug));
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

export function createParentField(
  slug: CollectionSlug,
  overrides?: Partial<Field>,
): Field {
  return recursivelyMergeObjects(
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
      filterOptions: ({ data }) => {
        return {
          id: { not_equals: data.id },
        };
      },
    },
    overrides || {},
  );
}

export function createSlugField(): Field {
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
    validate: async (value, { req: { t } }) =>
      Boolean(value?.match(/^[a-z0-9-]+$/)) ||
      // @ts-ignore
      t("validation:pages:urlSlugFormat"),
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
    const slug = originalDoc[slugFieldName];
    const parent = originalDoc[parentFieldName];

    if (slug == null || slug === "") {
      return `/${originalDoc.id}`;
    }

    if (slug === "home") {
      return "/";
    }

    if (parent == null) {
      return `/${slug ?? ""}`;
    }

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
    const path = (doc as any).path;

    return `${path}/${slug}`.replace(/\/\/+/g, "/");
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
