/**
 * Plugin configuration options
 */
export interface CronJobOrgPluginOptions {
  /**
   * Your cron-job.org API key. Required.
   * Get it from https://console.cron-job.org -> Settings -> API Keys
   */
  apiKey: string;

  /**
   * The base URL of your Payload deployment. Defaults to serverURL from Payload
   * config. Used to construct the callback URLs that cron-job.org will call.
   * Example: "https://my-app.com"
   */
  callbackBaseUrl?: string;

  /**
   * A secret token added as "Authorization: Bearer <token>" header on all
   * cron-job.org requests to your Payload endpoints, so you can verify the
   * request is from cron-job.org and not random traffic.
   */
  cronSecret?: string;

  /**
   * Timezone to use for all created cron jobs on cron-job.org.
   * Defaults to "UTC". Must be a valid IANA timezone string.
   */
  timezone?: string;

  /**
   * Whether to save cron-job.org execution responses.
   * Useful for debugging. Defaults to false.
   */
  saveResponses?: boolean;

  /**
   * Whether to enable or disable the plugin entirely.
   * Defaults to true.
   */
  enabled?: boolean;

  /**
   * An optional prefix added to the title of every cron job created on
   * cron-job.org. Useful when managing multiple Payload apps under one
   * cron-job.org account.
   * Example: "MyApp" -> job title becomes "MyApp | daily queue runner"
   */
  jobTitlePrefix?: string;

  /**
   * If the Payload config has `autoRun` set, the plugin will throw an error by
   * default to avoid duplicate scheduling. Set this to `true` to force the
   * plugin to run and handle the `autoRun` schedules via cron-job.org. When
   * set, the plugin will set `autoRun` to `undefined` in the config to prevent
   * Payload's internal scheduler from running.
   */
  forceOverrideAutoRun?: boolean;

  /**
   * By default, if `cronSecret` is set, the plugin automatically secures your
   * jobs endpoints by injecting an `access.run` check that validates the
   * `Authorization: Bearer` header. Set to `false` to disable this and handle
   * access control yourself.
   */
  injectAccessControl?: boolean; // default true
}

// ---------------------------------------------------------------------------
// cron-job.org REST API types
// ---------------------------------------------------------------------------

export interface CronJobOrgSchedule {
  timezone: string;
  expiresAt: number;
  hours: number[];
  mdays: number[];
  minutes: number[];
  months: number[];
  wdays: number[];
}

export interface CronJobOrgExtendedData {
  headers?: Record<string, string>;
  body?: string;
}

export interface CronJobOrgJobCore {
  url: string;
  enabled: boolean;
  title: string;
  saveResponses: boolean;
  requestMethod: number; // 0=GET, 1=POST
  schedule: CronJobOrgSchedule;
  extendedData?: CronJobOrgExtendedData;
  requestTimeout?: number;
}

export interface CronJobOrgJob extends CronJobOrgJobCore {
  jobId: number;
  lastStatus: number;
  lastDuration: number;
  lastExecution: number;
  nextExecution: number;
}

export interface CronJobOrgListResponse {
  jobs: CronJobOrgJob[];
  someFailed: boolean;
}

export interface CronJobOrgCreateResponse {
  jobId: number;
}

// ---------------------------------------------------------------------------
// Internal types used for sync logic
// ---------------------------------------------------------------------------

/**
 * Represents a single logical "run target" that needs an external cron trigger.
 * Each unique (queue + cron expression) combination becomes one cron job on
 * cron-job.org.
 */
export interface SyncTarget {
  /** Unique stable identifier used as part of the job title for matching */
  key: string;

  /** Human-readable title */
  title: string;

  /** The full URL cron-job.org will call */
  url: string;

  /** The 5-field cron expression, e.g. "* * * * *" */
  cronExpression: string;

  /**
   * Whether this target triggers job execution (run) or schedule evaluation
   * (handleSchedules)
   */
  type: "run" | "handleSchedules" | "both";
}
