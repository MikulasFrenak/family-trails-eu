import { test, expect } from "@playwright/test";

test("switches the UI language and persists it across reload", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Family Trails" })).toBeVisible();

  await page.getByRole("button", { name: "cz", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Rodinné výlety" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Rodinné výlety" })).toBeVisible();

  await page.getByRole("button", { name: "en", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Family Trails" })).toBeVisible();
});
