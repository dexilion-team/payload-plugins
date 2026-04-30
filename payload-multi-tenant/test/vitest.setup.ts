import globalPayload, { buildConfig, Payload } from "payload";
import { afterAll, beforeAll } from "vitest";
import { sqliteAdapter } from "@payloadcms/db-sqlite";

import { multiTenantPlugin } from "../src/index";

let payload: Payload | null = null;

beforeAll(async () => {
  const config = await buildConfig({
    graphQL: { disable: true },
    secret: "payload-test-secret",
    admin: {
      user: "users",
    },
    db: sqliteAdapter({
      client: {
        url: ":memory:",
      },
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
});
