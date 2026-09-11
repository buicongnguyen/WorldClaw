import { test, expect } from "@playwright/test";

test("choose armies, see native and exclusive research, and preserve selection after reload", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator("#new-game").click();
  await expect(page.locator(".faction-card")).toHaveCount(4);
  await page.locator('input[value="stone"]').check();
  await page.locator("#rival-faction").selectOption("tide");
  await page.screenshot({
    path: "test-results/faction-picker-mobile.png",
    fullPage: true,
  });
  await page.locator("#start-new").click();
  await expect(page.locator(".realm-card h2")).toContainText("Stoneward Clans");
  const s = await page.evaluate(() => window.__game.getState());
  expect(s.players.map((p) => p.faction)).toEqual(["stone", "tide"]);
  expect(s.units[0].type).toBe("guardian");
  await page.locator("#research").click();
  await expect(page.locator('[data-tech="masonry"]')).toHaveText("Learned");
  await expect(page.locator('[data-tech="shieldwall"]')).toBeVisible();
  await expect(page.locator('[data-tech="groveguard"]')).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".realm-card h2")).toContainText("Stoneward Clans");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
