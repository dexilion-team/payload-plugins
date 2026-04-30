import type { Payload } from "payload";

import config from "@payload-config";
import { getPayload } from "payload";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

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

describe("RBAC Plugin - Plugin registration", () => {
  test("should register the roles collection", () => {
    expect(payload.collections["roles"]).toBeDefined();
  });
});

describe("RBAC Plugin - Roles Collection", () => {
  let createdRoleId: string;

  beforeAll(async () => {
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
    createdRoleId = role.id as string;
  });

  afterAll(async () => {
    if (createdRoleId) {
      await payload.delete({ collection: "roles", id: createdRoleId });
    }
  });

  test("should create a role with permissions", async () => {
    const role = await payload.findByID({
      collection: "roles",
      id: createdRoleId,
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
  let testUserId: string;
  let testRoleId: string;
  let mediaRoleId: string;

  beforeAll(async () => {
    const user = await payload.create({
      collection: "users",
      data: {
        email: "test-rbac-user@example.com",
        password: "testpassword123",
      },
    });
    testUserId = user.id as string;

    const role = await payload.create({
      collection: "roles",
      data: {
        role: "posts-editor",
        users: [user.id],
        permissions: {
          posts: { read: true, create: true, update: true, delete: false },
        },
      },
    });
    testRoleId = role.id as string;

    const mediaRole = await payload.create({
      collection: "roles",
      data: {
        role: "media-viewer",
        users: [user.id],
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
    mediaRoleId = mediaRole.id as string;
  });

  afterAll(async () => {
    for (const id of [testRoleId, mediaRoleId].filter(Boolean)) {
      await payload.delete({ collection: "roles", id });
    }
    if (testUserId) {
      await payload.delete({ collection: "users", id: testUserId });
    }
  });

  test("should create a test user with a role", async () => {
    const user = await payload.findByID({
      collection: "users",
      id: testUserId,
    });
    const role = await payload.findByID({
      collection: "roles",
      id: testRoleId,
    });

    expect(user.email).toBe("test-rbac-user@example.com");
    expect(role.role).toBe("posts-editor");
    expect(role.permissions?.posts).toMatchObject({
      read: true,
      create: true,
      update: true,
      delete: false,
    });
    // verify the user was actually associated with the role
    expect(role.users).toContainEqual(
      expect.objectContaining({ id: testUserId }),
    );
  });

  test("should return true when user has read permission", async () => {
    const mockReq = {
      user: { id: testUserId },
      payload,
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
      payload,
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
      payload,
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
      payload,
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
    const mockReq = {
      user: { id: testUserId },
      payload,
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
      payload,
    } as any;

    // Check if user has permission for any of the principals
    const hasPermission = await userHasPermission({
      req: mockReq,
      principal: ["posts", "nonexistent"],
      action: "read",
    });

    expect(hasPermission).toBe(true);
  });
});

describe("RBAC Plugin - Users collection has roles field", () => {
  let userId: string;

  beforeAll(async () => {
    const user = await payload.create({
      collection: "users",
      data: {
        email: "user-with-roles@test.com",
        password: "testpassword123",
      },
    });
    userId = user.id as string;
  });

  afterAll(async () => {
    if (userId) {
      await payload.delete({ collection: "users", id: userId });
    }
  });

  test("should have roles field on users collection", async () => {
    // The users collection should now have a roles relationship field
    // We can verify this by checking if we can update the user with roles
    const updatedUser = await payload.update({
      collection: "users",
      id: userId,
      data: {
        roles: [], // Empty array initially
      },
    });

    expect(updatedUser).toBeDefined();
  });
});

describe("RBAC Plugin - Collection access enforcement", () => {
  let restrictedUserId: string;
  let restrictedRoleId: string;
  let noRolesUserId: string;

  beforeAll(async () => {
    const restrictedUser = await payload.create({
      collection: "users",
      data: {
        email: "restricted-user@test.com",
        password: "testpassword123",
      },
    });
    restrictedUserId = restrictedUser.id as string;

    const role = await payload.create({
      collection: "roles",
      data: {
        role: "posts-reader-only",
        users: [restrictedUser.id],
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

    const noRolesUser = await payload.create({
      collection: "users",
      data: {
        email: "no-roles-user@test.com",
        password: "testpassword123",
      },
    });
    noRolesUserId = noRolesUser.id as string;
  });

  afterAll(async () => {
    await payload.delete({ collection: "users", id: restrictedUserId });
    await payload.delete({ collection: "users", id: noRolesUserId });
    await payload.delete({ collection: "roles", id: restrictedRoleId });
  });

  test("should allow read when user has read permission", async () => {
    const { docs } = await payload.find({
      collection: "posts",
      overrideAccess: false,
      req: { user: { id: restrictedUserId } } as any,
    });

    expect(docs).toBeDefined();
  });

  test("should deny create when user lacks create permission", async () => {
    await expect(
      payload.create({
        collection: "posts",
        overrideAccess: false,
        req: { user: { id: restrictedUserId } } as any,
        data: {},
      }),
    ).rejects.toThrow();
  });

  test("should deny access entirely when user has no roles", async () => {
    await expect(
      payload.find({
        collection: "posts",
        overrideAccess: false,
        req: { user: { id: noRolesUserId } } as any,
      }),
    ).rejects.toThrow();
  });
});
