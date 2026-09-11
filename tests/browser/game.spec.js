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

test("progression UI: prerequisites, farms, barracks, veteran training and workshop", async ({
  page,
}) => {
  const s = createGame();
  s.players[0].stars = 500;
  s.units[0].tile = idAt(2, 7);
  s.units[0].xp = 6;
  await page.addInitScript((save) => {
    if (!localStorage.getItem("crown-canopy-v1"))
      localStorage.setItem("crown-canopy-v1", JSON.stringify(save));
  }, s);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.locator("#research").click();
  await expect(page.locator('[data-tech="irrigation"]')).toBeDisabled();
  await expect(page.locator("dialog")).toContainText("Requires Agriculture");
  for (const key of [
    "agriculture",
    "archery",
    "training",
    "masonry",
    "engineering",
    "irrigation",
    "commerce",
    "tactics",
    "logistics",
  ])
    await page.locator(`[data-tech="${key}"]`).click();
  await page.screenshot({ path: "test-results/research-tree.png" });
  await page.getByRole("button", { name: "Close dialog" }).click();
  for (const tile of s.tiles
    .filter((t) => t.territory === idAt(2, 7) && t.owner === 0)
    .slice(0, 2)) {
    await page.locator("#tile-picker").selectOption(String(tile.id));
    await page.getByRole("button", { name: /Build Farm I / }).click();
  }
  await page.locator("#tile-picker").selectOption(String(idAt(2, 7)));
  await page.getByRole("button", { name: /Grow city · Barracks/ }).click();
  await page.getByRole("button", { name: /Train resilience/ }).click();
  await expect(page.locator(".health")).toHaveText("10/10 HP");
  await page.getByRole("button", { name: /Grow city · Workshop/ }).click();
  await page.getByRole("button", { name: /Build road/ }).click();
  await page.locator("#end-turn").click();
  await expect(page.locator("#turn-label")).toHaveText("Your turn");
  await page.getByRole("button", { name: /Train resilience/ }).click();
  await expect(page.locator(".health")).toHaveText("12/12 HP");
  await page.screenshot({
    path: "test-results/progression-city.png",
    fullPage: true,
  });
  await page.reload();
  await expect(page.locator(".health")).toHaveText("12/12 HP");
  expect(
    await page.evaluate(
      () => window.__game.getState().tiles[79].city.fortification,
    ),
  ).toBe("workshop");
});

test("enemy capital shows occupation before surviving the defender's turn", async ({
  page,
}) => {
  const s = createGame();
  s.units[0].tile = idAt(7, 3);
  s.units[0].type = "guardian";
  s.units[0].hp = 12;
  s.units[1].tile = idAt(3, 3);
  s.explored[0] = s.tiles.map((t) => t.id);
  await page.addInitScript(
    (save) => localStorage.setItem("crown-canopy-v1", JSON.stringify(save)),
    s,
  );
  await page.goto("/");
  await page.locator("#tile-picker").selectOption(String(idAt(8, 3)));
  await page.getByRole("button", { name: /Move to/ }).click();
  await expect(page.locator("#inspector")).toContainText(
    "is occupying this city",
  );
  await expect(page.locator("dialog")).not.toBeVisible();
  await page.locator("#end-turn").click();
  await expect(page.locator("dialog")).toContainText(
    "captured the rival capital after surviving",
  );
});

test("legacy cities migrate and mobile research remains scrollable", async ({
  page,
}) => {
  const s = createGame();
  s.version = 1;
  s.tiles[79].city.level = 2;
  s.players[0].stars = 99;
  for (const t of s.tiles) {
    delete t.building;
    delete t.territory;
    delete t.road;
    delete t.occupation;
    if (t.city) {
      delete t.city.specialization;
      delete t.city.fortification;
    }
  }
  for (const u of s.units) {
    delete u.rank;
    delete u.xp;
    delete u.promotion;
  }
  await page.addInitScript(
    (save) => localStorage.setItem("crown-canopy-v1", JSON.stringify(save)),
    s,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator("#tile-picker").selectOption("79");
  await expect(page.locator("#inspector")).toContainText("Add Market");
  await page.locator("#research").click();
  await page.locator('[data-tech="trails"]').click();
  await expect(page.locator('[data-tech="trails"]')).toHaveText("Learned");
  await page.screenshot({ path: "test-results/mobile-research.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
