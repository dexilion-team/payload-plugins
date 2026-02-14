import { endpointGuard } from "./access";
import { jsonResponse } from "./comms";

import type { Access, CollectionConfig, Config, Payload } from "payload";
import type { PayloadSyncCollectionMetadata } from "./types";

export type PayloadSyncPluginOptions = {
  /**
   * Enable the plugin. Defaults to `true`. Can be used to conditionally
   * disable the plugin, for example in development environments.
   */
  enabled?: boolean;

  /**
   * Endpoint read access control pattern.
   */
  access?: {
    read?: Access;
  };
};

const isUploadCollection = (collection: CollectionConfig): boolean => {
  return Object.hasOwn(collection, "upload") && collection.upload !== false;
};

const getCollectionMetadata = (
  payload: Payload,
): PayloadSyncCollectionMetadata[] =>
  payload.config.collections
    .filter(
      (c) =>
        ![
          "exports",
          "imports",
          "payload-kv",
          "payload-jobs",
          "payload-locked-documents",
          "payload-preferences",
          "payload-migrations",
        ].includes(c.slug),
    )
    .map((collection) => ({
      slug: collection.slug,
      upload: isUploadCollection(collection),
    }));

export const payloadSyncPlugin =
  (options: PayloadSyncPluginOptions = {}) =>
  async (incomingConfig: Config): Promise<Config> => {
    if (options.enabled === false) {
      return incomingConfig;
    }

    const config: Config = { ...incomingConfig };
    const guard = endpointGuard(options.access?.read);

    config.endpoints = [
      ...(incomingConfig.endpoints ?? []),
      {
        path: "/sync",
        method: "get",
        handler: guard((req) => {
          return jsonResponse({
            collections: getCollectionMetadata(req.payload),
          });
        }),
      },
    ];

    return config;
  };
