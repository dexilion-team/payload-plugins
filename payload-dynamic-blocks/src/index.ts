import {
  Block,
  CollectionBeforeReadHook,
  CollectionSlug,
  Config,
} from "payload";

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

  collection.fields = [
    ...(collection.fields || []),
    {
      name: blockFieldName,
      type: "blocks",
      blocks: [{ slug: "__placeholder__", fields: [] }],
      admin: {
        components: {
          Field: "@dexilion/payload-dynamic-blocks/server/WidgetField",
        },
      },
      hooks: {
        beforeChange: [
          ({ siblingData }) => {
            console.log(
              "Before change hook triggered for dynamic blocks field",
            );
          },
        ],
        afterRead: [
          async ({ value }) => {
            console.log("After read hook triggered for dynamic blocks field");
            return value as Block[];
          },
        ],
      },
    },
    {
      name: contentFieldName,
      type: "json",
      admin: {
        hidden: true,
      },
    },
  ];

  const beforeReadHook: CollectionBeforeReadHook<{ id: string }> = async ({
    doc,
    req,
  }) => {
    console.log(JSON.stringify(doc));
    return doc;
  };

  collection.hooks = {
    ...(collection.hooks || {}),
    beforeRead: [...(collection.hooks?.beforeRead || []), beforeReadHook],
  };
};

export default dynamicBlocks;
