import type { CollectionSlug, Payload } from "payload";

import config from "@payload-config";
import { getPayload } from "payload";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { schedulePlugin } from "../src";

let payload: Payload;

afterAll(async () => {
  await payload.destroy();
});

beforeAll(async () => {
  payload = await getPayload({ config });
});

describe("payload-schedule plugin integration tests", () => {
  test("should add scheduledAt field to configured collection", async () => {
    const postsCollection = payload.config.collections.find(
      (c) => c.slug === "posts",
    );
    expect(postsCollection).toBeDefined();

    const scheduleField = postsCollection?.fields.find(
      (f) => "name" in f && f.name === "scheduledAt",
    );
    expect(scheduleField).toBeDefined();
    expect(scheduleField?.type).toBe("date");
  });

  test("should have publishScheduled task in jobs config", async () => {
    const tasks = payload.config.jobs?.tasks || [];
    const scheduleTask = tasks.find((t) => t.slug === "publishScheduled");
    expect(scheduleTask).toBeDefined();
    expect(scheduleTask?.handler).toBeDefined();
  });

  test("should have schedule configured for publishScheduled task", async () => {
    const tasks = payload.config.jobs?.tasks || [];
    const scheduleTask = tasks.find(
      (t) => t.slug === "publishScheduled",
    ) as any;
    expect(scheduleTask?.schedule).toBeDefined();
    expect(scheduleTask?.schedule).toHaveLength(1);
    expect(scheduleTask?.schedule?.[0]?.cron).toBe("5 0 * * *");
  });

  test("can create post with scheduledAt date", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const scheduledDate = futureDate.toISOString().split("T")[0];

    const user = await payload.find({
      collection: "users",
      where: { email: { equals: "dev@payloadcms.com" } },
    });

    const post = await payload.create({
      collection: "posts",
      data: {
        title: "Test Scheduled Post",
        slug: "test-scheduled-post",
        excerpt: "Test excerpt",
        author: user.docs[0]!.id,
        content: {
          root: {
            type: "root",
            children: [
              {
                type: "paragraph",
                children: [{ type: "text", text: "Test content", version: 1 }],
                direction: null,
                format: "",
                indent: 0,
                version: 1,
              },
            ],
            direction: null,
            format: "",
            indent: 0,
            version: 1,
          },
        },
        scheduledAt: scheduledDate,
        _status: "draft",
      },
    });

    expect(post.scheduledAt?.slice(0, 10)).toBe(scheduledDate);
    expect(post._status).toBe("draft");
  });

  test("should throw error when collection is not draft-enabled", () => {
    expect(() => {
      const testConfig = {
        collections: [
          {
            slug: "nonDraftCollection",
            fields: [],
            // Missing versions.drafts: true
          },
        ],
      };

      schedulePlugin({
        enabled: true,
        collections: ["nonDraftCollection" as CollectionSlug],
      })(testConfig as any);
    }).toThrow("not draft-enabled");
  });

  test("should throw error when collection does not exist", () => {
    expect(() => {
      const testConfig = {
        collections: [
          {
            slug: "posts",
            versions: { drafts: true },
            fields: [],
          },
        ],
      };

      schedulePlugin({
        enabled: true,
        collections: ["nonExistentCollection" as CollectionSlug],
      })(testConfig as any);
    }).toThrow("not found in Payload config");
  });

  test("should not modify config when plugin is disabled", () => {
    const testConfig = {
      collections: [
        {
          slug: "posts",
          versions: { drafts: true },
          fields: [],
        },
      ],
    };

    const result = schedulePlugin({
      enabled: false,
      collections: ["posts"],
    })(testConfig as any);

    expect(result).toBe(testConfig);
  });
});
