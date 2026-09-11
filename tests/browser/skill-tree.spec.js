import { test, expect } from "@playwright/test";
import { createGame } from "../../src/game.js";
import { TECHS } from "../../src/progression.js";
import { climateAt } from "../../src/climate.js";

test("skill map shows branch links, two-parent gates and native climate costs on mobile", async ({
  page,
}) => {
  const s = createGame(417, 17, ["ice", "desert"], {
    climates: true,
    balancedStart: true,
  });
  s.players[0].stars = 100;
  await page.addInitScript(
    (s) => localStorage.setItem("crown-canopy-v1", JSON.stringify(s)),
    s,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("#renown")).toHaveText("0 / 24");
  await page.locator("#research").click();
  await expect(page.locator("[data-tech]")).toHaveCount(24);
  await expect(page.locator("#skill-caravans .skill-parents a")).toHaveCount(2);
  await expect(page.locator('[data-tech="icefarming"]')).toBeDisabled();
  await page.locator('[data-tech="agriculture"]').click();
  await expect(page.locator('[data-tech="icefarming"]')).toHaveText("✦ 6");
  await page.locator('[data-tech="icefarming"]').click();
  await expect(page.locator('[data-tech="greenhouses"]')).toBeEnabled();
  await page.locator("#skill-greenhouses").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/skill-map-mobile.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("climate farms can be built, upgraded and rendered with the Blender pack", async ({
  page,
}) => {
  const s = createGame(417, 17, ["desert", "ice"], {
    climates: true,
    balancedStart: true,
  });
  s.players[0].tech = Object.keys(TECHS).filter((k) => !TECHS[k].faction);
  s.players[0].stars = 200;
  s.explored[0] = s.tiles.map((t) => t.id);
  const desert = s.tiles.find((t) => climateAt(s, t) === "desert"),
    ice = s.tiles.find((t) => climateAt(s, t) === "ice");
  desert.owner = ice.owner = 0;
  await page.addInitScript(
    (s) => localStorage.setItem("crown-canopy-v1", JSON.stringify(s)),
    s,
  );
  await page.goto("/");
  await page.locator("#tile-picker").selectOption(String(desert.id));
  await page.getByRole("button", { name: /Build Oasis I / }).click();
  await page.getByRole("button", { name: /Build Oasis II / }).click();
  await page.locator("#tile-picker").selectOption(String(ice.id));
  await page.getByRole("button", { name: /Build Ice Farm I/ }).click();
  await page.getByRole("button", { name: /Build Heated Greenhouse/ }).click();
  const result = await page.evaluate(() => window.__game.getState());
  expect(result.tiles[desert.id].building).toBe("oasis2");
  expect(result.tiles[ice.id].building).toBe("greenhouse");
  expect(result.players[0].stars).toBe(178);
  await expect(page.locator("canvas")).toHaveAttribute("data-art", "ready");
  await page.screenshot({ path: "test-results/climate-farms.png" });
});
