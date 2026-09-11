import { test, expect } from "@playwright/test";
import {
  createGame,
  TECHS,
  UNITS,
  idAt,
  validateSave,
} from "../../src/game.js";
import { UNIT_ROLES, NAVAL_ROLES } from "../../src/appearance.js";
import { readFile } from "node:fs/promises";
const allTech = Object.keys(TECHS).filter((k) => !TECHS[k].faction);
function gallery() {
  const s = createGame(417, 17, ["desert", "ice"], { climates: true });
  s.players.forEach((p) => {
    p.tech = [...allTech];
    p.stars = 200;
  });
  s.explored = [s.tiles.map((t) => t.id), s.tiles.map((t) => t.id)];
  s.units = [];
  const land = s.tiles.filter(
    (t) =>
      t.terrain === "grass" &&
      !t.city &&
      !t.beacon &&
      t.z >= 10 &&
      t.x >= 2 &&
      t.x <= 9,
  );
  UNIT_ROLES.forEach((type, i) => {
    const tile = NAVAL_ROLES.includes(type)
      ? idAt(0, 7 + (i - 7) * 2, 17)
      : land.shift().id;
    s.units.push({
      id: s.nextId++,
      type,
      owner: i < 9 ? 0 : 1,
      tile,
      hp: UNITS[type].hp,
      moved: false,
      attacked: false,
      xp: 0,
      rank: 0,
      promotion: null,
    });
  });
  expect(validateSave(s)).toBe(true);
  return s;
}
test("all eleven Blender roles render, livery persists without stat changes, and exports include tribal modules", async ({
  page,
}) => {
  test.setTimeout(60000);
  const s = gallery(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript((s) => {
    if (!localStorage.getItem("crown-canopy-v1"))
      localStorage.setItem("crown-canopy-v1", JSON.stringify(s));
  }, s);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.waitForFunction(
    () => window.__game?.artDiagnostics().art === "ready",
  );
  const before = await page.evaluate(() => window.__game.getState());
  await page.locator("#armory").click();
  await expect(page.locator(".armory-unit")).toHaveCount(11);
  await page.locator("#livery").selectOption("ceremonial");
  const after = await page.evaluate(() => window.__game.getState());
  expect(after.units).toEqual(before.units);
  expect(after.players[0].stars).toBe(before.players[0].stars);
  expect(after.players[0].livery).toBe("ceremonial");
  await page.screenshot({ path: "test-results/army-guide.png" });
  await page.getByRole("button", { name: "Close dialog" }).click();
  const camel = s.units.find((u) => u.type === "camel");
  await page.locator("#tile-picker").selectOption(String(camel.tile));
  await page.locator("#focus-camera").click();
  await page.screenshot({ path: "test-results/camel-closeup.png" });
  const diagnostic = await page.evaluate(() => window.__game.artDiagnostics());
  expect(diagnostic.batches).toBeLessThan(500);
  expect(diagnostic.triangles).toBeLessThan(2500000);
  console.log("ARMY_RENDER", JSON.stringify(diagnostic));
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#export").click();
  const download = await downloadPromise;
  await download.saveAs("test-results/army-board.glb");
  const file = await readFile("test-results/army-board.glb");
  const doc = JSON.parse(file.toString("utf8", 20, 20 + file.readUInt32LE(12)));
  for (const u of s.units)
    expect(doc.nodes.some((n) => n.name === `Unit_${u.id}_${u.type}`)).toBe(
      true,
    );
  expect(
    doc.nodes.some((n) => n.name?.includes("outfit_desert_ceremonial")),
  ).toBe(true);
  expect(doc.nodes.some((n) => n.name?.includes("prow_ice_field"))).toBe(true);
  await page.reload();
  await page.locator("#armory").click();
  await expect(page.locator("#livery")).toHaveValue("ceremonial");
  expect(errors).toEqual([]);
});
test("coastal recruitment launches a naval unit and mobile army styles stay usable", async ({
  page,
}) => {
  const s = createGame(417, 17, ["water", "desert"]);
  s.players[0].stars = 100;
  s.players[0].tech = allTech;
  const cap = s.tiles.find((t) => t.city?.capital === 0);
  s.units[0].tile = cap.id;
  await page.addInitScript(
    (s) => localStorage.setItem("crown-canopy-v1", JSON.stringify(s)),
    s,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator("#tile-picker").selectOption(String(cap.id));
  await page.getByRole("button", { name: /Launch Boat/ }).click();
  const after = await page.evaluate(() => window.__game.getState());
  expect(after.units.at(-1).type).toBe("boat");
  expect(after.tiles[after.units.at(-1).tile].terrain).toBe("water");
  expect(after.units[0].tile).toBe(cap.id);
  expect(after.players[0].stars).toBe(94);
  await page.locator("#armory").click();
  await page.locator("#livery").selectOption("veteran");
  await page.locator(".tribe-review summary").click();
  await page.locator(".tribe-review img").scrollIntoViewIfNeeded();
  await expect(page.locator(".tribe-review img")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/tribal-armory-mobile.png" });
});
test("missing army pack falls back safely even with naval units", async ({
  page,
}) => {
  const s = gallery();
  await page.route("**/models/armies.glb", (route) => route.abort());
  await page.addInitScript(
    (s) => localStorage.setItem("crown-canopy-v1", JSON.stringify(s)),
    s,
  );
  await page.goto("/");
  await page.waitForFunction(
    () => window.__game?.artDiagnostics().art === "fallback",
  );
  await expect(page.locator("canvas")).toBeVisible();
  await page.locator("#end-turn").click();
  await expect(page.locator("#round")).toContainText("02");
});
