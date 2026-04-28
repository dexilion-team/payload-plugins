import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { lexicalEditor } from "@payloadcms/richtext-lexical";

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

export default buildConfig({
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
  db: sqliteAdapter({
    client: {
      url: ":memory:",
    },
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
