import { ResolvedOptions } from "../sync";
import { CronJobOrgPluginOptions } from "../types";

export function resolveOptions(
  opts: CronJobOrgPluginOptions,
  serverURL: string | undefined,
  logger: { error: (msg: string) => void },
): ResolvedOptions | null {
  const apiKey = opts.apiKey;
  if (!apiKey) {
    logger.error(
      "[@dexilion/payload-cron-job-org] No API key provided. " +
        "Set the `apiKey` option in the plugin parameters. " +
        "Skipping cron-job.org sync.",
    );
    return null;
  }

  const callbackBaseUrl = opts.callbackBaseUrl ?? serverURL;
  if (!callbackBaseUrl) {
    logger.error(
      "[@dexilion/payload-cron-job-org] No callbackBaseUrl provided. " +
        "Set the `callbackBaseUrl` option in the plugin parameters. " +
        "Skipping cron-job.org sync.",
    );
    return null;
  }

  const cronSecret = opts.cronSecret;

  return {
    apiKey,
    callbackBaseUrl,
    cronSecret,
    timezone: opts.timezone ?? "UTC",
    saveResponses: opts.saveResponses ?? false,
    jobTitlePrefix: opts.jobTitlePrefix,
  };
}
