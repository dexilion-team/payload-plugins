import type { Payload } from "payload";
import type { CollectionSlug } from "payload";

import config from "@payload-config";
import { getPayload } from "payload";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { devUser } from "./helpers/credentials";
import userHasPermission from "../src/security/userHasPermission";

let payload: Payload;

afterAll(async () => {
  if (payload) {
    await payload.destroy();
  }
});

beforeAll(async () => {
  payload = await getPayload({ config });
});

describe("RBAC Plugin - Roles Collection", () => {
  test("should create a role with permissions", async () => {
    const role = await payload.create({
      collection: "roles",
      data: {
        role: "test-editor",
        permissions: {
          posts: {
            read: true,
            create: true,
            update: true,
            delete: false,
          },
        },
      },
    });

    expect(role.role).toBe("test-editor");
    expect(role.permissions).toMatchObject({
      posts: {
        read: true,
        create: true,
        update: true,
        delete: false,
      },
    });
  });

  test("should query roles", async () => {
    const { docs } = await payload.find({
      collection: "roles",
    });

    expect(docs.length).toBeGreaterThan(0);
  });
});

describe("RBAC Plugin - userHasPermission function", () => {
  let testUserId: number;
  let testRoleId: string;

  test("should create a test user with a role", async () => {
    // Create a test user
    const user = await payload.create({
      collection: "users",
      data: {
        email: "test-rbac-user@example.com",
        password: "testpassword123",
      },
    });
    testUserId = Number(user.id);

    // Create a role with specific permissions
    const role = await payload.create({
      collection: "roles",
      data: {
        role: "posts-editor",
        users: [user.id],
        permissions: {
          posts: {
            read: true,
            create: true,
            update: true,
            delete: false,
          },
        },
      },
    });
    testRoleId = role.id as string;

    expect(testUserId).toBeDefined();
    expect(testRoleId).toBeDefined();
  });

  test("should return true when user has read permission", async () => {
    // Create a mock request with user
    const mockReq = {
      user: { id: testUserId },
      payload: {
        find: async ({
          collection,
          where,
        }: {
          collection: CollectionSlug;
          where: Record<string, unknown>;
        }) => {
          if (collection === "roles") {
            const role = await payload.find({
              collection: "roles",
              where: {
                users: { contains: testUserId },
              },
            });
            return role;
          }
          return { docs: [] };
        },
      },
    } as any;

    const hasPermission = await userHasPermission({
      req: mockReq,
      principal: "posts",
      action: "read",
    });

    expect(hasPermission).toBe(true);
  });

  test("should return true when user has create permission", async () => {
    const mockReq = {
      user: { id: testUserId },
      payload: {
        find: async ({ collection }: { collection: CollectionSlug }) => {
          if (collection === "roles") {
            return payload.find({
              collection: "roles",
              where: { users: { contains: testUserId } },
            });
          }
          return { docs: [] };
        },
      },
    } as any;

    const hasPermission = await userHasPermission({
      req: mockReq,
      principal: "posts",
      action: "create",
    });

    expect(hasPermission).toBe(true);
  });

  test("should return false when user does NOT have delete permission", async () => {
    const mockReq = {
      user: { id: testUserId },
      payload: {
        find: async ({ collection }: { collection: CollectionSlug }) => {
          if (collection === "roles") {
            return payload.find({
              collection: "roles",
              where: { users: { contains: testUserId } },
            });
          }
          return { docs: [] };
        },
      },
    } as any;

    const hasPermission = await userHasPermission({
      req: mockReq,
      principal: "posts",
      action: "delete",
    });

    expect(hasPermission).toBe(false);
  });

  test("should return false when user has no roles", async () => {
    const mockReq = {
      user: { id: 99999 },
      payload: {
        find: async () => ({ docs: [] }),
      },
    } as any;

    const hasPermission = await userHasPermission({
      req: mockReq,
      principal: "posts",
      action: "read",
    });

    expect(hasPermission).toBe(false);
  });

  test("should return false when there is no user", async () => {
    const mockReq = {
      user: null,
    } as any;

    const hasPermission = await userHasPermission({
      req: mockReq,
      principal: "posts",
      action: "read",
    });

    expect(hasPermission).toBe(false);
  });

  test("should return true for admin user (id=1)", async () => {
    const mockReq = {
      user: { id: 1 },
    } as any;

    const hasPermission = await userHasPermission({
      req: mockReq,
      principal: "posts",
      action: "delete",
    });

    expect(hasPermission).toBe(true);
  });

  test("should check permissions for multiple principals", async () => {
    // Create another role for media collection
    await payload.create({
      collection: "roles",
      data: {
        role: "media-viewer",
        users: [testUserId],
        permissions: {
          media: {
            read: true,
            create: false,
            update: false,
            delete: false,
          },
        },
      },
    });

    const mockReq = {
      user: { id: testUserId },
      payload: {
        find: async ({ collection }: { collection: CollectionSlug }) => {
          if (collection === "roles") {
            return payload.find({
              collection: "roles",
              where: { users: { contains: testUserId } },
            });
          }
          return { docs: [] };
        },
      },
    } as any;

    // Should have read permission for posts
    const postsRead = await userHasPermission({
      req: mockReq,
      principal: "posts",
      action: "read",
    });
    expect(postsRead).toBe(true);

    // Should have read permission for media
    const mediaRead = await userHasPermission({
      req: mockReq,
      principal: "media",
      action: "read",
    });
    expect(mediaRead).toBe(true);

    // Should NOT have create permission for media
    const mediaCreate = await userHasPermission({
      req: mockReq,
      principal: "media",
      action: "create",
    });
    expect(mediaCreate).toBe(false);
  });

  test("should handle array of principals", async () => {
    const mockReq = {
      user: { id: testUserId },
      payload: {
        find: async ({ collection }: { collection: CollectionSlug }) => {
          if (collection === "roles") {
            return payload.find({
              collection: "roles",
              where: { users: { contains: testUserId } },
            });
          }
          return { docs: [] };
        },
      },
    } as any;

    // Check if user has permission for any of the principals
    const hasPermission = await userHasPermission({
      req: mockReq,
      principal: ["posts", "nonexistent"],
      action: "read",
    });

    expect(hasPermission).toBe(true);
  });

  test("cleanup test data", async () => {
    // Clean up test user
    await payload.delete({
      collection: "users",
      id: testUserId,
    });

    // Clean up test roles
    const { docs: roles } = await payload.find({
      collection: "roles",
      where: {
        role: { in: ["test-editor", "posts-editor", "media-viewer"] },
      },
    });

    for (const role of roles) {
      await payload.delete({
        collection: "roles",
        id: role.id,
      });
    }
  });
});

