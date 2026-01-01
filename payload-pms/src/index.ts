import { Block, CollectionConfig, Config } from "payload";
import sharp from "sharp";
import { lexicalEditor } from "@payloadcms/richtext-lexical";

import { Media } from "./collections/Media";
import { createPagesCollection } from "./collections/Pages";

export type PayloadPMSPluginOptions = {
  blocks: ({ config }: { config: Config }) => Promise<Block[]>;
  pagesOverride?: (pages: CollectionConfig) => CollectionConfig;
  mediaOverride?: (pages: CollectionConfig) => CollectionConfig;
};

export const pmsPlugin =
  (options: PayloadPMSPluginOptions) =>
  async (incomingConfig: Config): Promise<Config> => {
    const config: Config = { ...incomingConfig };
    config.collections = [...(incomingConfig.collections ?? [])];

    // Add Pages collection if it doesn't exist
    const Pages = createPagesCollection({
      widgets: await options.blocks({ config }),
    });
    const pagesCollectionExists = config.collections.some(
      (c) => c.slug === Pages.slug,
    );
    if (!pagesCollectionExists) {
      if (options.pagesOverride) {
        config.collections.push(options.pagesOverride(Pages));
      } else {
        config.collections.push(Pages);
      }
    }

    // Add Media collection if it doesn't exist
    const mediaCollectionExists = config.collections.some(
      (c) => c.slug === Media.slug,
    );
    if (!mediaCollectionExists) {
      if (options.mediaOverride) {
        config.collections.push(options.mediaOverride(Media));
      } else {
        config.collections.push(Media);
      }
    }

    config.sharp = config.sharp || sharp;
    config.editor = config.editor || lexicalEditor();

    return config;
  };
