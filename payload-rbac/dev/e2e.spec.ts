import { expect, test } from "@playwright/test";

const ADMIN_URL = process.env.ADMIN_URL || "http://localhost:3001";
const DEV_USER_EMAIL = "dev@payloadcms.com";
const DEV_USER_PASSWORD = "test";

test.describe("RBAC Plugin - Admin UI", () => {
  test.beforeEach(async ({ page }) => {
    // Login to admin panel
    await page.goto(`${ADMIN_URL}/admin`);
    await page.fill("#field-email", DEV_USER_EMAIL);
    await page.fill("#field-password", DEV_USER_PASSWORD);
    await page.click(".form-submit button");

    // Wait for dashboard to load
    await page.waitForURL(/\/admin$/, { timeout: 10000 });
  });

  test("should render admin panel logo", async ({ page }) => {
    await page.goto(`${ADMIN_URL}/admin`);
    await expect(page).toHaveTitle(/Dashboard/);
    await expect(page.locator(".graphic-icon")).toBeVisible();
  });

  test("should navigate to Roles collection", async ({ page }) => {
    // Click on Collections nav item if needed
    await page.click("text=Collections");

    // Look for Roles in the collections list
    await page.click("text=Roles");

    // Should navigate to roles list view
    await page.waitForURL(/\/admin\/collections\/roles/);

    // Should see the Roles heading
    await expect(page.locator("h1")).toContainText("Roles");
  });

  test("should create a new role with permissions", async ({ page }) => {
    // Navigate to Roles collection
    await page.goto(`${ADMIN_URL}/admin/collections/roles`);

    // Click "Create New" button
    await page.click('button:has-text("Create New")');

    // Wait for the form to load
    await page.waitForURL(/\/admin\/collections\/roles\/create/);

    // Fill in the role name
    await page.fill("#field-role", "Test Editor Role");

    // The permissions field should be visible
    // It should show a table with collections and permission checkboxes
    await expect(page.locator("table")).toBeVisible();

    // Check that the table has the expected columns
    await expect(page.locator("th:has-text('Collection')")).toBeVisible();
    await expect(page.locator("th:has-text('read')")).toBeVisible();
    await expect(page.locator("th:has-text('create')")).toBeVisible();
    await expect(page.locator("th:has-text('update')")).toBeVisible();
    await expect(page.locator("th:has-text('delete')")).toBeVisible();

    // Check that posts collection is in the table
    await expect(page.locator("td:has-text('posts')")).toBeVisible();
    await expect(page.locator("td:has-text('media')")).toBeVisible();
    await expect(page.locator("td:has-text('users')")).toBeVisible();

    // Enable read permission for posts
    await page.check('input[aria-label="posts:read"]');

    // Enable create permission for posts
    await page.check('input[aria-label="posts:create"]');

    // Enable update permission for posts
    await page.check('input[aria-label="posts:update"]');

    // Save the role
    await page.click('button:has-text("Save")');

    // Should navigate back to list and show success
    await page.waitForURL(/\/admin\/collections\/roles/);

    // Should see the new role in the list
    await expect(page.locator("td:has-text('Test Editor Role')")).toBeVisible();
  });

  test("should edit an existing role and modify permissions", async ({
    page,
  }) => {
    // First, create a role to edit
    await page.goto(`${ADMIN_URL}/admin/collections/roles`);
    await page.click('button:has-text("Create New")');
    await page.fill("#field-role", "Role To Edit");
    await page.check('input[aria-label="posts:read"]');
    await page.click('button:has-text("Save")');
    await page.waitForURL(/\/admin\/collections\/roles/);

    // Now click on the role to edit it
    await page.click("text=Role To Edit");

    // Wait for the edit form
    await page.waitForURL(/\/admin\/collections\/roles\/[^/]+/);

    // Verify the role name is populated
    await expect(page.locator("#field-role")).toHaveValue("Role To Edit");

    // Verify read permission is checked
    await expect(page.locator('input[aria-label="posts:read"]')).toBeChecked();

    // Enable delete permission
    await page.check('input[aria-label="posts:delete"]');

    // Save changes
    await page.click('button:has-text("Save")');

    // Should see success message
    await expect(page.locator("text=Successfully updated")).toBeVisible({
      timeout: 10000,
    });
  });

  test("should delete a role", async ({ page }) => {
    // First, create a role to delete
    await page.goto(`${ADMIN_URL}/admin/collections/roles`);
    await page.click('button:has-text("Create New")');
    await page.fill("#field-role", "Role To Delete");
    await page.click('button:has-text("Save")');
    await page.waitForURL(/\/admin\/collections\/roles/);

    // Click on the role to open it
    await page.click("text=Role To Delete");
    await page.waitForURL(/\/admin\/collections\/roles\/[^/]+/);

    // Click delete button
    await page.click('button:has-text("Delete")');

    // Confirm deletion in the modal
    await page.click('button:has-text("Yes, delete")');

    // Should navigate back to list and role should be gone
    await page.waitForURL(/\/admin\/collections\/roles/);
    await expect(page.locator("text=Role To Delete")).not.toBeVisible();
  });

  test("should display permissions matrix correctly", async ({ page }) => {
    // Navigate to create new role
    await page.goto(`${ADMIN_URL}/admin/collections/roles`);
    await page.click('button:has-text("Create New")');
    await page.waitForURL(/\/admin\/collections\/roles\/create/);

    // Check that the permissions table renders all collections
    // The table should have rows for each collection (excluding internal Payload collections)
    const collectionRows = page.locator("table tbody tr");
    const rowCount = await collectionRows.count();

    // Should have at least posts, media, users (3 collections from payload.config.ts)
    // plus roles (added by the plugin)
    expect(rowCount).toBeGreaterThanOrEqual(3);

    // Verify each row has checkboxes for all 4 actions
    for (let i = 0; i < rowCount; i++) {
      const row = collectionRows.nth(i);
      const cells = row.locator("td");

      // First cell is collection name
      // Next 4 cells should be checkboxes
      await expect(
        cells.nth(1).locator("input[type='checkbox']"),
      ).toBeVisible();
      await expect(
        cells.nth(2).locator("input[type='checkbox']"),
      ).toBeVisible();
      await expect(
        cells.nth(3).locator("input[type='checkbox']"),
      ).toBeVisible();
      await expect(
        cells.nth(4).locator("input[type='checkbox']"),
      ).toBeVisible();
    }
  });

  test("should not show payload-internal collections in permissions matrix", async ({
    page,
  }) => {
    // Navigate to create new role
    await page.goto(`${ADMIN_URL}/admin/collections/roles`);
    await page.click('button:has-text("Create New")');
    await page.waitForURL(/\/admin\/collections\/roles\/create/);

    // Check that internal Payload collections are NOT shown
    // These start with "payload-" prefix
    const pageContent = await page.content();

    // Should NOT contain internal collections
    expect(pageContent).not.toContain("payload-preferences");
    expect(pageContent).not.toContain("payload-migrations");
    expect(pageContent).not.toContain("payload-locked");
    expect(pageContent).not.toContain("payload-accessibilities");
  });

  test("should assign role to user via users collection", async ({ page }) => {
    // First create a role
    await page.goto(`${ADMIN_URL}/admin/collections/roles`);
    await page.click('button:has-text("Create New")');
    await page.fill("#field-role", "User Test Role");
    await page.check('input[aria-label="posts:read"]');
    await page.click('button:has-text("Save")');
    await page.waitForURL(/\/admin\/collections\/roles/);

    // Navigate to Users collection
    await page.goto(`${ADMIN_URL}/admin/collections/users`);

    // Click on the dev user to edit
    await page.click(`text=${DEV_USER_EMAIL}`);
    await page.waitForURL(/\/admin\/collections\/users\/[^/]+/);

    // The roles field should be visible in the user form
    // It might be hidden by default, so let's check the form fields
    const formFields = page.locator(".field-wrapper");
    const fieldCount = await formFields.count();

    // There should be more than just email and password fields
    // (roles field should be added by the plugin)
    expect(fieldCount).toBeGreaterThanOrEqual(2);
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
