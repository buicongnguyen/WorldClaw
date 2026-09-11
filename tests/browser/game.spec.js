import { test, expect } from "@playwright/test";
import { createGame, idAt } from "../../src/game.js";
import { readFile } from "node:fs/promises";
test("desktop: real WebGL, movement, recruitment, research, save, AI and export", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForFunction(() => !!window.__game);
  const initial = await page.evaluate(() => window.__game.getState());
  expect(initial.size).toBe(17);
  const capital = initial.tiles.find((t) => t.city?.capital === 0).id;
  const scout = initial.units[0].tile;
  await page.screenshot({ path: "test-results/desktop-initial.png" });
  await page.locator("#tile-picker").selectOption(String(capital));
  await page.getByRole("button", { name: "Guardian" }).click();
  await expect(page.locator("#stars")).toHaveText("7");
  await page.locator("#research").click();
  await page.locator('[data-tech="archery"]').click();
  await expect(page.locator('[data-tech="archery"]')).toHaveText("Learned");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.locator("#tile-picker").selectOption(String(scout));
  await page.locator("#tile-picker").selectOption(String(scout + 1));
  await page.getByRole("button", { name: /Move to/ }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__game.getState().units.find((u) => u.id === 1).tile,
      ),
    )
    .toBe(scout + 1);
  await page.locator("#end-turn").click();
  await expect(page.locator("#round")).toContainText("02");
  await expect(page.locator("#turn-label")).toHaveText("Your turn");
  await page.reload();
  await expect(page.locator("#round")).toContainText("02");
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#export").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.glb$/);
  await download.saveAs("test-results/board.glb");
  const glb = await readFile("test-results/board.glb");
  expect(glb.toString("utf8", 0, 4)).toBe("glTF");
  expect(glb.readUInt32LE(4)).toBe(2);
  expect(glb.readUInt32LE(8)).toBe(glb.length);
  const document = JSON.parse(
    glb.toString("utf8", 20, 20 + glb.readUInt32LE(12)),
  );
  expect(document.meshes.length).toBeGreaterThan(0);
  expect(document.nodes.some((n) => n.name?.includes("Unit_2_"))).toBe(false);
  await page.screenshot({ path: "test-results/desktop-played.png" });
  expect(errors).toEqual([]);
});
test("mobile: layout, help and restart", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  await page.locator("#help").click();
  await expect(page.locator("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.locator("#new-game").click();
  await page.locator("#seed").fill("123");
  await page.locator("#start-new").click();
  await expect(page.locator("#explored")).toContainText("123");
  await expect(page.locator("#round")).toContainText("01");
  await expect(page.locator("#round")).toContainText("40");
  await page.locator("#new-game").click();
  await page.locator("#map-size").selectOption("11");
  await page.locator("#start-new").click();
  await expect(page.locator("#explored")).toContainText("11×11");
  await expect(page.locator("#round")).toContainText("30");
});
test("corrupt autosave recovers without crashing", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("crown-canopy-v1", '{"version":1}'),
  );
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator("#stars")).toHaveText("12");
});
test("combat preview and real canvas picking", async ({ page }) => {
  const s = createGame();
  s.units[1].tile = idAt(4, 7);
  s.units[1].hp = 1;
  await page.addInitScript(
    (save) => localStorage.setItem("crown-canopy-v1", JSON.stringify(save)),
    s,
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  const point = await page.evaluate(() => window.__game.tileScreen(81));
  const box = await page.locator("canvas").boundingBox();
  await page.mouse.click(box.x + point.x, box.y + point.y);
  await expect(page.locator(".combat-preview")).toContainText("defeats enemy");
  await page.getByRole("button", { name: "Attack enemy" }).click();
  await expect
    .poll(() => page.evaluate(() => window.__game.getState().units.length))
    .toBe(1);
});
test("beacon victory resolves on resumed AI turn and disables gameplay", async ({
  page,
}) => {
  const s = createGame();
  s.active = 1;
  s.players[0].renown = 11;
  s.tiles[idAt(5, 8)].owner = 0;
  await page.addInitScript(
    (save) => localStorage.setItem("crown-canopy-v1", JSON.stringify(save)),
    s,
  );
  await page.goto("/");
  await expect(page.locator("dialog")).toBeVisible();
  await expect(page.locator("dialog")).toContainText("The canopy endures.");
  await expect(page.locator("#end-turn")).toBeDisabled();
});
