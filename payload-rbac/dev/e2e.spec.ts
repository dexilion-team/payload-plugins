import { expect, type Page, test } from "@playwright/test";

const ADMIN_URL = process.env.ADMIN_URL || "http://localhost:3000";
const DEV_USER_EMAIL = "dev@payloadcms.com";
const DEV_USER_PASSWORD = "test";

// Helper to create a role and return to list
async function createRole(
  page: Page,
  name: string,
  permissions: string[] = [],
) {
  await page.goto(`${ADMIN_URL}/admin/collections/roles/create`);
  await page.waitForURL(/\/admin\/collections\/roles\/create/);
  await page.fill("#field-role", name);
  for (const permission of permissions) {
    await page.check(`input[aria-label="${permission}"]`);
  }
  await page.getByRole("button", { name: "Save" }).click();
  await page.waitForURL(/\/admin\/collections\/roles\/(?!create)[^/]+/, {
    timeout: 10000,
  });
}

// Helper to delete a role by name, assuming you're on the roles list
async function deleteRoleByName(page: Page, name: string) {
  await page.goto(`${ADMIN_URL}/admin/collections/roles`);
  const row = page.locator(`td:has-text('${name}')`);
  if (!(await row.isVisible())) return;
  await page.getByRole("link", { name }).click();
  await page.waitForURL(/\/admin\/collections\/roles\/[^/]+/);
  await page.locator("button:has(div.doc-controls__dots)").click();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();
  await page.waitForURL(/\/admin\/collections\/roles$/, { timeout: 10000 });
}

test.describe("RBAC Plugin - Admin UI", () => {
  test("should navigate to Roles collection", async ({ page }) => {
    await page.goto(`${ADMIN_URL}/admin`);
    await expect(page.locator("h2:has-text('Collections')")).toBeVisible();
    await page.getByRole("link", { name: "Show all Roles" }).click();
    await page.waitForURL(/\/admin\/collections\/roles/);
    await expect(page.locator("h1")).toContainText("Roles");
  });

  test("should create and delete new role with permissions", async ({
    page,
  }) => {
    test.setTimeout(60000);
    await deleteRoleByName(page, "Test Editor Role"); // clean up if exists

    await createRole(page, "Test Editor Role", [
      "posts:read",
      "posts:create",
      "posts:update",
    ]);

    // Navigate back to list
    await page.goto(`${ADMIN_URL}/admin/collections/roles`);
    await expect(page.locator("td:has-text('Test Editor Role')")).toBeVisible();

    // Delete it
    await deleteRoleByName(page, "Test Editor Role");
    await page.goto(`${ADMIN_URL}/admin/collections/roles`);
    await expect(
      page.locator("td:has-text('Test Editor Role')"),
    ).not.toBeVisible();
  });

  test("should edit an existing role and modify permissions", async ({
    page,
  }) => {
    test.setTimeout(60000);
    await deleteRoleByName(page, "Role To Edit"); // clean up if exists
    await createRole(page, "Role To Edit", ["posts:read"]);

    await page.goto(`${ADMIN_URL}/admin/collections/roles`);
    await page.getByRole("link", { name: "Role To Edit" }).click();
    await page.waitForURL(/\/admin\/collections\/roles\/[^/]+/);

    await expect(page.locator("#field-role")).toHaveValue("Role To Edit");
    await expect(page.locator('input[aria-label="posts:read"]')).toBeChecked();

    await page.check('input[aria-label="posts:delete"]');

    const [saveResponse] = await Promise.all([
      page.waitForResponse(
        (resp) =>
          /\/api\/roles\/[^/]+/.test(resp.url()) &&
          resp.request().method() === "PATCH",
      ),
      page.getByRole("button", { name: "Save" }).click(),
    ]);
    expect(saveResponse.status()).toBe(200);

    // Reload and verify the change persisted
    await page.reload();
    await expect(page.locator('input[aria-label="posts:delete"]')).toBeChecked({
      timeout: 10000,
    });

    // Cleanup
    await deleteRoleByName(page, "Role To Edit");
  });

  test("should delete a role", async ({ page }) => {
    test.setTimeout(60000);
    await deleteRoleByName(page, "Role To Delete"); // clean up if exists
    await createRole(page, "Role To Delete");

    await page.goto(`${ADMIN_URL}/admin/collections/roles`);
    await page.getByRole("link", { name: "Role To Delete" }).click();
    await page.waitForURL(/\/admin\/collections\/roles\/[^/]+/);

    await page.locator("button:has(div.doc-controls__dots)").click();
    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await page.waitForURL(/\/admin\/collections\/roles$/, { timeout: 10000 });

    await page.goto(`${ADMIN_URL}/admin/collections/roles`);
    await expect(
      page.locator("td:has-text('Role To Delete')"),
    ).not.toBeVisible();
  });

  test("should persist checked permissions after save and reload", async ({
    page,
  }) => {
    test.setTimeout(60000);
    await deleteRoleByName(page, "Persist Test Role"); // clean up if exists

    await createRole(page, "Persist Test Role", ["posts:read", "posts:create"]);

    // createRole saves and stays on the doc — wait for the URL to leave /create
    await page.waitForURL(/\/admin\/collections\/roles\/(?!create)[^/]+/);
    const savedUrl = page.url();

    // Reload to confirm the permissions were actually persisted
    await page.goto(savedUrl);
    await page.waitForURL(/\/admin\/collections\/roles\/(?!create)[^/]+/);

    await expect(page.locator('input[aria-label="posts:read"]')).toBeChecked();
    await expect(page.locator('input[aria-label="posts:create"]')).toBeChecked();
    await expect(
      page.locator('input[aria-label="posts:delete"]'),
    ).not.toBeChecked();

    // Cleanup
    await deleteRoleByName(page, "Persist Test Role");
  });

  test("should display permissions matrix correctly", async ({ page }) => {
    await page.goto(`${ADMIN_URL}/admin/collections/roles/create`);
    await page.waitForURL(/\/admin\/collections\/roles\/create/);

    const collectionRows = page.locator("table tbody tr");
    const rowCount = await collectionRows.count();
    expect(rowCount).toBeGreaterThanOrEqual(3);

    for (let i = 0; i < rowCount; i++) {
      const cells = collectionRows.nth(i).locator("td");
      for (let j = 1; j <= 4; j++) {
        await expect(
          cells.nth(j).locator("input[type='checkbox']"),
        ).toBeVisible();
      }
    }
  });
});

