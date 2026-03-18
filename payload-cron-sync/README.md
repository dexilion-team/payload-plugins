# payload-plugin-cronjob-org

A [Payload CMS](https://payloadcms.com) plugin that automatically registers and keeps your Payload job schedules in sync with [cron-job.org](https://cron-job.org).

Once added to your config you never have to manually manage cron triggers again — the plugin reads your `autoRun` and task/workflow `schedule` entries and creates exactly the right jobs on cron-job.org, updating or deleting them whenever your config changes.

---

## Why this plugin?

Payload's jobs queue needs something external to periodically call:

| Endpoint | Purpose |
|---|---|
| `POST /api/payload-jobs/run?queue=<name>` | Execute queued jobs |
| `POST /api/payload-jobs/handleSchedules` | Evaluate and enqueue scheduled tasks/workflows |

On Vercel (serverless) or any platform where `autoRun` won't work, you need a reliable external scheduler. cron-job.org is free and provides exactly this — but keeping those jobs in sync with your config is tedious and error-prone.

This plugin does it for you automatically.

---

## Features

- 🔄 **Auto-sync on startup** – cron-job.org jobs are created, updated, or deleted every time Payload starts.
- 🎯 **Precise targeting** – one cron-job.org job per unique `(queue, cron expression)` for `autoRun`, plus dedicated `handleSchedules` jobs for task/workflow schedules not covered by `autoRun`.
- 🔐 **Secure** – attaches your `CRON_SECRET` as an `Authorization: Bearer` header so your endpoints can verify the caller.
- 🧹 **Garbage-free** – obsolete jobs (removed from your config) are automatically deleted.
- ⚙️ **Zero runtime overhead** – sync only runs once on `onInit`. No polling, no intervals.

---

## Getting started

### 1. Get a free cron-job.org API key

1. Create a free account at [console.cron-job.org](https://console.cron-job.org)
2. Go to **Settings → API Keys** and generate a key

### 2. Install the plugin

```bash
npm install payload-plugin-cronjob-org
# or
pnpm add payload-plugin-cronjob-org
```

### 3. Add to your Payload config

```ts
// payload.config.ts
import { buildConfig } from 'payload'
import { cronJobOrgPlugin } from 'payload-plugin-cronjob-org'

export default buildConfig({
  plugins: [
    cronJobOrgPlugin({
      // Required: your cron-job.org API key
      apiKey: process.env.CRONJOB_ORG_API_KEY,

      // Required: the public URL of your deployed Payload app
      callbackBaseUrl: process.env.NEXT_PUBLIC_SERVER_URL,

      // Recommended: a secret that cron-job.org will send as Authorization: Bearer <secret>
      // so your endpoint can verify the request. Set the same value in your run endpoint
      // access control (see below).
      cronSecret: process.env.CRON_SECRET,
    }),
  ],

  jobs: {
    tasks: [
      {
        slug: 'sendDailyDigest',
        schedule: [
          {
            cron: '0 8 * * *', // every day at 08:00 UTC
            queue: 'daily',
          },
        ],
        handler: async ({ req }) => {
          // ... your task logic
          return { output: {} }
        },
      },
    ],

    // On serverless platforms, use scheduler: 'manual' and let this plugin
    // trigger handleSchedules. On dedicated servers you can use 'cron' and
    // set up autoRun instead.
    // scheduler: 'manual',

    // On dedicated servers / Docker: autoRun triggers job execution directly.
    // This plugin creates a matching cron-job.org entry for each autoRun entry.
    autoRun: [
      {
        cron: '* * * * *',    // every minute
        queue: 'default',
        limit: 10,
      },
      {
        cron: '0 * * * *',   // every hour
        queue: 'daily',
        limit: 5,
      },
    ],
  },
})
```

### 4. Set environment variables

```env
# .env
CRONJOB_ORG_API_KEY=your_api_key_here
NEXT_PUBLIC_SERVER_URL=https://my-app.com
CRON_SECRET=a-random-secret-at-least-16-chars
```

### 5. Secure your run endpoint (recommended)

Payload lets you control access to the jobs run endpoint. Add this to your config so only requests with your `CRON_SECRET` can trigger jobs:

```ts
jobs: {
  access: {
    run: ({ req }) => {
      const authHeader = req.headers.get('authorization')
      return authHeader === `Bearer ${process.env.CRON_SECRET}`
    },
  },
  // ... rest of jobs config
}
```

---

## Configuration options

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | `CRONJOB_ORG_API_KEY` env | Your cron-job.org API key |
| `callbackBaseUrl` | `string` | `PAYLOAD_PUBLIC_SERVER_URL` or `NEXT_PUBLIC_SERVER_URL` env | Public base URL of your Payload app |
| `cronSecret` | `string` | `CRON_SECRET` env | Secret sent as `Authorization: Bearer` header |
| `timezone` | `string` | `"UTC"` | IANA timezone for all cron jobs |
| `runEndpointPath` | `string` | `"/api/payload-jobs/run"` | Override the run endpoint path |
| `handleSchedulesEndpointPath` | `string` | `"/api/payload-jobs/handleSchedules"` | Override the handleSchedules endpoint path |
| `saveResponses` | `boolean` | `false` | Save cron-job.org execution responses (useful for debugging) |
| `jobTitlePrefix` | `string` | `undefined` | Prefix for job titles, useful when sharing one cron-job.org account across multiple apps |
| `enabled` | `boolean` | `true` | Set to `false` to disable the plugin without removing it |
| `forceOverrideAutoRun` | `boolean` | `false` | If the Payload config has `autoRun` set, the plugin will throw an error by default to avoid duplicate scheduling. Set to `true` to force the plugin to run and handle the `autoRun` schedules via cron-job.org. |

All `string` options fall back to environment variables if not provided explicitly (see table above for which env vars).

---

## How it works

On every `onInit`, the plugin:

1. **Reads your config** – collects all `autoRun` entries and `schedule` arrays from tasks/workflows.
2. **Fetches existing jobs** from cron-job.org (filtered to jobs it manages via a `[payload-managed]` marker in the title).
3. **Diffs** desired vs. existing:
   - Missing → **create**
   - Changed URL, title, or schedule → **update**
   - No longer in config → **delete**
4. **Skips duplicates** – if `autoRun` already covers a cron expression, no redundant `handleSchedules` job is created.

### Duplicate scheduling prevention

If your Payload config has `autoRun` set, the plugin will throw an error by default to prevent duplicate scheduling (both Payload's internal scheduler and cron-job.org would run the same jobs). This avoids the issue described in the [Payload documentation](https://payloadcms.com/docs/jobs-queue/overview#duplicate-job-scheduling).

If you want to use this plugin to handle `autoRun` schedules via cron-job.org (instead of Payload's internal scheduler), set the plugin option `forceOverrideAutoRun: true`. When this option is enabled:

1. The plugin will store the original `autoRun` entries and set `autoRun` to `undefined` in the Payload config to disable Payload's internal scheduler.
2. The plugin will create cron jobs on cron-job.org for each stored `autoRun` entry.
3. You can safely use the plugin on serverless platforms where `autoRun` would not work.

The plugin logs the override action and the number of original `autoRun` entries at startup.

### Job title format

Jobs on cron-job.org are titled like:

```
[payload-managed] run queue="default" cron="* * * * *"
[payload-managed] handleSchedules cron="0 8 * * *"
MyApp | [payload-managed] run queue="daily" cron="0 * * * *"
```

The `[payload-managed]` marker is how the plugin identifies its own jobs and won't touch anything else in your account.

---

## Vercel example

```ts
// payload.config.ts
cronJobOrgPlugin({
  apiKey: process.env.CRONJOB_ORG_API_KEY,
  callbackBaseUrl: process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : process.env.NEXT_PUBLIC_SERVER_URL,
  cronSecret: process.env.CRON_SECRET,
})
```

```ts
// jobs config for serverless
jobs: {
  scheduler: 'manual', // Payload won't auto-schedule; cron-job.org will trigger handleSchedules
  tasks: [
    {
      slug: 'nightlyReport',
      schedule: [{ cron: '0 2 * * *', queue: 'nightly' }],
      handler: async () => { ... },
    },
  ],
  access: {
    run: ({ req }) => req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`,
  },
}
```

---

## Cron expression reference

The plugin supports standard 5-field cron expressions:

```
┌───────────── minute (0–59)
│ ┌───────────── hour (0–23)
│ │ ┌───────────── day of month (1–31)
│ │ │ ┌───────────── month (1–12)
│ │ │ │ ┌───────────── day of week (0–6, 0=Sunday)
│ │ │ │ │
* * * * *
```

Supported syntax: `*`, `*/n` (step), `n-m` (range), `a,b,c` (list), single values.

---

## License

MIT
