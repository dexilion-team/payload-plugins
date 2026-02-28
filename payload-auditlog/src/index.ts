import type { Config, Plugin, CollectionConfig } from "payload";

export type AuditLogOptions = {
  enabled?: boolean;
  collections?: CollectionConfig["slug"][];
};

type Hooks = NonNullable<CollectionConfig["hooks"]>;
type AfterChangeHook = NonNullable<Hooks["afterChange"]>[0];
type AfterDeleteHook = NonNullable<Hooks["afterDelete"]>[0];
type AfterLoginHook = NonNullable<Hooks["afterLogin"]>[0];

const defaultOptions: AuditLogOptions = {
  enabled: true,
  collections: [],
};

export const auditLogPlugin = (options: AuditLogOptions = {}): Plugin => {
  const { enabled, collections: collectionSlugsToAudit } = {
    ...defaultOptions,
    ...options,
  };

  if (!enabled) {
    return (incomingConfig: Config): Config => incomingConfig;
  }

  return (incomingConfig: Config): Config => {
    const config: Config = { ...incomingConfig };

    collectionSlugsToAudit?.forEach((slug) => {
      const collection = config.collections?.find(
        (col: CollectionConfig) => col.slug === slug,
      );
      if (!collection || collection == null) {
        throw new Error(
          `Collection with slug "${slug}" does not exist in the Payload configuration. Please ensure it is defined before using the audit log plugin.`,
        );
      }

      const afterLogin: AfterLoginHook = async ({ req, user }) => {
        const logger = req.payload.logger || console;

        logger.info(
          `[AUDIT] User ${user?.id ?? "ANONYMOUS"} performed a LOGIN action for collection "${collection.slug}".`,
        );
      };

      const afterChange: AfterChangeHook = async ({
        req,
        operation,
        doc,
        previousDoc,
      }) => {
        const action = operation === "create" ? "create" : "update";
        let changes = null;

        if (action === "update" && previousDoc) {
          changes = Object.keys(doc).reduce(
            (acc, key) => {
              if (
                JSON.stringify(doc[key]) !== JSON.stringify(previousDoc[key])
              ) {
                acc[key] = {
                  old: previousDoc[key],
                  new: doc[key],
                };
              }
              return acc;
            },
            {} as Record<string, any>,
          );
        }

        const logger = req.payload.logger || console;
        const serializedChanges = JSON.stringify(changes);

        logger.info(
          `[AUDIT] User ${req.user?.id ?? "ANONYMOUS"} performed a ${operation.toUpperCase()} action for collection "${collection.slug}" with document ID "${doc.id}". Changes: ${serializedChanges}`,
        );

        return doc;
      };

      const afterDelete: AfterDeleteHook = async ({ req, doc }) => {
        const logger = req.payload.logger || console;

        logger.info(
          `[AUDIT] User ${req.user?.id ?? "ANONYMOUS"} performed a DELETE action for collection "${collection.slug}" with document ID "${doc.id}".`,
        );
      };

      const hooks: any = {
        afterChange: [afterChange, ...(collection.hooks?.afterChange || [])],
        afterDelete: [afterDelete, ...(collection.hooks?.afterDelete || [])],
        afterLogin: [afterLogin, ...(collection.hooks?.afterLogin || [])],
      };

      collection.hooks = {
        ...collection.hooks,
        ...hooks,
      };
    });

    return config;
  };
};
