import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { lexicalEditor } from "@payloadcms/richtext-lexical";

import path from "path";
import { buildConfig } from "payload";
import dynamicBlocks from "@dexilion/payload-dynamic-blocks";
import wysiwygBlocks from "../src";
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
    {
      slug: "pages",
      admin: {
        livePreview: {
          url: ({ data, req }) => {
            const base = req.headers.get("origin") ?? "http://localhost:3000";
            return `${base}/admin/preview/${data.id}`;
          },
        },
      },
      fields: [
        {
          name: "title",
          type: "text",
          required: true,
        },
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
    wysiwygBlocks({
      wysiwyg: true,
    }),
    dynamicBlocks({
      collections: ["pages"],
    }),
  ],
  secret: process.env.PAYLOAD_SECRET || "test-secret_key",
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
});
