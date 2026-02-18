import globalPayload, { buildConfig, Payload } from "payload";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll } from "vitest";
import { mongooseAdapter } from "@payloadcms/db-mongodb";
import { multiTenantPlugin } from "../src/index";

let mongo: MongoMemoryServer | null = await MongoMemoryServer.create();
let payload: Payload | null = null;

beforeAll(async () => {
  const config = await buildConfig({
    graphQL: { disable: true },
    secret: "payload-test-secret",
    admin: {
      user: "users",
    },
    db: mongooseAdapter({
      url: mongo!.getUri()!,
    }),
    collections: [
      {
        slug: "users",
        auth: true,
        fields: [
          {
            name: "name",
            type: "text",
          },
        ],
      },
      {
        slug: "tenants",
        fields: [
          {
            name: "name",
            type: "text",
          },
        ],
      },
      {
        slug: "pages",
        fields: [
          {
            name: "title",
            type: "text",
          },
        ],
      },
    ],
    plugins: [
      multiTenantPlugin({
        collections: ["pages"],
      }),
    ],
  });

  payload = await globalPayload.init({ config });

  globalThis.payload = payload;
});

afterAll(async () => {
  await payload?.destroy();
  await mongo!.stop();
});
