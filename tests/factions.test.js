import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  command,
  validateSave,
  migrateSave,
  unitStats,
  combatPreview,
  buildingCost,
  healAmount,
  tileIncome,
  aiTurn,
  TECHS,
  UNITS,
} from "../src/game.js";
import {
  FACTION_TYPES,
  PLAYABLE_FACTIONS,
  armyColor,
} from "../src/factions.js";

test("nine starting identities preserve maps and grant their native technology and army", () => {
  for (const key of PLAYABLE_FACTIONS) {
    const s = createGame(417, 17, [key, key]),
      f = FACTION_TYPES[key];
    assert.ok(validateSave(s));
    assert.deepEqual(s.players[0].tech, [f.tech]);
    assert.equal(s.units[0].type, f.unit);
    assert.equal(s.units[0].hp, UNITS[f.unit].hp);
    assert.deepEqual(s.tiles, createGame(417, 17).tiles);
    assert.notEqual(armyColor(s, 0), armyColor(s, 1));
  }
  assert.throws(() => createGame(417, 17, ["__proto__", "ember"]));
  assert.ok(
    createGame(417, 17, ["canopy", "ember"]).explored[0].length >
      createGame(417, 17).explored[0].length,
  );
});

test("each faction can learn only its own mastery; prerequisite and currency gates remain enforced", () => {
  for (const key of PLAYABLE_FACTIONS) {
    let s = createGame(417, 17, [key, "ember"]);
    const mastery = FACTION_TYPES[key].doctrine;
    assert.ok(command(s, { type: "research", tech: mastery }).error);
    s.players[0].tech = Object.keys(TECHS).filter((k) => !TECHS[k].faction);
    s.players[0].stars = 100;
    for (const other of PLAYABLE_FACTIONS.filter((k) => k !== key)) {
      assert.ok(
        command(s, { type: "research", tech: FACTION_TYPES[other].doctrine })
          .error,
      );
      assert.equal(s.players[0].stars, 100);
    }
    const r = command(s, { type: "research", tech: mastery });
    assert.equal(r.error, null);
    assert.equal(r.state.players[0].stars, 88);
    assert.ok(validateSave(r.state));
  }
});

test("economy, rest and archer mastery affect actual derived rules", () => {
  const s = createGame(417, 17, ["tide", "stone"]);
  assert.equal(buildingCost(s, "farm", 0), 3);
  assert.equal(buildingCost(s, "farm", 1), 4);
  const guard = s.units[1];
  s.tiles[guard.tile].owner = 1;
  assert.equal(healAmount(s, guard), 5);
  s.tiles[guard.tile].owner = null;
  assert.equal(healAmount(s, guard), 4);
  const farm = s.tiles.find((t) => t.owner === 0 && !t.city);
  farm.improved = true;
  farm.building = "farm2";
  const before = tileIncome(s, farm);
  s.players[0].tech.push("granaries");
  assert.equal(tileIncome(s, farm), before + 1);
  const e = createGame(417, 17, ["ember", "stone"]);
  const attack = unitStats(e, e.units[0]).attack;
  e.players[0].tech.push("firecraft");
  assert.equal(unitStats(e, e.units[0]).attack, attack + 1);
});

test("Ember kill bonus is awarded by combat, not just unit descriptions", () => {
  const s = createGame(417, 17, ["ember", "stone"]);
  const u = s.units[0],
    v = s.units[1];
  v.tile = u.tile + 1;
  v.hp = 1;
  const r = command(s, { type: "attack", unit: u.id, target: v.id });
  assert.equal(r.error, null);
  assert.equal(r.state.units.find((x) => x.id === u.id).xp, 4);
  assert.equal(r.state.units.length, 1);
});

test("defensive masteries reduce actual preview damage only in their valid terrain", () => {
  for (const key of ["canopy", "stone"]) {
    const s = createGame(417, 17, ["ember", key]);
    const [u, v] = s.units;
    v.type = "guardian";
    v.hp = 12;
    const t = s.tiles[v.tile];
    t.terrain = key === "canopy" ? "forest" : "grass";
    t.owner = 1;
    const before = combatPreview(s, u, v).damage;
    s.players[1].tech.push(FACTION_TYPES[key].doctrine);
    assert.equal(combatPreview(s, u, v).damage, before - 1);
    if (key === "canopy") t.terrain = "grass";
    else t.owner = null;
    const withMastery = combatPreview(s, u, v).damage;
    s.players[1].tech.pop();
    assert.equal(combatPreview(s, u, v).damage, withMastery);
  }
});

test("discounted construction charges three stars and Stoneward rest caps at maximum HP", () => {
  const s = createGame(417, 17, ["tide", "stone"]);
  const t = s.tiles.find(
    (t) => t.owner === 0 && t.terrain === "grass" && !t.city && !t.beacon,
  );
  const r = command(s, { type: "improve", tile: t.id, kind: "farm" });
  assert.equal(r.error, null);
  assert.equal(r.state.players[0].stars, 9);
  assert.ok(validateSave(r.state));
  s.active = 1;
  const u = s.units[1];
  s.tiles[u.tile].owner = 1;
  u.hp = 10;
  const healed = command(s, { type: "heal", unit: u.id });
  assert.equal(healed.error, null);
  assert.equal(healed.state.units[1].hp, 12);
});

test("legacy saves retain classic balance; malformed and foreign faction saves are rejected", () => {
  const s = createGame();
  s.version = 2;
  for (const p of s.players) delete p.faction;
  assert.ok(validateSave(s));
  const migrated = migrateSave(s);
  assert.equal(migrated.version, 3);
  assert.equal(migrated.players[0].faction, "classic");
  assert.deepEqual(migrated.players[0].tech, []);
  assert.ok(validateSave(migrated));
  const invalid = createGame(417, 17, ["stone", "ember"]);
  invalid.players[0].tech.push("firecraft");
  assert.equal(validateSave(invalid), false);
  assert.equal(validateSave({ ...invalid, players: null }), false);
  delete migrated.players[0].faction;
  assert.equal(validateSave(migrated), false);
});

test("AI completes every faction pairing on both map sizes with valid state", () => {
  for (const size of [11, 17])
    for (const a of PLAYABLE_FACTIONS)
      for (const b of PLAYABLE_FACTIONS) {
        let s = createGame(417, size, [a, b]),
          turns = 0;
        while (s.winner === null && turns++ < 90) {
          s = aiTurn(s, s.active);
          assert.ok(validateSave(s), `${size}: ${a}/${b} turn ${turns}`);
        }
        assert.notEqual(s.winner, null, `${a}/${b} stalled`);
      }
});
