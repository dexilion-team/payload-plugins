import { mongooseAdapter } from "@payloadcms/db-mongodb";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { MongoClient } from "mongodb";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import path from "path";
import { buildConfig } from "payload";
import dynamicBlocks from "../src";
import sharp from "sharp";
import { fileURLToPath } from "url";

import { devUser } from "./helpers/credentials";
import { testEmailAdapter } from "./helpers/testEmailAdapter";
import { seed } from "./seed";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

if (!process.env.ROOT_DIR) {
  process.env.ROOT_DIR = dirname;
}

const waitForMongo = async (
  uri: string,
  retries = 10,
  delayMs = 1000,
): Promise<void> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
    try {
      await client.connect();
      await client.db("admin").command({ ping: 1 });
      return;
    } catch {
      if (attempt === retries) {
        throw new Error(`MongoDB not ready after ${retries} attempts`);
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    } finally {
      await client.close().catch(() => {});
    }
  }
};

const buildConfigWithMemoryDB = async () => {
  const memoryDB = await MongoMemoryReplSet.create({
    replSet: {
      count: 3,
      dbName: "payloadmemory",
    },
  });

  const uri = `${memoryDB.getUri()}&retryWrites=true`;
  await waitForMongo(uri);

  process.env.DATABASE_URL = uri;

  return buildConfig({
    admin: {
      importMap: {
        autoGenerate: true,
        baseDir: path.resolve(dirname),
      },
      autoLogin: {
        email: devUser.email,
        password: devUser.password,
      },
    },
    collections: [
      {
        slug: "posts",
        fields: [
          {
            name: "content",
            label: "Content",
            labels: {
              singular: "Content Block",
              plural: "Content Blocks",
            },
            type: "blocks",
            blocks: [],
            custom: { dynamic: true },
          },
        ],
      },
      {
        slug: "media",
        fields: [],
        upload: {
          staticDir: path.resolve(dirname, "media"),
        },
      },
      {
        slug: "users",
        auth: true,
        admin: {
          useAsTitle: "email",
          defaultColumns: ["email", "updatedAt", "createdAt"],
        },
        fields: [],
      },
    ],
    db: mongooseAdapter({
      ensureIndexes: true,
      url: process.env.DATABASE_URL || "",
    }),
    editor: lexicalEditor(),
    email: testEmailAdapter,
    onInit: async (payload) => {
      await seed(payload);
    },
    plugins: [
      dynamicBlocks({
        collections: ["posts"],
      }),
    ],
    secret: process.env.PAYLOAD_SECRET || "test-secret_key",
    sharp,
    typescript: {
      outputFile: path.resolve(dirname, "payload-types.ts"),
    },
  });
};

export default buildConfigWithMemoryDB();
