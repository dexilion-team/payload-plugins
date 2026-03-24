import type { SanitizedConfig } from "payload";
import type { SyncTarget, CronJobOrgJob } from "./types";
import { CronJobOrgClient, parseCronExpression } from "./client";

/**
 * Build the full list of SyncTargets from a Payload config.
 *
 * Two kinds of targets are collected:
 *
 * 1. **autoRun entries** – Each entry in `jobs.autoRun` has a cron expression
 *    and a queue name. We create one cron job on cron-job.org per entry, hitting
 *    the `/api/payload-jobs/run?queue=<queue>` endpoint.
 *
 * 2. **Task / Workflow schedules** – When `jobs.scheduler === 'manual'` (or when
 *    the user hasn't configured `autoRun` but has tasks/workflows with `schedule`
 *    properties), Payload needs an external trigger to call `handleSchedules`.
 *    We collect all unique cron expressions from those schedules and create a
 *    deduplicated set of `handleSchedules` jobs.
 *
 *    If `autoRun` already covers a given cron expression (i.e. Payload's built-in
 *    scheduler will take care of it), we skip creating a duplicate handleSchedules
 *    job for that expression.
 */
export function buildSyncTargets(
  config: SanitizedConfig,
  options: ResolvedOptions,
): SyncTarget[] {
  // Marker embedded in job titles so we can distinguish our managed jobs
  // from any manually created ones in the same account.
  const MANAGED_MARKER = `[${options.callbackBaseUrl ?? "@dexilion/payload-cron-job-org"}]`;

  const targets: SyncTarget[] = [];

  const jobs = config.jobs;
  if (!jobs) return targets;

  const prefix = options.jobTitlePrefix ? `${options.jobTitlePrefix} | ` : "";

  // ── 1. autoRun entries ─────────────────────────────────────────────────
  const autoRun = jobs.autoRun;
  if (Array.isArray(autoRun)) {
    for (const entry of autoRun) {
      // autoRun entries can be { cron, queue, limit } objects or plain objects
      const cronExpr = (entry as { cron?: string }).cron;
      const queue = (entry as { queue?: string }).queue ?? "default";
      if (!cronExpr) continue;

      const url = buildUrl(options.callbackBaseUrl, "/api/payload-jobs/run", {
        queue,
      });
      const key = `run:${queue}:${cronExpr}`;
      targets.push({
        key,
        title: `${prefix}${MANAGED_MARKER} run queue="${queue}" cron="${cronExpr}"`,
        url,
        cronExpression: cronExpr,
        type: "both",
      });
    }
  }

  // ── 2. Task / Workflow schedules → handleSchedules ─────────────────────
  // Collect unique cron expressions from tasks
  const scheduleExpressions = new Set<string>();

  const tasks = jobs.tasks ?? [];
  for (const task of tasks) {
    const schedules = (task as { schedule?: Array<{ cron?: string }> })
      .schedule;
    if (!Array.isArray(schedules)) continue;
    for (const s of schedules) {
      if (s.cron) scheduleExpressions.add(s.cron);
    }
  }

  // Also collect from workflows
  const workflows =
    (jobs as { workflows?: Array<{ schedule?: Array<{ cron?: string }> }> })
      .workflows ?? [];
  for (const wf of workflows) {
    const schedules = wf.schedule;
    if (!Array.isArray(schedules)) continue;
    for (const s of schedules) {
      if (s.cron) scheduleExpressions.add(s.cron);
    }
  }

  // Determine which cron expressions are already covered by autoRun
  const autoRunCrons = new Set(
    (Array.isArray(autoRun) ? autoRun : [])
      .map((e) => (e as { cron?: string }).cron)
      .filter(Boolean) as string[],
  );

  for (const cronExpr of scheduleExpressions) {
    // If autoRun already covers this schedule, Payload's internal scheduler
    // handles calling handleSchedules – no external trigger needed.
    if (autoRunCrons.has(cronExpr)) continue;

    const url = buildUrl(options.callbackBaseUrl, "/api/payload-jobs/run");
    const key = `handleSchedules:${cronExpr}`;
    targets.push({
      key,
      title: `${prefix}${MANAGED_MARKER} handleSchedules cron="${cronExpr}"`,
      url,
      cronExpression: cronExpr,
      type: "both",
    });
  }

  return targets;
}

function buildUrl(
  base: string,
  path: string,
  query?: Record<string, string>,
): string {
  const url = new URL(path, base);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      url.searchParams.set(k, v);
    }
  }
  return url.toString();
}

// ---------------------------------------------------------------------------
// Sync orchestration
// ---------------------------------------------------------------------------

export interface ResolvedOptions {
  apiKey: string;
  callbackBaseUrl: string;
  cronSecret: string | undefined;
  timezone: string;
  saveResponses: boolean;
  jobTitlePrefix: string | undefined;
}