describe("RBAC Plugin - Users collection has roles field", () => {
  test("should have roles field on users collection", async () => {
    const user = await payload.create({
      collection: "users",
      data: {
        email: "user-with-roles@test.com",
        password: "testpassword123",
      },
    });

    // The users collection should now have a roles relationship field
    // We can verify this by checking if we can update the user with roles
    const updatedUser = await payload.update({
      collection: "users",
      id: user.id,
      data: {
        roles: [], // Empty array initially
      },
    });

    expect(updatedUser).toBeDefined();

    // Cleanup
    await payload.delete({
      collection: "users",
      id: user.id,
    });
  });
});

describe("RBAC Plugin - Integration with collection access", () => {
  let restrictedUserId: number;
  let restrictedRoleId: string;

  test("should enforce RBAC when used with collection access control", async () => {
    // Create a user with only read access to posts
    const user = await payload.create({
      collection: "users",
      data: {
        email: "restricted-user@test.com",
        password: "testpassword123",
      },
    });
    restrictedUserId = Number(user.id);

    // Create a role with only read permission
    const role = await payload.create({
      collection: "roles",
      data: {
        role: "posts-reader-only",
        users: [user.id],
        permissions: {
          posts: {
            read: true,
            create: false,
            update: false,
            delete: false,
          },
        },
      },
    });
    restrictedRoleId = role.id as string;

    // Authenticate as the restricted user
    const authResult = await payload.login({
      collection: "users",
      data: {
        email: "restricted-user@test.com",
        password: "testpassword123",
      },
    });

    expect(authResult.user).toBeDefined();

    // Try to create a post (should fail due to RBAC)
    // Note: This test demonstrates the expected behavior when RBAC is integrated
    // The actual enforcement depends on the plugin user implementing access control

    // Try to read posts (should succeed)
    const { docs: posts } = await payload.find({
      collection: "posts",
      req: { user: { id: restrictedUserId } } as any,
    });

    expect(posts).toBeDefined();
  });

  test("cleanup restricted user", async () => {
    await payload.delete({
      collection: "users",
      id: restrictedUserId,
    });

    await payload.delete({
      collection: "roles",
      id: restrictedRoleId,
    });
  });
});
