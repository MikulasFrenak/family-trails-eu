import { test, expect } from "@playwright/test";
import { healingLocator } from "./lib/healingLocator";

test("switches the UI language and persists it across reload", async ({ page }) => {
  await page.goto("/");

  const heading = await healingLocator(page, "language-switcher.heading", "h1");
  await expect(heading).toHaveText("Family Trails");

  const czButton = await healingLocator(page, "language-switcher.cz-button", 'button:text-is("cz"):visible');
  await czButton.click();
  await expect(heading).toHaveText("Rodinné výlety");

  await page.reload();
  await expect(heading).toHaveText("Rodinné výlety");

  const enButton = await healingLocator(page, "language-switcher.en-button", 'button:text-is("en"):visible');
  await enButton.click();
  await expect(heading).toHaveText("Family Trails");
});
