import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import path from "path";
import { buildConfig } from "payload";
import { rbacPlugin } from "../src";
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

const collections = [
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
    {
      slug: "users",
      auth: true,
      admin: {
        useAsTitle: "email",
        defaultColumns: ["email", "updatedAt", "createdAt"],
      },
      fields: [],
    },
  ];

export default buildConfig({
    admin: {
      importMap: {
        autoGenerate: true,
        baseDir: path.join(path.resolve(dirname), "../src"),
      },
      autoLogin: {
        email: devUser.email,
        password: devUser.password,
      },
    },
    // Example usage of the RBAC plugin
    collections,
    db: sqliteAdapter({
      client: {
        url: process.env.DATABASE_URI ?? "file:./dev/dev.db",
      },
    }),
    editor: lexicalEditor(),
    email: testEmailAdapter,
    onInit: async (payload) => {
      await seed(payload);
    },
    plugins: [rbacPlugin()],
    secret: process.env.PAYLOAD_SECRET || "test-secret_key",
    sharp,
    typescript: {
      outputFile: path.resolve(dirname, "payload-types.ts"),
    },
});
