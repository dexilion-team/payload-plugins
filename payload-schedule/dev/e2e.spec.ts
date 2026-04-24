import { expect, test } from "@playwright/test";

test.describe("payload-schedule plugin e2e tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL(/\/admin/);
  });

  test("should show scheduledAt field in posts collection", async ({
    page,
  }) => {
    // Navigate to posts collection
    await page.goto("/admin/collections/posts");

    // Create a new post
    await page
      .locator('a[href="/admin/collections/posts/create"]')
      .nth(1)
      .click();
    await page.waitForURL("/admin/collections/posts/create");

    // Check that scheduledAt field is visible in sidebar
    await expect(
      page.locator(
        "#field-scheduledAt .react-datepicker__input-container input",
      ),
    ).toBeVisible();

    // Check the label
    await expect(
      page.locator('label:has-text("Schedule for publication")'),
    ).toBeVisible();
  });

  test("can create post with scheduled date", async ({ page }) => {
    // Navigate to posts collection and create new post
    await page.goto("/admin/collections/posts");
    await page
      .locator('a[href="/admin/collections/posts/create"]')
      .nth(1)
      .click();

    // Fill in required fields
    await page.fill("#field-title", "Test Scheduled Post");
    await page.fill("#field-slug", "test-scheduled-post-e2e");

    // Textarea
    await page.fill("#field-excerpt", "Some excerpt text");

    // Lexical editor (contenteditable)
    await page.locator('[data-lexical-editor="true"]').click();
    await page
      .locator('[data-lexical-editor="true"]')
      .fill("Some body content");

    // Set a future scheduled date
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = futureDate.toISOString().split("T")[0]!;
    await page
      .locator("#field-scheduledAt .react-datepicker__input-container input")
      .fill(dateStr);

    // Save as draft
    await page.click('button:has-text("Save")');
    await page.waitForURL(/\/admin\/collections\/posts\/[\w-]+$/);

    // Verify the post was created
    await expect(page.locator("h1")).toContainText("Test Scheduled Post");
  });
});
