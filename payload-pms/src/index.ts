import type { Option, Block, CollectionConfig, Config } from "payload";
import sharp from "sharp";
import { lexicalEditor } from "@payloadcms/richtext-lexical";

import translationEn from "../translations/en.json";
import { Media } from "./collections/Media";
import { createPagesCollection } from "./collections/Pages";

export type PayloadPMSPluginOptions = {
  blocks: ({ config }: { config: Config }) => Promise<Block[]>;
  layouts: ({ config }: { config: Config }) => Promise<Option[]>;
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
      layouts: await options.layouts({ config }),
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
