import { test, expect } from "@playwright/test";
import { createGame, reachable, idAt } from "../../src/game.js";

async function load(page, state = createGame()) {
  await page.addInitScript((s) => {
    if (!localStorage.getItem("crown-canopy-v1"))
      localStorage.setItem("crown-canopy-v1", JSON.stringify(s));
  }, state);
  await page.goto("/");
  await page.waitForFunction(
    () => window.__game?.artDiagnostics().art === "ready",
  );
}
async function point(page, tile) {
  const p = await page.evaluate((id) => window.__game.tileScreen(id), tile);
  const box = await page.locator("canvas").boundingBox();
  return { x: box.x + p.x, y: box.y + p.y };
}
async function unit(page) {
  return page.evaluate(() =>
    window.__game.getState().units.find((u) => u.id === 1),
  );
}
test("a single map click previews; double click moves exactly once and autosaves", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const s = createGame();
  await load(page, s);
  const destination = reachable(s, s.units[0]).find(
    (id) => id === s.units[0].tile + 1,
  );
  const p = await point(page, destination);
  await page.mouse.click(p.x, p.y);
  expect((await unit(page)).tile).toBe(s.units[0].tile);
  await expect(page.locator("#map-action")).toBeVisible();
  await expect(page.locator("#map-action")).toContainText("Move here");
  await page.screenshot({ path: "test-results/clear-desktop-orders.png" });
  await page.mouse.dblclick(p.x, p.y, { delay: 90 });
  await expect.poll(async () => (await unit(page)).tile).toBe(destination);
  expect((await unit(page)).moved).toBe(true);
  await expect(page.locator("#toast")).toContainText("Moved to");
  await expect(page.locator("#map-action")).toBeHidden();
  await page.reload();
  expect((await unit(page)).tile).toBe(destination);
  const blocked = await point(page, destination + 1);
  await page.mouse.dblclick(blocked.x, blocked.y);
  expect((await unit(page)).tile).toBe(destination);
});

test("enemy double click only previews and a camera drag never moves an army", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const s = createGame();
  s.units[1].tile = idAt(4, 7);
  await load(page, s);
  const p = await point(page, s.units[1].tile);
  await page.mouse.dblclick(p.x, p.y, { delay: 90 });
  await expect(page.locator("#map-action")).toHaveText("Confirm attack");
  expect(await page.evaluate(() => window.__game.getState().units)).toEqual(
    s.units,
  );
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 55, p.y + 25, { steps: 5 });
  await page.mouse.move(p.x, p.y, { steps: 5 });
  await page.mouse.up();
  expect(await page.evaluate(() => window.__game.getState().units)).toEqual(
    s.units,
  );
  await page.locator("#map-action").click();
  expect((await unit(page)).attacked).toBe(true);
});

test("commands stay above details; realm switch and keyboard disclosures are accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await load(page);
  await expect(page.locator("#inspector")).toBeVisible();
  await expect(page.locator("#realm-overview")).toBeHidden();
  await expect(page.getByRole("button", { name: /Guard ·/ })).toBeInViewport();
  const equipment = page.locator('[data-fold="equipment"]');
  await expect(equipment).not.toHaveAttribute("open");
  await equipment.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(equipment).toHaveAttribute("open", "");
  await page.locator("#panel-realm").click();
  await expect(page.locator("#realm-overview")).toBeVisible();
  await expect(page.locator("#inspector")).toBeHidden();
  await expect(page.locator("#panel-realm")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#next-unit").click();
  await expect(page.locator("#inspector")).toBeVisible();
  await expect(page.locator("#panel-command")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#tile-picker").selectOption("79");
  await expect(page.getByRole("button", { name: "Guardian" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Guardian" })).toBeInViewport();
  await expect(page.locator('[data-fold="recruit"]')).not.toHaveAttribute(
    "open",
  );
  await page.screenshot({ path: "test-results/clear-city-menu.png" });
});

test("phone controls have text labels, usable targets and no overflowing menu", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const s = createGame();
  await load(page, s);
  for (const selector of [
    "#help",
    "#new-game",
    "#next-unit",
    "#research",
    "#export",
    "#end-turn",
    "#zoom-in",
  ]) {
    const box = await page.locator(selector).boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
  }
  await expect(page.locator("#research span")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/clear-mobile.png",
    fullPage: true,
  });
  // Single-tap alternative remains explicit, without requiring a double-tap.
  await page.locator("#tile-picker").selectOption(String(s.units[0].tile + 1));
  await page.locator("#map-action").click();
  expect((await unit(page)).tile).toBe(s.units[0].tile + 1);
  await page.locator("#council").click();
  await expect(page.getByRole("dialog")).toHaveAccessibleName(
    "The Broken Meridian",
  );
  await page.screenshot({ path: "test-results/clear-council-mobile.png" });
  expect(
    await page
      .locator("dialog")
      .evaluate((d) => d.scrollWidth <= d.clientWidth),
  ).toBe(true);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test.describe("touch map controls", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test("double tap moves while an uncharted destination remains private", async ({
    page,
  }) => {
    const s = createGame();
    await load(page, s);
    const f = await point(page, 38);
    expect(s.explored[0]).not.toContain(38);
    await page.touchscreen.tap(f.x, f.y);
    await page.touchscreen.tap(f.x, f.y);
    expect((await unit(page)).tile).toBe(s.units[0].tile);
    await expect(page.locator("#toast")).toContainText("Uncharted territory");
    const destination = s.units[0].tile + 1;
    const p = await point(page, destination);
    await page.touchscreen.tap(p.x, p.y);
    expect((await unit(page)).tile).toBe(s.units[0].tile);
    await page.touchscreen.tap(p.x, p.y);
    await expect.poll(async () => (await unit(page)).tile).toBe(destination);
  });
});
