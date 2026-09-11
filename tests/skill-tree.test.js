import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  command,
  validateSave,
  combatPreview,
  unitStats,
  targets,
  tradeCities,
  tileIncome,
  income,
  renownGoal,
  aiTurn,
  reachable,
  neighbors,
  passable,
  plannedTradeRoads,
} from "../src/game.js";
import {
  TECHS,
  prerequisites,
  researchCost,
  nextBuilding,
  developmentReason,
} from "../src/progression.js";
import { climateAt } from "../src/climate.js";
import { PLAYABLE_FACTIONS } from "../src/factions.js";
const allCommon = () => Object.keys(TECHS).filter((k) => !TECHS[k].faction);
const act = (s, a) => {
  const r = command(s, a);
  assert.equal(r.error, null, JSON.stringify(a));
  assert.ok(validateSave(r.state));
  return r.state;
};

test("all skill prerequisites form a DAG and both Caravans parents are enforced", () => {
  function visit(key, path = new Set()) {
    assert.ok(!path.has(key));
    const next = new Set([...path, key]);
    for (const p of prerequisites(key)) {
      assert.ok(TECHS[p]);
      visit(p, next);
    }
  }
  for (const key of Object.keys(TECHS)) visit(key);
  const s = createGame();
  s.players[0].stars = 500;
  s.players[0].tech = ["agriculture", "barter"];
  assert.match(
    command(s, { type: "research", tech: "caravans" }).error,
    /Logistics/,
  );
  assert.equal(s.players[0].stars, 500);
  s.players[0].tech.push("caravans");
  assert.equal(validateSave(s), false);
});

test("longbow range is stationary, marksmanship is distance-gated, and previews match commands", () => {
  const s = createGame(),
    [u, v] = s.units;
  s.players[0].tech = ["archery", "marksmanship", "longbows"];
  u.type = "archer";
  u.tile = 60;
  v.tile = 63;
  v.type = "guardian";
  v.hp = 12;
  s.explored[0] = s.tiles.map((t) => t.id);
  assert.equal(unitStats(s, u).range, 3);
  assert.ok(targets(s, u).includes(v));
  const hit = combatPreview(s, u, v);
  assert.equal(hit.damage, 5);
  const r = act(s, { type: "attack", unit: u.id, target: v.id });
  assert.equal(r.units[1].hp, 12 - hit.damage);
  assert.equal(r.units[0].moved, true);
  u.moved = true;
  assert.equal(unitStats(s, u).range, 2);
  assert.equal(targets(s, u).length, 0);
  u.moved = false;
  v.tile = 61;
  assert.equal(combatPreview(s, u, v).damage, 4);
});

test("melee damage and defensive branch do not protect against ranged attacks", () => {
  const s = createGame(),
    [u, v] = s.units;
  u.type = "guardian";
  u.hp = 12;
  v.type = "guardian";
  v.hp = 12;
  const before = unitStats(s, u).attack;
  s.players[0].tech = allCommon();
  assert.equal(unitStats(s, u).attack, before + 1);
  const plain = combatPreview(s, u, v).damage;
  s.players[1].tech = ["archery", "training", "dueling", "shielddrill"];
  assert.equal(combatPreview(s, u, v).damage, plain - 1);
  u.type = "archer";
  u.hp = 8;
  const ranged = combatPreview(s, u, v).damage;
  s.players[1].tech = [];
  assert.equal(combatPreview(s, u, v).damage, ranged);
});

test("Marines removes shoreline penalties in both attack directions", () => {
  const s = createGame(417, 17, ["water", "water"]);
  const [u, v] = s.units;
  u.tile = 0;
  v.tile = 18; // water corner and adjacent diagonal land: distance 2
  u.type = v.type = "archer";
  u.hp = v.hp = 8;
  s.tiles[v.tile].terrain = "grass";
  for (const [a, b] of [
    [u, v],
    [v, u],
  ]) {
    const before = combatPreview(s, a, b);
    assert.equal(before.shorePenalty, 1);
    s.players[a.owner].tech.push("marines");
    assert.equal(combatPreview(s, a, b).damage, before.damage + 1);
    assert.equal(combatPreview(s, a, b).shorePenalty, 0);
    s.players[a.owner].tech.pop();
  }
});

test("climates are symmetric and old maps and capital approaches remain temperate", () => {
  for (const size of [11, 17])
    for (let seed = 0; seed < 30; seed++) {
      const s = createGame(seed, size, ["ice", "desert"], { climates: true });
      const climates = new Set();
      for (const t of s.tiles) {
        const c = climateAt(s, t);
        climates.add(c);
        assert.equal(c, climateAt(s, s.tiles[s.tiles.length - 1 - t.id]));
      }
      assert.ok(climates.has("desert"));
      assert.ok(climates.has("ice"));
      for (const cap of s.tiles.filter(
        (t) => t.city?.capital !== null && t.city,
      ))
        for (const t of s.tiles.filter(
          (t) => Math.abs(t.x - cap.x) + Math.abs(t.z - cap.z) <= 2,
        ))
          assert.equal(climateAt(s, t), "temperate");
      assert.ok(validateSave(s));
    }
  assert.ok(
    createGame().tiles.every((t) => climateAt(createGame(), t) === "temperate"),
  );
  assert.equal(validateSave({ ...createGame(), climates: "yes" }), false);
});

