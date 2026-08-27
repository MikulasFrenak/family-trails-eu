import { test, expect } from "@playwright/test";

test("toggles a category chip active and back to inactive", async ({ page }) => {
  await page.goto("/");

  const zooChip = page.getByRole("button", { name: "Zoo", exact: true });
  await expect(zooChip).toBeVisible();
  await expect(zooChip).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");

  await zooChip.click();
  await expect(zooChip).toHaveCSS("background-color", "rgb(242, 84, 91)");

  await zooChip.click();
  await expect(zooChip).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
});
