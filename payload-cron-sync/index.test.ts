/**
 * Tests for payload-plugin-cronjob-org
 *
 * Run with: npx tsx --test src/index.test.ts
 * Or with vitest: npx vitest run
 */

import { parseCronExpression } from "./client.js";
import { buildSyncTargets } from "./sync.js";
import type { ResolvedOptions } from "./sync.js";
import type { Config, SanitizedConfig } from "payload";

// ---------------------------------------------------------------------------
// parseCronExpression
// ---------------------------------------------------------------------------

function assertEqual<T>(actual: T, expected: T, label: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`FAIL [${label}]\n  expected: ${e}\n  actual:   ${a}`);
  }
  console.log(`  PASS [${label}]`);
}

console.log("\n=== parseCronExpression ===");

{
  const s = parseCronExpression("* * * * *");
  assertEqual(s.minutes, [-1], "wildcard minutes");
  assertEqual(s.hours, [-1], "wildcard hours");
  assertEqual(s.mdays, [-1], "wildcard mdays");
  assertEqual(s.months, [-1], "wildcard months");
  assertEqual(s.wdays, [-1], "wildcard wdays");
}

{
  const s = parseCronExpression("0 8 * * *");
  assertEqual(s.minutes, [0], "fixed minute 0");
  assertEqual(s.hours, [8], "fixed hour 8");
  assertEqual(s.mdays, [-1], "wildcard mdays");
}

{
  const s = parseCronExpression("*/15 * * * *");
  assertEqual(s.minutes, [0, 15, 30, 45], "step minutes every 15");
}

{
  const s = parseCronExpression("0 9-17 * * 1-5");
  assertEqual(s.hours, [9, 10, 11, 12, 13, 14, 15, 16, 17], "range hours 9-17");
  assertEqual(s.wdays, [1, 2, 3, 4, 5], "range wdays 1-5");
}

{
  const s = parseCronExpression("0 8,12,18 * * *");
  assertEqual(s.hours, [8, 12, 18], "list hours");
}

{
  const s = parseCronExpression("30 2 1 1 *", "America/New_York");
  assertEqual(s.timezone, "America/New_York", "timezone passed through");
  assertEqual(s.minutes, [30], "minute 30");
  assertEqual(s.mdays, [1], "mday 1");
  assertEqual(s.months, [1], "month 1");
}

{
  try {
    parseCronExpression("* * * *"); // only 4 fields
    throw new Error("Should have thrown");
  } catch (e) {
    console.log("  PASS [throws on 4-field expression]");
  }
}

// ---------------------------------------------------------------------------
// buildSyncTargets
// ---------------------------------------------------------------------------

console.log("\n=== buildSyncTargets ===");

const baseOptions: ResolvedOptions = {
  apiKey: "test-key",
  callbackBaseUrl: "https://my-app.com",
  runEndpointPath: "/api/payload-jobs/run",
  handleSchedulesEndpointPath: "/api/payload-jobs/handleSchedules",
  cronSecret: undefined,
  timezone: "UTC",
  saveResponses: false,
  jobTitlePrefix: undefined,
};

{
  // Empty config
  const targets = buildSyncTargets({} as SanitizedConfig, baseOptions);
  assertEqual(targets.length, 0, "empty config → no targets");
}

{
  // autoRun only
  const config = {
    jobs: {
      autoRun: [
        { cron: "* * * * *", queue: "default", limit: 10 },
        { cron: "0 * * * *", queue: "hourly", limit: 5 },
      ],
    },
  } as unknown as SanitizedConfig;

  const targets = buildSyncTargets(config, baseOptions);
  assertEqual(targets.length, 2, "autoRun: 2 targets");
  assertEqual(targets[0]!.type, "run", "autoRun[0] type=run");
  assertEqual(
    targets[0]!.url,
    "https://my-app.com/api/payload-jobs/run?queue=default",
    "autoRun[0] url includes queue param",
  );
  assertEqual(
    targets[1]!.url.includes("queue=hourly"),
    true,
    "autoRun[1] url has queue=hourly",
  );
}

{
  // Task schedules only (no autoRun) → handleSchedules targets
  const config = {
    jobs: {
      tasks: [
        {
          slug: "digest",
          schedule: [{ cron: "0 8 * * *", queue: "daily" }],
        },
        {
          slug: "cleanup",
          schedule: [{ cron: "0 2 * * 0", queue: "weekly" }],
        },
      ],
    },
  } as unknown as SanitizedConfig;

  const targets = buildSyncTargets(config, baseOptions);
  assertEqual(targets.length, 2, "task schedules: 2 handleSchedules targets");
  assertEqual(targets[0]!.type, "handleSchedules", "type=handleSchedules");
  assertEqual(
    targets[0]!.url,
    "https://my-app.com/api/payload-jobs/handleSchedules",
    "url is handleSchedules",
  );
}

{
  // autoRun covers same cron as task schedule → no duplicate handleSchedules
  const config = {
    jobs: {
      autoRun: [{ cron: "0 8 * * *", queue: "daily" }],
      tasks: [
        {
          slug: "digest",
          schedule: [{ cron: "0 8 * * *", queue: "daily" }],
        },
      ],
    },
  } as unknown as SanitizedConfig;

  const targets = buildSyncTargets(config, baseOptions);
  assertEqual(
    targets.length,
    1,
    "no duplicate when autoRun already covers task schedule cron",
  );
  assertEqual(targets[0]!.type, "run", "only the run target exists");
}

{
  // jobTitlePrefix
  const config = {
    jobs: {
      autoRun: [{ cron: "* * * * *", queue: "default" }],
    },
  } as unknown as SanitizedConfig;

  const targets = buildSyncTargets(config, {
    ...baseOptions,
    jobTitlePrefix: "Staging",
  });
  assertEqual(
    targets[0]!.title.startsWith("Staging |"),
    true,
    "title prefix applied",
  );
}

{
  // Deduplicate identical cron expressions across multiple tasks
  const config = {
    jobs: {
      tasks: [
        { slug: "taskA", schedule: [{ cron: "0 8 * * *", queue: "q1" }] },
        { slug: "taskB", schedule: [{ cron: "0 8 * * *", queue: "q2" }] },
      ],
    },
  } as unknown as SanitizedConfig;

  const targets = buildSyncTargets(config, baseOptions);
  assertEqual(
    targets.length,
    1,
    "identical cron expressions across tasks deduplicated to one handleSchedules job",
  );
}

console.log("\n✅ All tests passed!\n");