test("climate farming gates, replacement yields, native discounts and captured production", () => {
  for (const [climate, key, basic, advanced] of [
    ["desert", "desert", "oasis", "oasis2"],
    ["ice", "ice", "icefarm", "greenhouse"],
  ]) {
    let s = createGame(417, 17, [key, "ember"], { climates: true });
    const t = s.tiles.find((t) => climateAt(s, t) === climate);
    t.owner = 0;
    s.players[0].stars = 500;
    s.players[0].tech.push("agriculture");
    assert.ok(developmentReason(s, t, "improve", basic));
    assert.ok(developmentReason(s, t, "improve", "farm"));
    const tech = climate === "ice" ? "icefarming" : "desertfarming";
    assert.equal(researchCost(s, tech), 6);
    assert.equal(researchCost(s, tech, 1), 8);
    s = act(s, { type: "research", tech });
    s = act(s, { type: "improve", tile: t.id, kind: basic });
    assert.equal(tileIncome(s, s.tiles[t.id]), 1);
    assert.equal(nextBuilding(s, s.tiles[t.id]), advanced);
    s = act(s, {
      type: "research",
      tech: climate === "ice" ? "greenhouses" : "oasisengineering",
    });
    s = act(s, { type: "improve", tile: t.id, kind: advanced });
    assert.equal(tileIncome(s, s.tiles[t.id]), 2);
    assert.ok(
      command(s, { type: "improve", tile: t.id, kind: advanced }).error,
    );
    s.tiles[t.id].owner = 1;
    assert.equal(tileIncome(s, s.tiles[t.id]), 2);
    assert.ok(validateSave(s));
  }
});

test("road trade pays once per connected city and enemy units or occupation block the route", () => {
  const s = createGame();
  s.players[0].tech = allCommon();
  const a = s.tiles[79],
    b = s.tiles[57],
    road = s.tiles[68]; // (2,7) -> (2,6) -> (2,5)
  b.owner = 0;
  road.owner = 0;
  road.road = true;
  assert.deepEqual(
    [...tradeCities(s, 0)].sort((a, b) => a - b),
    [57, 79],
  );
  const linked = income(s, 0);
  s.units[1].tile = road.id;
  assert.equal(tradeCities(s, 0).size, 0);
  assert.equal(income(s, 0), linked - 4);
  s.units[1].tile = 30;
  b.occupation = { owner: 1, unit: 2 };
  assert.equal(tradeCities(s, 0).size, 0);
  b.occupation = null;
  road.road = false;
  assert.equal(tradeCities(s, 0).size, 0);
  assert.deepEqual(plannedTradeRoads(s, 0), [road.id]);
  assert.equal(tileIncome(s, a), 3);
});

test("ordinary armies learn water access and faster navigation without native traits", () => {
  let s = createGame();
  const water = s.tiles.find(
    (t) => t.terrain === "water" && neighbors(s, t).some(passable),
  );
  s.units[0].tile = neighbors(s, water).find(passable).id;
  s.explored[0] = s.tiles.map((t) => t.id);
  s.players[0].stars = 100;
  assert.equal(reachable(s, s.units[0]).includes(water.id), false);
  s = act(s, { type: "research", tech: "trails" });
  s = act(s, { type: "research", tech: "sailing" });
  assert.ok(reachable(s, s.units[0]).includes(water.id));
  s = act(s, { type: "move", unit: s.units[0].id, tile: water.id });
  assert.ok(validateSave(s));
});

test("new-game escorts and 24-renown pacing preserve legacy 12-renown saves", () => {
  const s = createGame(417, 17, ["ice", "ember"], {
    climates: true,
    balancedStart: true,
  });
  assert.equal(s.units.length, 4);
  assert.equal(new Set(s.units.map((u) => u.tile)).size, 4);
  assert.ok(validateSave(s));
  assert.equal(renownGoal(s), 24);
  assert.equal(renownGoal(createGame()), 12);
  delete s.renownTarget;
  assert.equal(renownGoal(s), 12);
});

test("new climate/skill rules complete every matchup and keep saves valid", () => {
  for (const size of [11, 17])
    for (const a of PLAYABLE_FACTIONS)
      for (const b of PLAYABLE_FACTIONS) {
        let s = createGame(417, size, [a, b], {
            climates: true,
            balancedStart: true,
          }),
          turns = 0;
        while (s.winner === null && turns++ < 90) {
          s = aiTurn(s, s.active);
          assert.ok(validateSave(s), `${a}/${b}, ${size}, ${turns}`);
        }
        assert.notEqual(s.winner, null);
      }
});
