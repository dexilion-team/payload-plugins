import type {
  CollectionConfig,
  CollectionSlug,
  Config,
  Field,
  Payload,
} from "payload";

export type PayloadSchedulePluginOptions = {
  /**
   * Enable or disable the plugin globally
   * @default true
   */
  enabled?: boolean;
  /**
   * Collection slugs to add the schedule field to
   * These collections MUST be draft-enabled
   */
  collections: CollectionSlug[];
  /**
   * Custom callback to trigger when a document is published
   * Useful for cache busting, webhooks, etc.
   */
  onPublish?: (args: {
    doc: any;
    collection: CollectionConfig;
    payload: Payload;
  }) => Promise<void> | void;
  /**
   * Custom field overrides for the schedule field
   */
  fieldOverrides?: (field: Field) => Field;
};

const SCHEDULE_FIELD_NAME = "scheduledAt";

const createScheduleField = (
  fieldOverrides?: (field: Field) => Field,
): Field => {
  const baseField: Field = {
    name: SCHEDULE_FIELD_NAME,
    type: "date",
    label: "Schedule for publication",
    admin: {
      description: "Set a date to automatically publish this document",
      position: "sidebar",
      date: {
        pickerAppearance: "dayOnly",
        displayFormat: "d MMM yyyy",
      },
    },
    validate: (value: string | string[] | Date | null | undefined) => {
      if (!value) return true;

      // Accept a Date object or a string
      const dateValue =
        value instanceof Date ? value : new Date(value as string);
      if (isNaN(dateValue.getTime())) return "Invalid date";
      return true;
    },
  };

  return fieldOverrides ? fieldOverrides(baseField) : baseField;
};

/**
 * Payload Schedule Plugin
 *
 * Adds a scheduling field to specified draft-enabled collections that allows
 * scheduling documents for automatic publication at a specific date.
 *
 * Features:
 * - Global enable/disable switch
 * - Per-collection configuration via plugin options
 * - Validates that collections are draft-enabled
 * - Uses Payload's CRON job scheduling API
 * - Supports custom onPublish callback for cache busting, etc.
 *
 * @example
 * ```ts
 * import { buildConfig } from 'payload'
 * import { schedulePlugin } from '@dexilion/payload-schedule'
 *
 * export default buildConfig({
 *   plugins: [
 *     schedulePlugin({
 *       enabled: true,
 *       collections: ['posts', 'pages'],
 *       onPublish: async ({ doc, collection, payload }) => {
 *         // Custom action like cache busting
 *         console.log(`Document ${doc.id} published from ${collection.slug}`);
 *       },
 *     }),
 *   ],
 * })
 * ```
 */
