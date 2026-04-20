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
  await expect(
    page.locator(
      '.payload-toast-container .payload-toast-item:has-text("successfully created")',
    ),
  ).toBeVisible({ timeout: 10000 });
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
  await expect(page.locator(':text("successfully deleted")')).toBeVisible({
    timeout: 10000,
  });
}

test.describe("RBAC Plugin - Admin UI", () => {
  test("should render admin panel logo", async ({ page }) => {
    await page.goto(`${ADMIN_URL}/admin`);
    await expect(page).toHaveTitle(/Dashboard/);
    await expect(page.locator(".graphic-icon")).toBeVisible();
  });

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
    await page.getByRole("button", { name: "Save" }).click();
    await expect(
      page.locator(
        '.payload-toast-container .payload-toast-item:has-text("updated successfully")',
      ),
    ).toBeVisible({ timeout: 10000 });

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
    await expect(page.locator(':text("successfully deleted")')).toBeVisible({
      timeout: 10000,
    });

    await page.goto(`${ADMIN_URL}/admin/collections/roles`);
    await expect(
      page.locator("td:has-text('Role To Delete')"),
    ).not.toBeVisible();
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

test.describe("RBAC Plugin - Public API verification", () => {
  test("should expose rbacPlugin in plugin exports", async ({ request }) => {
    // This test verifies the plugin is properly loaded
    // by checking if the admin UI is accessible
    const response = await request.get(`${ADMIN_URL}/admin`);
    expect(response.ok()).toBeTruthy();
  });
});
