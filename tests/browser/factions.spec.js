import { test, expect } from "@playwright/test";
import { FACTION_TYPES } from "../../src/factions.js";
import { createGame, neighbors, passable } from "../../src/game.js";

for (const [key, terrain] of [
  ["mountain", "mountain"],
  ["water", "water"],
]) {
  test(`${key} tribe can move onto native terrain and reload with Blender art`, async ({
    page,
  }) => {
    const s = createGame(417, 17, [key, "ember"]);
    const target = s.tiles.find(
      (t) => t.terrain === terrain && neighbors(s, t).some(passable),
    );
    s.units[0].tile = neighbors(s, target).find(passable).id;
    s.explored[0] = s.tiles.map((t) => t.id);
    await page.addInitScript(
      (state) => localStorage.setItem("crown-canopy-v1", JSON.stringify(state)),
      s,
    );
    await page.goto("/");
    await page.locator("#tile-picker").selectOption(String(target.id));
    await page.getByRole("button", { name: /Move to/ }).click();
    expect(
      await page.evaluate(() => window.__game.getState().units[0].tile),
    ).toBe(target.id);
    await expect(page.locator("canvas")).toHaveAttribute("data-art", "ready");
    await page.locator("#focus-camera").click();
    await page.screenshot({ path: `test-results/${key}-native-terrain.png` });
    // A new page without the fixture initializer reads the actual moved save.
    const restored = await page.context().newPage();
    await restored.goto("/");
    expect(
      await restored.evaluate(() => window.__game.getState().units[0].tile),
    ).toBe(target.id);
    await restored.close();
  });
}

test("all five elemental tribes are selectable and expose their exclusive research", async ({
  page,
}) => {
  await page.goto("/");
  for (const key of ["desert", "ice", "fire", "water", "mountain"]) {
    await page.locator("#new-game").click();
    await page.locator(`input[value="${key}"]`).check();
    await page.locator("#rival-faction").selectOption(key);
    await page.locator("#start-new").click();
    await expect(page.locator(".realm-card h2")).toContainText(
      FACTION_TYPES[key].name,
    );
    await page.locator("#research").click();
    await expect(
      page.locator(`[data-tech="${FACTION_TYPES[key].doctrine}"]`),
    ).toBeVisible();
    await page.getByRole("button", { name: "Close dialog" }).click();
    await page.reload();
    await expect(page.locator(".realm-card h2")).toContainText(
      FACTION_TYPES[key].name,
    );
  }
});

test("choose armies, see native and exclusive research, and preserve selection after reload", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator("#new-game").click();
  await expect(page.locator(".faction-card")).toHaveCount(9);
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
