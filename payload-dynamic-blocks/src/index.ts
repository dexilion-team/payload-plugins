import { CollectionSlug, Config } from "payload";

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

    // Inject the Widgets collection
    config.collections = [
      ...(config.collections || []),
      createWidgetCollection(),
    ];

    for (const slug of collections) {
      injectBlocksIntoCollection(slug, config, features);
    }

    return config;
  };
};

const injectBlocksIntoCollection = (
  slug: CollectionSlug,
  config: Config,
  fieldName: string,
  features?: PluginOptions["features"],
) => {
  // const slug =
  //   typeof collectionSlug === "string" ? collectionSlug : collectionSlug.slug;
  // const blockFieldName =
  //   typeof collectionSlug === "string"
  //     ? "blocks"
  //     : collectionSlug.blockFieldName || "blocks";
  // const contentFieldName =
  //   typeof collectionSlug === "string"
  //     ? "content"
  //     : collectionSlug.contentFieldName || "content";
  const collection = config.collections?.find(
    (collection) => collection.slug === slug,
  );

  if (!collection) {
    throw new Error(
      `[@dexilion/payload-dynamic-blocks] Collection with slug "${slug}" not found. Skipping dynamic block injection for this collection.`,
    );
  }

  // Collection-level beforeChange hook to capture dynamic block data into the json field.
  // This fires before field-level processing, so it sees raw submitted data regardless
  // of whether block types are configured in the schema.
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

  // Resolve requested features
  if (features?.richText ?? true) {
    config = richTextFeature(config);
  }

  // Placeholder block - at least one block type must exist to avoid crash
  config.blocks = config.blocks || [];
  if (config.blocks.length === 0) {
    config.blocks.push({
      custom: {
        origin: "@dexilion/payload-dynamic-blocks",
      },
      slug: "__dynamic_block_placeholder__",
      fields: [],
    });
  }

  collection.fields = [
    ...(collection.fields || []),
    // The "frontend" field that content editors interact with, rendered as blocks.
    {
      name: blockFieldName,
      type: "blocks",
      blocks: [],
      admin: {
        components: {
          Field: "@dexilion/payload-dynamic-blocks/server/WidgetField",
        },
      },
    },
    // The "backend" field that stores the actual block data as JSON.
    {
      name: contentFieldName,
      type: "json",
      admin: {
        hidden: true,
      },
    },
  ];
};

export default dynamicBlocks;
