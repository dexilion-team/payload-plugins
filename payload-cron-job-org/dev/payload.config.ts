import { buildConfig } from "payload";
import { MongoMemoryReplSet, MongoMemoryServer } from "mongodb-memory-server";
import { mongooseAdapter } from "@payloadcms/db-mongodb";
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

const buildConfigWithMemoryDB = async () => {
  // const memoryDB = await MongoMemoryReplSet.create({
  //   replSet: {
  //     count: 3,
  //     dbName: "payloadmemory",
  //   },
  // });
  const memoryDB = await MongoMemoryServer.create();

  return buildConfig({
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
    db: mongooseAdapter({
      ensureIndexes: true,
      url: memoryDB.getUri(),
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
};

export default buildConfigWithMemoryDB();