export const schedulePlugin =
  (pluginOptions: PayloadSchedulePluginOptions) =>
  (incomingConfig: Config): Config => {
    // Allow users to disable the plugin without removing it from their config
    if (pluginOptions.enabled === false) {
      return incomingConfig;
    }

    const config: Config = { ...incomingConfig };
    const {
      collections: targetCollections,
      onPublish,
      fieldOverrides,
    } = pluginOptions;

    // Validate that target collections are draft-enabled
    for (const collectionSlug of targetCollections) {
      const collection = config.collections?.find(
        (c) => c.slug === collectionSlug,
      );

      if (!collection) {
        throw new Error(
          `[@dexilion/payload-schedule] Collection "${collectionSlug}" not found in Payload config.`,
        );
      }

      const versions = collection.versions;
      const isDraftEnabled =
        typeof versions === "object" && versions?.drafts === true;

      if (!isDraftEnabled) {
        throw new Error(
          `[@dexilion/payload-schedule] Collection "${collectionSlug}" is not draft-enabled. ` +
            `Add "versions: { drafts: true }" to the collection config to enable scheduling.`,
        );
      }
    }

    // Add schedule field to target collections
    config.collections =
      config.collections?.map((collection) => {
        if (targetCollections.includes(collection.slug as CollectionSlug)) {
          const scheduleField = createScheduleField(fieldOverrides);

          // Check if the field already exists
          const fieldExists = collection.fields?.some(
            (field) => "name" in field && field.name === SCHEDULE_FIELD_NAME,
          );

          if (fieldExists) {
            return collection;
          }

          return {
            ...collection,
            fields: [...(collection.fields || []), scheduleField],
          };
        }
        return collection;
      }) ?? [];

    // Add cron job task to handle scheduled publications
    const scheduleTaskSlug = "publishScheduled" as const;

    const jobs = (config.jobs = config.jobs ?? ({} as any));
    if (!jobs.tasks) jobs.tasks = [] as any;

    // Check if task already exists before adding
    const taskExists = (jobs.tasks as any).some(
      (task: any) => task.slug === scheduleTaskSlug,
    );

    if (!taskExists) {
      // Payload expects the handler to return a TaskHandlerResult.
      // Returning an empty object satisfies the type.
      const newTask = {
        slug: scheduleTaskSlug,
        handler: async ({ payload }: { payload: Payload }) => {
          await handleScheduledPublications({
            payload,
            targetCollections,
            onPublish,
          });
          // Minimal result to satisfy Payload's TaskHandlerResult type
          return { output: {} } as any;
        },
      } as any;

      (jobs.tasks as any).push(newTask);

      // Add a default schedule (midnight daily) if the user hasn't provided one
      if (!newTask.schedule) {
        newTask.schedule = [
          {
            cron: "0 0 * * *",
            queue: "default",
          },
        ];
      }
    }

    return config;
  };

async function handleScheduledPublications({
  payload,
  targetCollections,
  onPublish,
}: {
  payload: Payload;
  targetCollections: CollectionSlug[];
  onPublish?: PayloadSchedulePluginOptions["onPublish"];
}) {
  // Use UTC date for consistent comparison across timezones
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  for (const collectionSlug of targetCollections) {
    const collection = payload.config.collections?.find(
      (c) => c.slug === collectionSlug,
    );

    if (!collection) continue;

    let hasMore = true;
    let page = 1;
    const pageLimit = 100;

    while (hasMore) {
      try {
        // Find all draft documents with scheduled date <= today
        const result = await payload.find({
          collection: collectionSlug as CollectionSlug,
          where: {
            and: [
              {
                _status: {
                  equals: "draft",
                },
              },
              {
                [SCHEDULE_FIELD_NAME]: {
                  less_than_equal: todayStr,
                },
              },
            ],
          },
          limit: pageLimit,
          page,
          depth: 0,
        });

        if (result.docs.length === 0) {
          hasMore = false;
          continue;
        }

        payload.logger.info(
          `[@dexilion/payload-schedule] Found ${result.docs.length} documents to publish in "${collectionSlug}" (page ${page})`,
        );

        for (const doc of result.docs) {
          try {
            // Update the document status to published
            const updatedDoc = await payload.update({
              collection: collectionSlug as CollectionSlug,
              id: doc.id,
              data: {
                _status: "published",
              } as any,
              depth: 0,
            });

            payload.logger.info(
              `[@dexilion/payload-schedule] Published document ${doc.id} in "${collectionSlug}"`,
            );

            // Call the onPublish callback if provided
            if (onPublish) {
              try {
                await onPublish({
                  doc: updatedDoc,
                  collection,
                  payload,
                });
              } catch (callbackError) {
                payload.logger.error(
                  `[@dexilion/payload-schedule] Error in onPublish callback for document ${doc.id}: ${callbackError}`,
                );
              }
            }
          } catch (updateError) {
            payload.logger.error(
              `[@dexilion/payload-schedule] Failed to publish document ${doc.id} in "${collectionSlug}": ${updateError}`,
            );
          }
        }

        // Check if there are more pages to process
        hasMore = result.docs.length === pageLimit;
        page++;
      } catch (queryError) {
        payload.logger.error(
          `[@dexilion/payload-schedule] Error querying collection "${collectionSlug}": ${queryError}`,
        );
        hasMore = false;
      }
    }
  }
}
