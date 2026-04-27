import {
  BlocksField,
  CollectionConfig,
  CollectionSlug,
  Config,
  Field,
} from "payload";

import { createWidgetCollection } from "./collections/Widgets";
import { richTextFeature } from "./features/richText";

interface PluginOptions {
  collections: CollectionSlug[];
  enable?: boolean;
  features?: {
    richText?: boolean;
  };
}

const dynamicBlocks = ({ collections, enable, features }: PluginOptions) => {
  return async (incomingConfig: Config): Promise<Config> => {
    if (enable === false) {
      return incomingConfig;
    }

    const config = { ...incomingConfig };

    // Resolve requested features
    if (features?.richText ?? true) {
      richTextFeature(config);
    }

    // Inject the Widgets collection
    config.collections = [
      ...(config.collections || []),
      createWidgetCollection(),
    ];

    // Finally resolve the dynamic blocks fields
    for (const slug of collections) {
      setupDynamicBlocksFields(slug, config);
    }

    return config;
  };
};

/**
 * Parse and resolve all dynamic blocks fields into frontend
 * and backend fields and hooks.
 */
const setupDynamicBlocksFields = (slug: CollectionSlug, config: Config) => {
  const collection = config.collections?.find(
    (collection) => collection.slug === slug,
  );

  if (!collection) {
    throw new Error(
      `[@dexilion/payload-dynamic-blocks] Collection with slug "${slug}" not ` +
        `found. Skipping dynamic block injection for this collection.`,
    );
  }

  applyToDynamicBlocksFields(
    collection.fields || [],
    (fieldName, fields, field) => {
      // Frontend
      setupFrontendForField(field, fields, slug);

      // TODO: Support nested dynamic blocks (blocks inside blocks) - currently only top-level blocks fields are supported

      // Backend
      setupPersistenceForField(collection, fieldName);
    },
  );
};

const setupFrontendForField = (
  field: BlocksField,
  fields: Field[],
  collectionSlug: CollectionSlug,
) => {
  if ((field.blocks ?? []).length !== 0) {
    throw new Error(
      `[@dexilion/payload-dynamic-blocks] The dynamic "blocks" field ` +
        `"${field.name}" in collection "${collectionSlug}" must not have any block ` +
        `types defined if 'custom: { dynamic: true }' is set.`,
    );
  }

  // Placeholder block - at least one block type must exist to avoid crash
  field.blocks = [{ slug: "__unused__", fields: [] }];

  if (!field.admin) {
    field.admin = {};
  }

  if (!field.admin.components) {
    field.admin.components = {};
  }

  if (!field.admin.components.Cell) {
    field.admin.components.Cell = {
      path: "@dexilion/payload-dynamic-blocks/WidgetCell",
    };
  }

  if (!field.admin.components.Field) {
    field.admin.components.Field = {
      path: "@dexilion/payload-dynamic-blocks/WidgetField",
    };
  }

  field.virtual = true; // This is not the field we'll persist
  const originalName = field.name;
  field.name = `${originalName}_blocks`; // Need to move the virtual field

  // Add the actual field that will be persisted as JSON
  fields.push({
    name: originalName,
    type: "json",
    admin: {
      hidden: true,
    },
  });
};

/**
 * Make sure the collection is configured for dynamic blocks
 */
const setupPersistenceForField = (
  collection: CollectionConfig,
  fieldName: string,
): CollectionConfig => {
  // Collection-level beforeChange hook to capture dynamic block data into
  // the json field. This fires before field-level processing, so it sees
  // raw submitted data regardless of whether block types are configured
  // in the schema.
  collection.hooks = {
    ...(collection.hooks || {}),
    beforeChange: [
      ...(collection.hooks?.beforeChange || []),
      async ({ data }) => {
        if (data) {
          const blocksValue = data[`${fieldName}_blocks`];
          if (Array.isArray(blocksValue)) {
            data[fieldName] = blocksValue;
          }
        }
        return data;
      },
    ],
    afterRead: [
      ...(collection.hooks?.afterRead || []),
      async ({ doc }) => {
        const contentValue = doc[fieldName];
        if (Array.isArray(contentValue)) {
          doc[`${fieldName}_blocks`] = contentValue;
        }
        return doc;
      },
    ],
  };

  return collection;
};

/**
 * Recursively walks a field tree and returns the names of all `blocks` fields
 * that have `custom: { dynamic: true }`.
 */
const applyToDynamicBlocksFields = (
  fields: Field[],
  transform: (fieldName: string, fields: Field[], field: BlocksField) => void,
) => {
  for (const field of fields) {
    // Blocks field types cannot have blocks child fields,
    // so this check is sufficient to identify dynamic blocks fields.
    if (
      "name" in field &&
      field.type === "blocks" &&
      (field.custom as Record<string, unknown> | undefined)?.dynamic === true
    ) {
      transform(field.name, fields, field);
    }

    // Recurse into container fields (group, array, collapsible, row, …)
    if ("fields" in field && Array.isArray(field.fields)) {
      applyToDynamicBlocksFields(field.fields, transform);
    }

    // Recurse into tabs
    if (field.type === "tabs") {
      for (const tab of field.tabs) {
        applyToDynamicBlocksFields(tab.fields, transform);
      }
    }
  }
};

export default dynamicBlocks;
