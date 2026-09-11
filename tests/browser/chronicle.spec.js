import { test, expect } from "@playwright/test";
import { createGame, command, validateSave } from "../../src/game.js";
import { readFile } from "node:fs/promises";
function expedition() {
  const s = createGame(417, 17, ["canopy", "ember"], {
    chronicle: true,
    climates: true,
    balancedStart: true,
  });
  const u = s.units[0];
  u.tile = s.chronicle.sites[0].tile;
  s.explored[0] = [...new Set([...s.explored[0], u.tile])];
  expect(validateSave(s)).toBe(true);
  return s;
}
async function load(page, s) {
  await page.addInitScript((s) => {
    if (!localStorage.getItem("crown-canopy-v1"))
      localStorage.setItem("crown-canopy-v1", JSON.stringify(s));
  }, s);
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
}
test("recover an archive, spend insight, resolve a council branch and preserve it on reload", async ({
  page,
}) => {
  test.setTimeout(60000);
  const s = expedition(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await load(page, s);
  await page.waitForFunction(
    () => window.__game.artDiagnostics().art === "ready",
  );
  await page.getByRole("button", { name: /Preserve the records/ }).click();
  await expect(page.locator("#story-resources")).toContainText("1 fragment");
  await expect(page.locator("#story-resources")).toContainText("4 insight");
  await expect(
    page.getByRole("button", { name: /Preserve the records/ }),
  ).toHaveCount(0);
  await page.locator("#council").click();
  await expect(page.locator("[data-council]")).toHaveCount(6);
  await page.locator('[data-council="memory"]').click();
  await expect(page.locator('[data-council="memory"]')).toHaveText("Chosen");
  await expect(page.locator('[data-council="bread"]')).toBeDisabled();
  await expect(page.locator(".story-ledger")).toContainText(
    "6 research insight",
  );
  await page.screenshot({ path: "test-results/council-desktop.png" });
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.locator("#research").click();
  await expect(page.locator('[data-tech="masonry"]')).toHaveText("✦ 2");
  await page.locator('[data-tech="masonry"]').click();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(page.locator("#story-resources")).toContainText("2 insight");
  await page.reload();
  await expect(page.locator("#story-resources")).toContainText("1/3 chapters");
  await page.locator("#council").click();
  await expect(page.locator('[data-council="memory"]')).toHaveText("Chosen");
  expect(errors).toEqual([]);
});
test("restoration changes the actual beacon model, Guard renders, hidden discovery geometry stays private", async ({
  page,
}) => {
  test.setTimeout(60000);
  let s = expedition();
  s = command(s, { type: "investigate", unit: 1, choice: "supplies" }).state;
  const beacon = s.tiles.find((t) => t.beacon);
  beacon.owner = 0;
  s.units[0].tile = beacon.id;
  s.units[0].moved = s.units[0].attacked = false;
  s.players[0].tech.push("masonry");
  s.explored[0] = [...new Set([...s.explored[0], beacon.id])];
  expect(validateSave(s)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await load(page, s);
  await page.waitForFunction(
    () => window.__game.artDiagnostics().art === "ready",
  );
  await page.locator("#focus-camera").click();
  await page.screenshot({ path: "test-results/beacon-dormant.png" });
  await page.getByRole("button", { name: /Restore beacon/ }).click();
  await expect(page.locator("#story-resources")).toContainText("0 fragments");
  await expect(page.locator("#inspector")).toContainText(
    "Restored · the current owner",
  );
  await page.screenshot({ path: "test-results/beacon-restored.png" });
  const pending = page.waitForEvent("download");
  await page.locator("#export").click();
  const download = await pending;
  await download.saveAs("test-results/story-board.glb");
  const file = await readFile("test-results/story-board.glb");
  const doc = JSON.parse(file.toString("utf8", 20, 20 + file.readUInt32LE(12)));
  const tile = doc.nodes.find(
    (n) => n.name === `Tile_${beacon.x}_${beacon.z}_grass`,
  );
  const children = tile.children.map((i) => doc.nodes[i].name);
  expect(children).toContain("beacon");
  expect(children).not.toContain("meridian_dormant");
  for (const site of s.chronicle.sites.filter(
    (v) => !s.explored[0].includes(v.tile),
  ))
    expect(
      doc.nodes.some((n) => n.name?.startsWith(`Discovery_${site.tile}_`)),
    ).toBe(false);
  await page.locator("#end-turn").click();
  await expect(page.locator("#round")).toContainText("02");
  await page.getByRole("button", { name: /Guard ·/ }).click();
  await expect(page.locator("#inspector")).toContainText(
    "Guarding · +1 protection",
  );
  await page.screenshot({ path: "test-results/guarded-beacon.png" });
});
test("mobile council stays navigable, reveals no hidden site coordinates, and story mode can be disabled", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const s = expedition();
  await load(page, s);
  await page.locator("#council").click();
  const known = s.chronicle.sites.filter((v) => s.explored[0].includes(v.tile));
  await expect(page.locator("[data-site]")).toHaveCount(known.length);
  await page.locator('[data-council="sea"]').scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/council-mobile.png" });
  await page.locator("[data-site]").first().click();
  await expect(page.locator("dialog")).not.toBeVisible();
  await page.locator("#new-game").click();
  await page.locator("#story-mode").uncheck();
  await page.locator("#start-new").click();
  expect(
    await page.evaluate(() => window.__game.getState().chronicle),
  ).toBeUndefined();
  await page.locator("#council").click();
  await expect(page.locator("dialog")).toContainText(
    "This save uses skirmish rules",
  );
});
test("missing story asset download retains legal investigation in fallback mode", async ({
  page,
}) => {
  await page.route("**/models/chronicle.glb", (r) => r.abort());
  await load(page, expedition());
  await page.waitForFunction(
    () => window.__game.artDiagnostics().art === "fallback",
  );
  await page.getByRole("button", { name: /Rescue the supplies/ }).click();
  await expect(page.locator("#stars")).toHaveText("18");
  await expect(page.locator("#story-resources")).toContainText("1 fragment");
});
test("the full story island keeps its draw budget and supports landmark close-ups", async ({
  page,
}) => {
  test.setTimeout(60000);
  const s = expedition();
  s.explored[0] = s.tiles.map((t) => t.id);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await load(page, s);
  await page.waitForFunction(
    () => window.__game.artDiagnostics().art === "ready",
  );
  const diagnostics = await page.evaluate(() => window.__game.artDiagnostics());
  expect(diagnostics.batches).toBeLessThan(180);
  expect(diagnostics.triangles).toBeLessThan(2500000);
  await page.screenshot({ path: "test-results/story-island.png" });
  await page.locator("#focus-camera").click();
  await page.screenshot({ path: "test-results/story-archive-closeup.png" });
  console.log("STORY_RENDER", JSON.stringify(diagnostics));
});
