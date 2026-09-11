import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createGame,
  command,
  UNITS,
  TECHS,
  idAt,
  validateSave,
  reachable,
  targets,
  combatPreview,
  unitStats,
  launchTile,
  recruitReason,
  promotionReason,
  aiTurn,
} from "../src/game.js";
import { PLAYABLE_FACTIONS } from "../src/factions.js";
import { climateAt } from "../src/climate.js";
import {
  ARMY_ASSETS,
  UNIT_ROLES,
  NAVAL_ROLES,
  LIVERIES,
  appearanceFor,
} from "../src/appearance.js";
const allTech = Object.keys(TECHS).filter((k) => !TECHS[k].faction);
const rich = (tribe = "desert") => {
  const s = createGame(417, 17, [tribe, "ice"], { climates: true });
  for (const p of s.players) {
    p.tech = [...allTech];
    p.stars = 500;
  }
  s.explored = [s.tiles.map((t) => t.id), s.tiles.map((t) => t.id)];
  return s;
};
const act = (s, a) => {
  const r = command(s, a);
  assert.equal(r.error, null, JSON.stringify(a));
  assert.ok(validateSave(r.state), "Command produces a valid save");
  return r.state;
};
const place = (s, type, owner, tile) => {
  const u = {
    id: s.nextId++,
    type,
    owner,
    tile,
    hp: UNITS[type].hp,
    moved: false,
    attacked: false,
    xp: 0,
    rank: 0,
    promotion: null,
  };
  s.units.push(u);
  return u;
};
test("army pack contains all 65 centered prototypes, portable PBR textures and bounded meshes", () => {
  assert.equal(ARMY_ASSETS.length, 65);
  assert.deepEqual([...UNIT_ROLES].sort(), Object.keys(UNITS).sort());
  const file = readFileSync(
    new URL("../public/models/armies.glb", import.meta.url),
  );
  assert.equal(file.toString("utf8", 0, 4), "glTF");
  assert.equal(file.readUInt32LE(8), file.length);
  assert.ok(file.length < 16 * 1024 * 1024);
  const doc = JSON.parse(file.toString("utf8", 20, 20 + file.readUInt32LE(12)));
  const manifest = JSON.parse(
    readFileSync(
      new URL("../public/models/armies-manifest.json", import.meta.url),
    ),
  );
  assert.deepEqual(
    Object.keys(manifest.assets).sort(),
    [...ARMY_ASSETS].sort(),
  );
  for (const name of ARMY_ASSETS) {
    const node = doc.nodes.find((n) => n.name === name);
    assert.ok(node, name);
    assert.ok(
      !node.translation || node.translation.every((v) => Math.abs(v) < 0.0001),
      `${name} must not contain catalog offsets`,
    );
    assert.ok(manifest.assets[name].triangles > 0);
    assert.ok(
      manifest.assets[name].bounds
        .flat()
        .every((v) => Number.isFinite(v) && v > 0 && v < 1.7),
      name,
    );
  }
  for (const m of doc.meshes)
    for (const p of m.primitives) {
      assert.notEqual(p.attributes.NORMAL, undefined);
      const a = doc.accessors[p.attributes.POSITION];
      assert.ok(
        [...a.min, ...a.max].every(
          (v) => Number.isFinite(v) && Math.abs(v) < 1.7,
        ),
      );
    }
  assert.ok(
    doc.images.length > 2 &&
      doc.images.every((i) => i.bufferView !== undefined),
  );
  assert.ok(doc.materials.some((m) => m.normalTexture));
  for (const n of ["Faction_cloth", "Faction_sail", "Skin"])
    assert.ok(doc.materials.some((m) => m.name === n));
});
test("297 tribe, role and livery combinations resolve real assets without changing rules", () => {
  let checked = 0;
  for (const tribe of PLAYABLE_FACTIONS)
    for (const type of UNIT_ROLES) {
      let s = rich(tribe);
      s.units = [];
      const t = s.tiles.find(
        (t) =>
          t.terrain === (NAVAL_ROLES.includes(type) ? "water" : "grass") &&
          !t.city,
      );
      const u = place(s, type, 0, t.id),
        before = unitStats(s, u),
        stars = s.players[0].stars;
      for (const livery of LIVERIES.slice(1)) {
        s = act(s, { type: "livery", livery });
        const a = appearanceFor(s, u);
        assert.equal(a.tribe, tribe);
        assert.equal(a.style, livery);
        for (const name of [a.body, a.outfit, a.prow])
          assert.ok(ARMY_ASSETS.includes(name));
        assert.deepEqual(unitStats(s, u), before);
        assert.equal(s.players[0].stars, stars);
        assert.deepEqual(s.units, [u]);
        checked++;
      }
      const bad = command(s, { type: "livery", livery: "superpower" });
      assert.equal(bad.state, s);
      const invalid = structuredClone(s);
      invalid.players[0].livery = "superpower";
      assert.equal(validateSave(invalid), false);
    }
  assert.equal(checked, 297);
});
test("auto livery follows earned rank; legacy and embarked mounts resolve usable models", () => {
  const s = rich(),
    u = s.units[0];
  for (let rank = 0; rank <= 2; rank++) {
    u.rank = rank;
    assert.equal(appearanceFor(s, u).style, LIVERIES[rank + 1]);
  }
  u.type = "camel";
  u.tile = s.tiles.find((t) => t.terrain === "water").id;
  assert.equal(appearanceFor(s, u).body, "unit_boat");
  assert.equal(appearanceFor(s, u).embarked, true);
  s.players[0].faction = "classic";
  assert.equal(appearanceFor(s, u).tribe, "canopy");
});
test("all new recruits enforce research, price, harbor, occupancy and ten-unit limit", () => {
  for (const type of UNIT_ROLES.filter((k) => UNITS[k].requires)) {
    let s = rich();
    const city = s.tiles.find((t) => t.city?.capital === 0);
    assert.equal(recruitReason(s, city, type), "");
    for (const required of UNITS[type].requires) {
      const denied = structuredClone(s);
      denied.players[0].tech = denied.players[0].tech.filter(
        (k) => k !== required,
      );
      assert.match(
        recruitReason(denied, denied.tiles[city.id], type),
        /Requires/,
      );
      assert.equal(
        command(denied, { type: "recruit", tile: city.id, kind: type }).state,
        denied,
      );
    }
    s = act(s, { type: "recruit", tile: city.id, kind: type });
    const u = s.units.at(-1);
    assert.equal(u.type, type);
    assert.equal(s.players[0].stars, 500 - UNITS[type].cost);
    assert.equal(u.moved && u.attacked, true);
    assert.deepEqual(reachable(s, u), []);
    assert.equal(
      s.tiles[u.tile].terrain,
      NAVAL_ROLES.includes(type) ? "water" : "grass",
    );
  }
  let s = rich();
  const city = s.tiles.find((t) => t.city?.capital === 0);
  s.units[0].tile = city.id; // friendly infantry need not vacate to launch a ship
  s = act(s, { type: "recruit", tile: city.id, kind: "boat" });
  assert.equal(s.units[0].tile, city.id);
  assert.equal(launchTile(s, city), undefined); // the launch cell must be freed first
  assert.match(recruitReason(s, city, "boat"), /free water/);
  const inland = s.tiles.find(
    (t) => t.city && t.owner === null && !launchTile(s, t),
  );
  assert.ok(inland);
  inland.owner = 0;
  assert.match(recruitReason(s, inland, "ship"), /free water/);
  s = rich();
  s.players[0].stars = 5;
  assert.match(recruitReason(s, s.tiles[city.id], "boat"), /stars/);
  s = rich();
  s.units[1].tile = city.id;
  assert.match(recruitReason(s, s.tiles[city.id], "boat"), /Enemy/);
  s = rich();
  s.units = [];
  for (const t of s.tiles
    .filter((t) => t.terrain === "grass" && !t.city)
    .slice(0, 10))
    place(s, "scout", 0, t.id);
  assert.match(recruitReason(s, s.tiles[city.id], "boat"), /10 units/);
});
test("naval crews move only over water at their own speed and cannot train or capture land", () => {
  for (const type of NAVAL_ROLES) {
    let s = rich();
    s.units = [];
    const u = place(s, type, 0, idAt(0, 8, 17));
    const options = reachable(s, u);
    assert.ok(options.length > 0);
    assert.ok(options.every((id) => s.tiles[id].terrain === "water"));
    assert.ok(options.includes(idAt(0, 8 + UNITS[type].move, 17)));
    assert.ok(!options.includes(idAt(0, 8 + UNITS[type].move + 1, 17)));
    assert.equal(
      unitStats(s, u).move,
      UNITS[type].move,
      "Trailcraft does not buff ships",
    );
    assert.match(promotionReason(s, u, "mobility"), /Naval/);
    s = act(s, { type: "move", unit: u.id, tile: options[0] });
    const invalid = structuredClone(s);
    invalid.units[0].tile = s.tiles.find((t) => t.city).id;
    assert.equal(validateSave(invalid), false);
  }
});
test("spears counter land mounts in attacks and retaliation, not embarked passengers", () => {
  const s = rich();
  s.players.forEach((p) => (p.faction = "classic"));
  s.players.forEach(
    (p) => (p.tech = p.tech.filter((k) => k !== "shielddrill")),
  );
  s.units = [];
  const a = place(s, "spearman", 0, idAt(6, 8, 17)),
    b = place(s, "rider", 1, idAt(7, 8, 17));
  s.tiles[a.tile].terrain = s.tiles[b.tile].terrain = "grass";
  const counter = combatPreview(s, a, b),
    retaliation = combatPreview(s, b, a).retaliation;
  b.type = "guardian";
  assert.equal(counter.damage, combatPreview(s, a, b).damage + 2);
  b.type = "rider";
  // Spears retain stronger retaliation after surviving a mounted attack.
  a.type = "scout";
  a.hp = 8;
  assert.ok(retaliation > combatPreview(s, b, a).retaliation);
  a.type = "spearman";
  a.hp = 10;
  s.tiles[b.tile].terrain = "water";
  const embarked = combatPreview(s, a, b).damage;
  b.type = "guardian";
  assert.equal(embarked, combatPreview(s, a, b).damage);
});
test("every ordered unit pairing produces finite combat and a valid command result", () => {
  for (const attacker of UNIT_ROLES)
    for (const defender of UNIT_ROLES) {
      const s = rich();
      s.units = [];
      const aTile = s.tiles.find(
        (t) =>
          t.terrain === (NAVAL_ROLES.includes(attacker) ? "water" : "grass") &&
          s.tiles.some(
            (n) =>
              n.id !== t.id &&
              Math.abs(n.x - t.x) + Math.abs(n.z - t.z) === 1 &&
              n.terrain ===
                (NAVAL_ROLES.includes(defender) ? "water" : "grass"),
          ),
      );
      const bTile = s.tiles.find(
        (t) =>
          Math.abs(t.x - aTile.x) + Math.abs(t.z - aTile.z) === 1 &&
          t.terrain === (NAVAL_ROLES.includes(defender) ? "water" : "grass"),
      );
      const a = place(s, attacker, 0, aTile.id),
        b = place(s, defender, 1, bTile.id);
      const preview = combatPreview(s, a, b);
      assert.ok(
        Number.isFinite(preview.damage) && Number.isFinite(preview.retaliation),
        `${attacker}/${defender}`,
      );
      assert.ok(targets(s, a).includes(b));
      const result = act(s, { type: "attack", unit: a.id, target: b.id });
      assert.equal(
        result.units.find((u) => u.id === b.id)?.hp ?? 0,
        Math.max(0, b.hp - preview.damage),
      );
    }
});
test("horse charge, camel desert armor and gunship stationary fire match command damage", () => {
  let s = rich();
  s.players.forEach((p) => (p.faction = "classic"));
  s.units = [];
  let a = place(s, "rider", 0, idAt(6, 8, 17)),
    b = place(s, "guardian", 1, idAt(7, 8, 17));
  s.tiles[a.tile].terrain = s.tiles[b.tile].terrain = "grass";
  const standing = combatPreview(s, a, b).damage;
  a.moved = true;
  assert.equal(combatPreview(s, a, b).damage, standing + 1);
  const expected = combatPreview(s, a, b),
    bhp = b.hp;
  const after = act(s, { type: "attack", unit: a.id, target: b.id });
  assert.equal(
    after.units.find((u) => u.id === b.id)?.hp ?? 0,
    Math.max(0, bhp - expected.damage),
  );
  s = rich();
  s.players.forEach((p) => (p.faction = "classic"));
  s.units = [];
  const desert = s.tiles.find((t) => climateAt(s, t) === "desert");
  b = place(s, "camel", 1, desert.id);
  a = place(s, "guardian", 0, desert.id - 1);
  const armored = combatPreview(s, a, b).damage;
  b.type = "rider";
  assert.equal(combatPreview(s, a, b).damage, armored + 1);
  s = rich();
  s.units = [];
  a = place(s, "gunship", 0, idAt(0, 8, 17));
  b = place(s, "ship", 1, idAt(0, 10, 17));
  assert.ok(targets(s, a).some((u) => u.id === b.id));
  assert.ok(combatPreview(s, b, a).retaliation > 0);
  const moved = act(s, { type: "move", unit: a.id, tile: idAt(0, 9, 17) });
  assert.deepEqual(targets(moved, moved.units[0]), []);
  assert.equal(
    combatPreview(moved, moved.units[1], moved.units[0]).retaliation,
    0,
  );
  assert.equal(
    command(moved, { type: "attack", unit: a.id, target: b.id }).state,
    moved,
  );
  const reset = act(act(moved, { type: "end" }), { type: "end" });
  assert.ok(targets(reset, reset.units[0]).length > 0);
});
test("AI uses mounted and naval recruits and maintains every tribe's rich late-game army", () => {
  const used = new Set();
  for (const tribe of PLAYABLE_FACTIONS) {
    let s = rich(tribe);
    s.round = 10;
    const capital = s.tiles.find((t) => t.city?.capital === 0);
    for (const t of s.tiles
      .filter(
        (t) =>
          t.terrain === "grass" &&
          !t.city &&
          !s.units.some((u) => u.tile === t.id),
      )
      .slice(0, 2))
      place(s, "guardian", 0, t.id);
    // Three land soldiers make room for a support ship without replacing the invasion force.
    for (let i = 0; i < 8 && s.winner === null; i++) {
      s = aiTurn(s, s.active);
      assert.ok(validateSave(s), tribe);
      for (const u of s.units) used.add(u.type);
    }
    assert.equal(capital.owner, 0);
  }
  assert.ok(
    [...used].some((k) => NAVAL_ROLES.includes(k)),
    JSON.stringify([...used]),
  );
  assert.ok(used.has("camel") || used.has("rider"));
});
