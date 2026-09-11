import { test, expect } from "@playwright/test";
import { createGame, TECHS } from "../../src/game.js";

test("detailed Blender scene loads, batches a full island and supports close-up inspection", async ({
  page,
}) => {
  test.setTimeout(60000);
  const s = createGame(417, 17);
  s.explored[0] = s.tiles.map((t) => t.id);
  s.players[0].tech = Object.keys(TECHS);
  const capital = s.tiles.find((t) => t.city?.capital === 0);
  capital.city.level = 3;
  capital.city.specialization = "market";
  capital.city.fortification = "walls";
  for (const t of s.tiles.filter((t) => t.owner === 0 && !t.city)) {
    t.improved = true;
    t.building = "farm2";
  }
  s.units[0].type = "sentinel";
  s.units[0].hp = 16;
  await page.addInitScript(
    (save) => localStorage.setItem("crown-canopy-v1", JSON.stringify(save)),
    s,
  );
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.waitForFunction(
    () => window.__game?.artDiagnostics().art === "ready",
  );
  await page.screenshot({ path: "test-results/blender-full-island.png" });
  const diagnostics = await page.evaluate(() => window.__game.artDiagnostics());
  await page.waitForTimeout(250);
  expect(
    (await page.evaluate(() => window.__game.artDiagnostics().renderedFrames)) -
      diagnostics.renderedFrames,
  ).toBeLessThanOrEqual(1);
  expect(diagnostics.batches).toBeLessThan(180);
  expect(diagnostics.triangles).toBeLessThan(2500000);
  expect(diagnostics.triangles).toBeGreaterThan(100000);
  await page.locator("#tile-picker").selectOption(String(capital.id));
  await page.locator("#focus-camera").click();
  await page.screenshot({ path: "test-results/blender-closeup.png" });
  await page.locator("#reset-camera").click();
  expect(errors).toEqual([]);
  console.log("BLENDER_RENDER", JSON.stringify(diagnostics));
});

test("failed model download retains a playable fallback", async ({ page }) => {
  await page.route("**/models/kingdom.glb", (route) => route.abort());
  await page.goto("/");
  await page.waitForFunction(
    () => window.__game?.artDiagnostics().art === "fallback",
  );
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator("#toast")).toContainText(
    "Basic graphics are active",
  );
  await page.locator("#end-turn").click();
  await expect(page.locator("#round")).toContainText("02");
});
