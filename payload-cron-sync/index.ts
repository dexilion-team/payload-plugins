import type { Config } from 'payload'
import type { CronJobOrgPluginOptions } from './types.js'
import type { ResolvedOptions } from './sync.js'
import { syncCronJobs } from './sync.js'

/**
 * payload-plugin-cronjob-org
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
 * import { cronJobOrgPlugin } from 'payload-plugin-cronjob-org'
 *
 * export default buildConfig({
 *   plugins: [
 *     cronJobOrgPlugin({
 *       apiKey: process.env.CRONJOB_ORG_API_KEY,
 *       callbackBaseUrl: process.env.NEXT_PUBLIC_SERVER_URL,
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
  (pluginOptions: CronJobOrgPluginOptions = {}) =>
  (incomingConfig: Config): Config => {
    // Allow users to disable the plugin without removing it from their config
    if (pluginOptions.enabled === false) {
      return incomingConfig
    }

    const config: Config = { ...incomingConfig }

    // Extend onInit to run our sync after Payload has fully initialised
    const existingOnInit = config.onInit

    config.onInit = async (payload) => {
      // Always run the original onInit first
      if (existingOnInit) {
        await existingOnInit(payload)
      }

      // Resolve options, falling back to environment variables
      const resolved = resolveOptions(pluginOptions, payload.logger)
      if (!resolved) return // logged inside resolveOptions

      try {
        await syncCronJobs(payload.config, resolved, payload.logger)
      } catch (err) {
        // Log but don't crash Payload startup
        payload.logger.error(
          `[payload-plugin-cronjob-org] Sync failed: ${String(err)}`,
        )
      }
    }

    return config
  }

function resolveOptions(
  opts: CronJobOrgPluginOptions,
  logger: { warn: (msg: string) => void },
): ResolvedOptions | null {
  const apiKey =
    opts.apiKey ??
    process.env.CRONJOB_ORG_API_KEY ??
    process.env.CRON_JOB_ORG_API_KEY

  if (!apiKey) {
    logger.warn(
      '[payload-plugin-cronjob-org] No API key provided. ' +
        'Set the `apiKey` option or the CRONJOB_ORG_API_KEY environment variable. ' +
        'Skipping cron-job.org sync.',
    )
    return null
  }

  const callbackBaseUrl =
    opts.callbackBaseUrl ??
    process.env.PAYLOAD_PUBLIC_SERVER_URL ??
    process.env.NEXT_PUBLIC_SERVER_URL ??
    process.env.SERVER_URL

  if (!callbackBaseUrl) {
    logger.warn(
      '[payload-plugin-cronjob-org] No callbackBaseUrl provided. ' +
        'Set the `callbackBaseUrl` option or the PAYLOAD_PUBLIC_SERVER_URL environment variable. ' +
        'Skipping cron-job.org sync.',
    )
    return null
  }

  const cronSecret =
    opts.cronSecret ?? process.env.CRON_SECRET ?? undefined

  return {
    apiKey,
    callbackBaseUrl,
    runEndpointPath: opts.runEndpointPath ?? '/api/payload-jobs/run',
    handleSchedulesEndpointPath:
      opts.handleSchedulesEndpointPath ?? '/api/payload-jobs/handleSchedules',
    cronSecret,
    timezone: opts.timezone ?? 'UTC',
    saveResponses: opts.saveResponses ?? false,
    jobTitlePrefix: opts.jobTitlePrefix,
  }
}

// Re-export types for consumers
export type { CronJobOrgPluginOptions } from './types.js'
