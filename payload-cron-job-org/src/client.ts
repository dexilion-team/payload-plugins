import type {
  CronJobOrgJob,
  CronJobOrgJobCore,
  CronJobOrgListResponse,
  CronJobOrgCreateResponse,
  CronJobOrgSchedule,
} from "./types";

const CRON_JOB_ORG_API = "https://api.cron-job.org";

export class CronJobOrgClient {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private get headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${CRON_JOB_ORG_API}${path}`;

    const response = await fetch(url, {
      method,
      headers: this.headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      throw new Error(
        `cron-job.org API error ${response.status} on ${method} ${path}: ${text}`,
      );
    }

    // Some endpoints return empty body on success
    const text = await response.text();
    if (!text) return {} as T;
    return JSON.parse(text) as T;
  }

  /** Fetch all jobs in this account */
  async listJobs(): Promise<CronJobOrgJob[]> {
    const data = await this.request<CronJobOrgListResponse>("GET", "/jobs");
    return data.jobs ?? [];
  }

  /** Create a new cron job */
  async createJob(job: CronJobOrgJobCore): Promise<number> {
    const data = await this.request<CronJobOrgCreateResponse>("PUT", "/jobs", {
      job,
    });
    return data.jobId;
  }

  /** Update an existing cron job (partial update) */
  async updateJob(
    jobId: number,
    job: Partial<CronJobOrgJobCore>,
  ): Promise<void> {
    await this.request<unknown>("PATCH", `/jobs/${jobId}`, { job });
  }

  /** Delete a cron job */
  async deleteJob(jobId: number): Promise<void> {
    await this.request<unknown>("DELETE", `/jobs/${jobId}`);
  }
}

// ---------------------------------------------------------------------------
// Helpers: convert a cron expression to cron-job.org schedule object
// ---------------------------------------------------------------------------

/**
 * Parse a standard 5-field cron expression into cron-job.org's schedule format.
 *
 * cron-job.org uses arrays of values with -1 meaning "every":
 *   minutes: [-1] = every minute, [0,30] = at :00 and :30
 *   hours:   [-1] = every hour, [8] = 8 AM only
 *   mdays:   [-1] = every day of month
 *   months:  [-1] = every month
 *   wdays:   [-1] = every day of week  (0=Sun, 6=Sat)
 *
 * Supports: wildcards (*), lists (1,2,3), ranges (1-5), steps (* /5)
 * Does NOT support complex combinations like "* /5,30" (will treat as wildcard).
 */
export function parseCronExpression(
  expression: string,
  timezone = "UTC",
): CronJobOrgSchedule {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(
      `Invalid cron expression "${expression}": expected 5 fields (minute hour mday month wday)`,
    );
  }

  const [minutePart, hourPart, mdayPart, monthPart, wdayPart] = parts as [
    string,
    string,
    string,
    string,
    string,
  ];

  return {
    timezone,
    expiresAt: 0,
    minutes: parseCronField(minutePart, 0, 59),
    hours: parseCronField(hourPart, 0, 23),
    mdays: parseCronField(mdayPart, 1, 31),
    months: parseCronField(monthPart, 1, 12),
    wdays: parseCronField(wdayPart, 0, 6),
  };
}

function parseCronField(field: string, min: number, max: number): number[] {
  // Wildcard = every unit
  if (field === "*") return [-1];

  // Step syntax: */n
  if (field.startsWith("*/")) {
    const step = parseInt(field.slice(2), 10);
    if (isNaN(step) || step <= 0) return [-1];
    const values: number[] = [];
    for (let i = min; i <= max; i += step) values.push(i);
    return values;
  }

  // Range: n-m
  if (field.includes("-") && !field.includes(",")) {
    const [startStr, endStr] = field.split("-") as [string, string];
    const start = parseInt(startStr, 10);
    const end = parseInt(endStr, 10);
    if (isNaN(start) || isNaN(end)) return [-1];
    const values: number[] = [];
    for (let i = start; i <= end; i++) values.push(i);
    return values;
  }

  // List: 1,2,3
  if (field.includes(",")) {
    return field
      .split(",")
      .map((v) => parseInt(v.trim(), 10))
      .filter((v) => !isNaN(v));
  }

  // Single value
  const val = parseInt(field, 10);
  if (isNaN(val)) return [-1];
  return [val];
}
