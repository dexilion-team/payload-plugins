import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import { blogPlugin } from "@dexilion/payload-blog";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

import { schedulePlugin } from "../src";
import { devUser } from "./helpers/credentials";
import { testEmailAdapter } from "./helpers/testEmailAdapter";
import { seed } from "./seed";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

if (!process.env.ROOT_DIR) {
  process.env.ROOT_DIR = dirname;
}

process.env.DATABASE_URL = ":memory:";

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
      fields: [
        {
          name: "name",
          type: "text",
        },
      ],
    },
  ],
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URI ?? ":memory:",
    },
  }),
  editor: lexicalEditor(),
  email: testEmailAdapter,
  onInit: async (payload) => {
    await seed(payload);
  },
  plugins: [
    blogPlugin({
      postsOverride: (posts) => ({
        ...posts,
        versions: { drafts: true },
      }),
    }),
    schedulePlugin({
      enabled: true,
      collections: ["posts"],
      // Example callback for custom actions on publish (e.g., cache busting)
      onPublish: async ({ doc, collection, payload }) => {
        payload.logger.info(
          `[@dexilion/payload-schedule] Custom onPublish callback triggered for document ${doc.id} in collection ${collection.slug}`,
        );
        // Add custom logic here like cache busting, webhooks, etc.
      },
    }),
  ],
  secret: process.env.PAYLOAD_SECRET || "test-secret_key",
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
});