export async function syncCronJobs(
  config: SanitizedConfig,
  options: ResolvedOptions,
  logger: {
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
  },
): Promise<void> {
  // Marker embedded in job titles so we can distinguish our managed jobs
  // from any manually created ones in the same account.
  const MANAGED_MARKER = `[${options.callbackBaseUrl ?? "@dexilion/payload-cron-job-org"}]`;

  const client = new CronJobOrgClient(options.apiKey);

  logger.info("[payload-cron-job-org] Starting sync with cron-job.org…");

  // Fetch existing managed jobs from the account
  let existingJobs: CronJobOrgJob[];
  try {
    existingJobs = await client.listJobs();
  } catch (err) {
    logger.error(
      `[payload-cron-job-org] Failed to fetch existing jobs: ${String(err)}`,
    );
    throw err;
  }

  const managedJobs = existingJobs.filter((j) =>
    j.title.includes(MANAGED_MARKER),
  );

  // Build the desired set of targets from the Payload config
  const targets = buildSyncTargets(config, options);

  if (targets.length === 0) {
    logger.info(
      "[payload-cron-job-org] No autoRun or task schedules found in Payload config. Nothing to sync.",
    );
    // Clean up any stale managed jobs
    await deleteObsoleteJobs(client, managedJobs, [], logger);
    return;
  }

  logger.info(
    `[payload-cron-job-org] Found ${targets.length} sync target(s) in Payload config.`,
  );

  // For each target, create or update
  const seenKeys = new Set<string>();
  const expandedTargets = targets.flatMap((target) =>
    target.type === "both"
      ? [
          { ...target, type: "run" as const, key: `${target.key}:run` },
          {
            ...target,
            type: "handleSchedules" as const,
            key: `${target.key}:handleSchedules`,
          },
        ]
      : [target],
  );

  for (const target of expandedTargets) {
    seenKeys.add(target.key);

    const existingMatch = managedJobs.find((j) => {
      // Match by embedded key in title
      return (
        j.title.includes(`cron="${target.cronExpression}"`) &&
        j.title.includes(
          target.type === "run" ? "run queue" : "handleSchedules",
        )
      );
    });

    let schedule;
    try {
      schedule = parseCronExpression(target.cronExpression, options.timezone);
    } catch (err) {
      logger.error(
        `[payload-cron-job-org] Skipping target "${target.key}" – could not parse cron expression "${target.cronExpression}": ${String(err)}`,
      );
      continue;
    }

    const extendedData = options.cronSecret
      ? {
          headers: { Authorization: `Bearer ${options.cronSecret}` },
        }
      : undefined;

    const jobPayload = {
      url: target.url,
      enabled: true,
      title: target.title,
      saveResponses: options.saveResponses,
      requestMethod: 1 as const, // POST
      schedule,
      ...(extendedData ? { extendedData } : {}),
    };

    if (existingMatch) {
      // Check if anything actually needs updating
      const needsUpdate =
        existingMatch.url !== target.url ||
        existingMatch.title !== target.title ||
        !schedulesAreEqual(existingMatch.schedule, schedule);

      if (needsUpdate) {
        try {
          await client.updateJob(existingMatch.jobId, jobPayload);
          logger.info(
            `[payload-cron-job-org] Updated job #${existingMatch.jobId} "${target.title}"`,
          );
        } catch (err) {
          logger.error(
            `[payload-cron-job-org] Failed to update job #${existingMatch.jobId}: ${String(err)}`,
          );
        }
      } else {
        logger.info(
          `[payload-cron-job-org] Job #${existingMatch.jobId} "${target.title}" is up-to-date.`,
        );
      }
    } else {
      // Create new
      try {
        const newId = await client.createJob(jobPayload);
        logger.info(
          `[payload-cron-job-org] Created new job #${newId} "${target.title}"`,
        );
      } catch (err) {
        logger.error(
          `[payload-cron-job-org] Failed to create job "${target.title}": ${String(err)}`,
        );
      }
    }
  }

  // Clean up managed jobs that are no longer in the config
  await deleteObsoleteJobs(client, managedJobs, targets, logger);

  logger.info("[payload-cron-job-org] Sync complete.");
}

async function deleteObsoleteJobs(
  client: CronJobOrgClient,
  managedJobs: CronJobOrgJob[],
  currentTargets: SyncTarget[],
  logger: { info: (msg: string) => void; warn: (msg: string) => void },
): Promise<void> {
  for (const job of managedJobs) {
    const stillNeeded = currentTargets.some((t) => t.title === job.title);
    if (!stillNeeded) {
      try {
        await client.deleteJob(job.jobId);
        logger.info(
          `[payload-cron-job-org] Deleted obsolete job #${job.jobId} "${job.title}"`,
        );
      } catch (err) {
        logger.warn(
          `[payload-cron-job-org] Failed to delete obsolete job #${job.jobId}: ${String(err)}`,
        );
      }
    }
  }
}

function schedulesAreEqual(
  a: CronJobOrgJob["schedule"],
  b: CronJobOrgJob["schedule"],
): boolean {
  return (
    a.timezone === b.timezone &&
    JSON.stringify(a.hours.slice().sort()) ===
      JSON.stringify(b.hours.slice().sort()) &&
    JSON.stringify(a.minutes.slice().sort()) ===
      JSON.stringify(b.minutes.slice().sort()) &&
    JSON.stringify(a.mdays.slice().sort()) ===
      JSON.stringify(b.mdays.slice().sort()) &&
    JSON.stringify(a.months.slice().sort()) ===
      JSON.stringify(b.months.slice().sort()) &&
    JSON.stringify(a.wdays.slice().sort()) ===
      JSON.stringify(b.wdays.slice().sort())
  );
}
