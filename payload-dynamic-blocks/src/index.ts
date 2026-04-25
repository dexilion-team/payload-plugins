import { CollectionSlug, Config } from "payload";

import { createWidgetCollection } from "./collections/Widgets";

type CollectionFieldMap = {
  slug: CollectionSlug;
  blockFieldName?: string;
  contentFieldName?: string;
};

interface PluginOptions {
  collections: CollectionSlug[] | CollectionFieldMap[];
  enable?: boolean;
}

const dynamicBlocks = ({
  collections: collectionsToAugment,
  enable,
}: PluginOptions) => {
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

    for (const collectionSlug of collectionsToAugment) {
      injectBlocksIntoCollection(collectionSlug, config);
    }

    return config;
  };
};

const injectBlocksIntoCollection = (
  collectionSlug: CollectionSlug | CollectionFieldMap,
  config: Config,
) => {
  const slug =
    typeof collectionSlug === "string" ? collectionSlug : collectionSlug.slug;
  const blockFieldName =
    typeof collectionSlug === "string"
      ? "blocks"
      : collectionSlug.blockFieldName || "blocks";
  const contentFieldName =
    typeof collectionSlug === "string"
      ? "content"
      : collectionSlug.contentFieldName || "content";
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
          const blocksValue = data[blockFieldName];
          if (Array.isArray(blocksValue)) {
            data[contentFieldName] = blocksValue;
          }
        }
        return data;
      },
    ],
    afterRead: [
      ...(collection.hooks?.afterRead || []),
      async ({ doc }) => {
        const contentValue = doc[contentFieldName];
        if (Array.isArray(contentValue)) {
          doc[blockFieldName] = contentValue;
        }
        return doc;
      },
    ],
  };

  // Placeholders - needed to import client components
  config.blocks = config.blocks || [];
  config.blocks.push({
    custom: {
      origin: "@dexilion/payload-dynamic-blocks",
    },
    slug: "__dynamic_block_placeholder__",
    fields: [
      {
        name: "placeholderRichText",
        type: "richText",
        hidden: true,
        virtual: true,
        admin: {
          hidden: true,
        },
      },
    ],
  });

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
