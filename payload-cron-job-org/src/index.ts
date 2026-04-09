import {
  type Config,
  type SanitizedConfig,
  type GlobalConfig,
  type Payload,
} from "payload";
import type { CronJobOrgPluginOptions } from "./types";
import { buildSyncTargets, syncCronJobs } from "./sync";
import { hashTargets } from "./utils/hash";
import { resolveOptions } from "./utils/resolveOptions";

/**
 * payload-cron-job-org plugin for Payload CMS
 *
 * Reads all `autoRun` and task/workflow `schedule` entries from your Payload
 * config and automatically creates, updates, or deletes the corresponding
 * cron jobs on cron-job.org so that:
 *
 *  - Each `autoRun` entry gets a dedicated cron job that POSTs to
 *    `/api/payload-jobs/run?queue=<queue>` on your deployment.
 *
 *  - Each unique cron expression found in task/workflow `schedule` properties
 *    (that isn't already covered by `autoRun`) gets a cron job that POSTs to
 *    `/api/payload-jobs/handleSchedules`.
 *
 * The sync runs once on Payload server startup (via `onInit`). Jobs are
 * identified by a stable title format so they can be updated or removed when
 * you change your config without leaving ghost jobs behind.
 *
 * @example
 * ```ts
 * import { buildConfig } from 'payload'
 * import { cronJobOrgPlugin } from '@dexilion/payload-cron-job-org'
 *
 * export default buildConfig({
 *   plugins: [
 *     cronJobOrgPlugin({
 *       apiKey: process.env.CRONJOB_ORG_API_KEY,
 *       callbackBaseUrl: process.env.NEXT_PUBLIC_SERVER_URL, // or set serverURL
 *       cronSecret: process.env.CRON_SECRET,
 *     }),
 *   ],
 *   jobs: {
 *     tasks: [
 *       {
 *         slug: 'sendDigest',
 *         schedule: [{ cron: '0 8 * * *', queue: 'daily' }],
 *         handler: async () => { ... },
 *       },
 *     ],
 *     autoRun: [{ cron: '* * * * *', queue: 'default', limit: 10 }],
 *   },
 * })
 * ```
 */
export const cronJobOrgPlugin =
  (pluginOptions: CronJobOrgPluginOptions) =>
  (incomingConfig: Config): Config => {
    // Allow users to disable the plugin without removing it from their config
    if (pluginOptions.enabled === false) {
      return incomingConfig;
    }

    const config: Config = { ...incomingConfig };

    config.globals = [...(config.globals ?? []), cronSyncStateGlobal];

    // Validate that we are not causing duplicate scheduling with autoRun
    const jobs = config.jobs;
    let originalAutoRun: any[] | undefined = undefined;
    if (jobs && Array.isArray(jobs.autoRun) && jobs.autoRun.length > 0) {
      if (pluginOptions.forceOverrideAutoRun !== true) {
        throw new Error(
          `[@dexilion/payload-cron-job-org] The Payload config has autoRun set, which would cause duplicate scheduling. ` +
            `If you want to use this plugin to handle autoRun schedules via cron-job.org, set the plugin option 'forceOverrideAutoRun: true'. ` +
            `Otherwise, remove autoRun from your Payload config or disable this plugin.`,
        );
      } else {
        // Store the original autoRun
        originalAutoRun = jobs.autoRun;
        // We are forcing the override, so we set autoRun to undefined to prevent Payload's internal scheduler from running.
        config.jobs = {
          ...jobs,
          autoRun: undefined,
        };
      }
    }

    // Extend onInit to run our sync after Payload has fully initialised
    const existingOnInit = config.onInit;

    config.onInit = async (payload: Payload) => {
      // Always run the original onInit first
      if (existingOnInit) {
        await existingOnInit(payload);
      }

      // Resolve options, falling back to environment variables
      const resolved = resolveOptions(
        pluginOptions,
        config.serverURL,
        payload.logger,
      );
      if (!resolved) return; // logged inside resolveOptions

      if (resolved.cronSecret && pluginOptions.injectAccessControl !== false) {
        const existingAccess = config.jobs?.access?.run;
        config.jobs = {
          ...config.jobs,
          access: {
            ...config.jobs?.access,
            run: ({ req }) => {
              const authHeader = req.headers.get("authorization");
              if (authHeader === `Bearer ${resolved.cronSecret}`) return true;
              // fall through to existing access check if there was one
              if (existingAccess) return existingAccess({ req });
              return false;
            },
          },
        };
      }

      try {
        // Log if we are overriding autoRun
        if (originalAutoRun) {
          payload.logger.info(
            `[@dexilion/payload-cron-job-org] Overriding autoRun with cron-job.org sync (forceOverrideAutoRun enabled). Original autoRun entries: ${originalAutoRun.length}`,
          );
        }

        // Create a temporary config for the sync that has the original autoRun
        let jobsForSync;
        if (payload.config.jobs) {
          jobsForSync = {
            ...payload.config.jobs,
            autoRun: originalAutoRun ?? payload.config.jobs.autoRun,
          };
        } else if (originalAutoRun) {
          // Create a minimal jobs config with autoRun and empty arrays for tasks and workflows
          jobsForSync = {
            autoRun: originalAutoRun,
            tasks: [],
            workflows: [],
          };
        } else {
          jobsForSync = undefined;
        }

        const syncConfig = {
          ...payload.config,
          jobs: jobsForSync,
        } as SanitizedConfig;

        // Compute hash of what we'd sync
        const targets = buildSyncTargets(syncConfig, resolved);
        const currentHash = hashTargets(targets);

        const state: { lastSyncedHash?: string; lastSyncedAt?: string } =
          await payload.findGlobal({
            // @ts-ignore - payload is BasePayload in onInit
            slug: "cron-job-org-state",
          });
        if (state.lastSyncedHash === currentHash) {
          payload.logger.info(
            "[@dexilion/payload-cron-job-org] Config unchanged, skipping sync.",
          );
          return;
        }

        await syncCronJobs(syncConfig, resolved, payload.logger);

        await payload.updateGlobal({
          // @ts-ignore - payload is BasePayload in onInit
          slug: "cron-job-org-state",
          data: {
            lastSyncedHash: currentHash,
            lastSyncedAt: new Date().toISOString(),
          } as any,
        });
      } catch (err) {
        // Log but don't crash Payload startup
        payload.logger.error(
          `[@dexilion/payload-cron-job-org] Sync failed: ${String(err)}`,
        );
      }
    };

    return config;
  };

const cronSyncStateGlobal: GlobalConfig = {
  slug: "cron-job-org-state",
  admin: {
    hidden: true,
  },
  fields: [
    {
      name: "lastSyncedHash",
      type: "text",
    },
    {
      name: "lastSyncedAt",
      type: "date",
    },
  ],
};

// Re-export types for consumers
export type { CronJobOrgPluginOptions } from "./types.js";
