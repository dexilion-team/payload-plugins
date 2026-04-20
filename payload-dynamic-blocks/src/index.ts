import { Block, CollectionSlug, Config } from "payload";

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
    if (!enable) {
      return incomingConfig;
    }

    const config = { ...incomingConfig };

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
      virtual: true,
      blocks: [],
    },
    {
      name: contentFieldName,
      type: "json",
    },
  ];
};

export default dynamicBlocks;
