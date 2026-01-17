import type {
  Option,
  Block,
  CollectionConfig,
  Config,
  Tab,
  GlobalConfig,
} from "payload";
import sharp from "sharp";
import { lexicalEditor } from "@payloadcms/richtext-lexical";

import translationEn from "../translations/en.json";
import { createMediaCollection } from "./collections/Media";
import { createPagesCollection } from "./collections/Pages";
import { createNavGlobal } from "./collections/Nav";

export { sitemapGenerator } from "./sitemapGenerator";
export { robotsGenerator } from "./robotsGenerator";

export type PayloadPMSPluginOptions = {
  blocks: () => Promise<Block[]>;
  layouts: () => Promise<Option[]>;
  pagesOverride?: (pages: CollectionConfig) => CollectionConfig;
  mediaOverride?: (media: CollectionConfig) => CollectionConfig;
  navOverride?: (nav: GlobalConfig) => GlobalConfig;
  extraTabs?: Tab[];
  pagesSlug?: string;
  mediaSlug?: string;
  navSlug?: string;
  navDepth?: number;
  navExtraFields?: GlobalConfig["fields"];
};

export const pmsPlugin =
  (options: PayloadPMSPluginOptions) =>
  async (incomingConfig: Config): Promise<Config> => {
    const config: Config = { ...incomingConfig };
    config.collections = [...(incomingConfig.collections ?? [])];
    config.globals = [...(incomingConfig.globals ?? [])];

    // Add Pages collection if it doesn't exist
    const Pages = createPagesCollection({
      slug: options.pagesSlug,
      widgets: await options.blocks(),
      layouts: await options.layouts(),
      tabs: options.extraTabs || [],
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
    const Media = createMediaCollection({ slug: options.mediaSlug });
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

    // Add Nav global if it doesn't exist
    const Nav = createNavGlobal({
      slug: options.navSlug,
      pagesSlug: options.pagesSlug,
      depth: (options.navDepth || 1) - 1,
      extraFields: options.navExtraFields,
    });
    const navGlobalExists = config.globals.some((c) => c.slug === Nav.slug);
    if (!navGlobalExists) {
      if (options.navOverride) {
        config.globals.push(options.navOverride(Nav));
      } else {
        config.globals.push(Nav);
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
