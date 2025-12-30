import { describe, expect, it } from "vitest";

describe("@dexilion/payload-multi-tenant", () => {
  it("scopes access to tenant-scoped collections", async () => {
    const tenantA = await payload.create({
      collection: "tenants",
      data: { name: "Tenant A" },
    });

    const tenantB = await payload.create({
      collection: "tenants",
      data: { name: "Tenant B" },
    });

    const user = await payload.create({
      collection: "users",
      overrideAccess: true,
      data: {
        email: "user@example.com",
        password: "password",
        tenant: [tenantA.id],
      },
    });

    await payload.create({
      collection: "pages",
      overrideAccess: false,
      user,
      data: {
        title: "Page A",
        tenant: tenantA.id,
      },
    });

    await expect(
      payload.create({
        collection: "pages",
        overrideAccess: false,
        user,
        data: {
          title: "Page B",
          tenant: tenantB.id,
        },
      }),
    ).rejects.toThrow();

    await payload.create({
      collection: "pages",
      overrideAccess: true,
      data: {
        title: "Page B (seeded)",
        tenant: tenantB.id,
      },
    });

    const res = await payload.find({
      collection: "pages",
      overrideAccess: false,
      user,
    });

    expect(res.docs).toHaveLength(1);
    expect(res.docs[0]?.title).toBe("Page A");
  });
});
