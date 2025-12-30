import { Config } from "payload";
import sharp from "sharp";
import { lexicalEditor } from "@payloadcms/richtext-lexical";

import { Media } from "./collections/Media";
import { Pages } from "./collections/Pages";

export type PayloadPMSPluginOptions = {};

export const pmsPlugin =
  (options: PayloadPMSPluginOptions = {}) =>
  (incomingConfig: Config): Config => {
    const config: Config = { ...incomingConfig };
    config.collections = [...(incomingConfig.collections ?? [])];

    // Add PMS collections
    config.collections.push(Media);
    config.collections.push(Pages);

    config.sharp = config.sharp || sharp;
    config.editor = config.editor || lexicalEditor();

    return config;
  };
