import { mongooseAdapter } from "@payloadcms/db-mongodb";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
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

const buildConfigWithMemoryDB = async () => {
  const memoryDB = await MongoMemoryReplSet.create({
    replSet: {
      count: 3,
      dbName: "payloadmemory",
    },
  });

  process.env.DATABASE_URL = `${memoryDB.getUri()}&retryWrites=true`;

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
            name: "title",
            type: "text",
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
