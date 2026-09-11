import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  command,
  reachable,
  canTraverse,
  neighbors,
  passable,
  validateSave,
  unitStats,
  combatPreview,
  healAmount,
  TECHS,
} from "../src/game.js";

function coast(key, terrain = "water") {
  const s = createGame(417, 17, [key, "ember"]);
  const target = s.tiles.find(
    (t) => t.terrain === terrain && neighbors(s, t).some(passable),
  );
  s.units[0].tile = neighbors(s, target).find(passable).id;
  s.explored[0] = s.tiles.map((t) => t.id);
  return { s, target, u: s.units[0] };
}
function learn(s, key) {
  s.players[0].tech = Object.keys(TECHS).filter((k) => !TECHS[k].faction);
  s.players[0].stars = 100;
  const r = command(s, { type: "research", tech: key });
  assert.equal(r.error, null);
  return r.state;
}

test("Water traverses water, Mountain traverses peaks; ordinary armies cannot follow", () => {
  for (const [key, terrain] of [
    ["water", "water"],
    ["mountain", "mountain"],
  ]) {
    const { s, target, u } = coast(key, terrain);
    assert.ok(reachable(s, u).includes(target.id));
    const moved = command(s, { type: "move", unit: u.id, tile: target.id });
    assert.equal(moved.error, null);
    assert.ok(validateSave(moved.state));
    assert.equal(canTraverse(s, target, 1), false);
    const wrong = structuredClone(moved.state);
    wrong.players[0].faction = "classic";
    assert.equal(validateSave(wrong), false);
    assert.ok(
      command(moved.state, { type: "improve", tile: target.id, kind: "farm" })
        .error,
    );
    assert.ok(command(moved.state, { type: "road", tile: target.id }).error);
  }
});

test("Ice traversal requires its mastery; Water movement respects cost and Oceanways", () => {
  let { s, target, u } = coast("ice");
  assert.equal(reachable(s, u).includes(target.id), false);
  s = learn(s, "frozenpaths");
  assert.ok(reachable(s, s.units[0]).includes(target.id));
  const moved = command(s, { type: "move", unit: u.id, tile: target.id });
  assert.equal(moved.error, null);
  assert.ok(validateSave(moved.state));
  assert.equal(canTraverse(moved.state, target, 1), false);
  ({ s, target, u } = coast("water"));
  u.type = "guardian";
  u.hp = 12;
  assert.equal(reachable(s, u).includes(target.id), false);
  s.players[0].tech.push("irrigation", "oceanways");
  assert.ok(reachable(s, u).includes(target.id));
});

test("Desert recovery and meadow scout attack stop outside their terrain", () => {
  let s = createGame(417, 17, ["desert", "ember"]),
    u = s.units[0];
  s.tiles[u.tile].terrain = "grass";
  assert.equal(healAmount(s, u), 6);
  s = learn(s, "dunewarfare");
  u = s.units[0];
  s.players[0].tech = s.players[0].tech.filter((k) => k !== "dunewarfare");
  const base = unitStats(s, u).attack;
  s.players[0].tech.push("dunewarfare");
  assert.equal(unitStats(s, u).attack, base + 1);
  s.tiles[u.tile].terrain = "forest";
  assert.equal(unitStats(s, u).attack, base);
  assert.equal(healAmount(s, u), 4);
});

test("Ice, Water and Mountain protection matches their stated terrain", () => {
  for (const [key, terrain, mastery, bonus] of [
    ["ice", "grass", null, 1],
    ["water", "water", "oceanways", 1],
    ["mountain", "mountain", "summitguard", 2],
  ]) {
    const s = createGame(417, 17, [key, "ember"]),
      [v, u] = s.units;
    v.type = "guardian";
    v.hp = 12;
    s.tiles[v.tile].terrain = terrain;
    const plain = structuredClone(s);
    plain.players[0].faction = "classic";
    if (mastery) s.players[0].tech.push(mastery);
    assert.equal(
      combatPreview(s, u, v).damage,
      combatPreview(plain, u, v).damage - bonus,
    );
  }
});

test("Fire loses full-health attack after damage, including retaliation, and Rekindle heals six", () => {
  let s = createGame(417, 17, ["fire", "ember"]);
  let [u, v] = s.units;
  assert.equal(unitStats(s, u).attack, 6);
  u.hp = 11;
  assert.equal(unitStats(s, u).attack, 5);
  u.hp = 12;
  v.tile = u.tile + 1;
  const preview = combatPreview(s, v, u);
  const remaining = u.hp - preview.damage;
  assert.equal(preview.retaliation, Math.ceil((5 * remaining) / 12));
  s.active = 1;
  s.explored[1].push(u.tile);
  const attacked = command(s, { type: "attack", unit: v.id, target: u.id });
  assert.equal(attacked.error, null);
  assert.equal(
    attacked.state.units.find((x) => x.id === v.id).hp,
    v.hp - preview.retaliation,
  );
  s.active = 0;
  s = learn(s, "rekindle");
  assert.equal(healAmount(s, s.units[0]), 6);
});
