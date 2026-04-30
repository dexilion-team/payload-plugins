import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { buildConfig } from "payload";
import { fileURLToPath } from "url";
import path from "path";
import { cronJobOrgPlugin } from "@plugin";

import { testEmailAdapter } from "@/helpers/testEmailAdapter";
import { seed } from "@/seed";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

if (!process.env.ROOT_DIR) {
  process.env.ROOT_DIR = dirname;
}

export default buildConfig({
  admin: {
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    {
      slug: "posts",
      fields: [],
    },
    {
      slug: "media",
      fields: [],
      upload: {
        staticDir: path.resolve(dirname, "media"),
      },
    },
  ],
  db: sqliteAdapter({
    client: {
      url: ":memory:",
    },
  }),
  onInit: async (payload) => {
    await seed(payload);
  },
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL,
  plugins: [
    cronJobOrgPlugin({
      apiKey: process.env.CRONJOB_ORG_API_KEY!,
      callbackBaseUrl: "localhost:3000",
      cronSecret: "my-cron-secret",
    }),
  ],
  jobs: {
    tasks: [
      {
        slug: "sendDigest",
        schedule: [{ cron: "0 8 * * *", queue: "daily" }],
        handler: async () => {
          console.log("Running sendDigest task...");
          return {
            state: "succeeded",
            output: "Digest sent!",
          };
        },
      },
    ],
    //autoRun: [{ cron: "* * * * *", queue: "default", limit: 10 }],
  },
  secret: process.env.PAYLOAD_SECRET || "test-secret_key",
  email: testEmailAdapter,
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
});
