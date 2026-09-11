import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createGame,
  command,
  validateSave,
  aiTurn,
  TECHS,
  combatPreview,
  researchCost,
  insightSpent,
  developmentReason,
  reachable,
  neighbors,
} from "../src/game.js";
import {
  canonicalSites,
  beaconActive,
  DISCOVERIES,
  STORY_ASSETS,
  councilReason,
  investigationReason,
  restorationReason,
  epilogue,
} from "../src/chronicle.js";
import { PLAYABLE_FACTIONS } from "../src/factions.js";
const story = (seed = 417, size = 17, tribe = "canopy") =>
  createGame(seed, size, [tribe, "ember"], {
    chronicle: true,
    climates: true,
    balancedStart: true,
  });
const act = (s, a) => {
  const r = command(s, a);
  assert.equal(r.error, null, JSON.stringify(a));
  assert.ok(validateSave(r.state), `Invalid after ${JSON.stringify(a)}`);
  return r.state;
};
const ownUnit = (s) => s.units.find((u) => u.owner === 0);
const ready = (s, u) => {
  u.moved = false;
  u.attacked = false;
  delete u.guarded;
};
function discover(s, index = 0, choice = "records") {
  const u = ownUnit(s),
    site = s.chronicle.sites[index];
  u.tile = site.tile;
  ready(s, u);
  if (site.kind === "wreck")
    s.players[0].tech = [
      ...new Set([...s.players[0].tech, "trails", "sailing"]),
    ];
  s.explored[0] = s.tiles.map((t) => t.id);
  return act(s, { type: "investigate", unit: u.id, choice });
}
test("story sites are canonical, mirrored, reachable and preserve the old map across 400 seeds", () => {
  for (const size of [11, 17])
    for (let seed = 0; seed < 200; seed++) {
      const s = story(seed, size),
        old = createGame(seed, size),
        sites = s.chronicle.sites;
      assert.deepEqual(
        s.tiles.map((t) => [t.terrain, t.beacon, t.city?.name]),
        old.tiles.map((t) => [t.terrain, t.beacon, t.city?.name]),
      );
      assert.equal(sites.length, 6);
      assert.equal(new Set(sites.map((v) => v.tile)).size, 6);
      assert.equal(sites.filter((v) => v.kind === "wreck").length, 2);
      for (const site of sites) {
        assert.ok(
          sites.some(
            (v) =>
              v.tile === s.tiles.length - 1 - site.tile && v.kind === site.kind,
          ),
        );
        assert.equal(
          s.tiles[site.tile].terrain,
          site.kind === "wreck" ? "water" : "grass",
        );
        assert.ok(!s.tiles[site.tile].city && !s.tiles[site.tile].beacon);
      }
      const first = s.tiles.find((t) => t.city?.capital === 0),
        seen = new Set([first.id]),
        queue = [first];
      for (let i = 0; i < queue.length; i++)
        for (const next of neighbors(s, queue[i]))
          if (
            !seen.has(next.id) &&
            ["grass", "forest"].includes(next.terrain)
          ) {
            seen.add(next.id);
            queue.push(next);
          }
      assert.ok(
        sites
          .filter((v) => v.kind === "archive")
          .every((v) => seen.has(v.tile)),
        "All archives must be reachable without native terrain abilities",
      );
      assert.ok(validateSave(s));
      assert.deepEqual(canonicalSites(s), sites);
    }
});
test("discoveries spend an unused turn, pay once and cannot be replayed by either owner", () => {
  for (const choice of Object.keys(DISCOVERIES)) {
    let s = story();
    const initial = s.players[0].stars,
      u = ownUnit(s);
    assert.match(investigationReason(s, u, choice), /Stand/);
    u.tile = s.chronicle.sites[0].tile;
    s.explored[0].push(u.tile);
    u.moved = true;
    assert.match(investigationReason(s, u, choice), /unused/);
    s = discover(story(), 0, choice);
    const final = ownUnit(s);
    assert.equal(final.moved && final.attacked, true);
    assert.equal(final.xp, 1);
    assert.equal(s.players[0].stars, initial + DISCOVERIES[choice].stars);
    assert.equal(s.chronicle.players[0].fragments, 1);
    assert.equal(s.chronicle.players[0].insight, DISCOVERIES[choice].insight);
    assert.equal(
      command(s, { type: "investigate", unit: final.id, choice }).state,
      s,
    );
    s = act(s, { type: "end" });
    const enemy = s.units.find((v) => v.owner === 1);
    enemy.tile = final.tile;
    s.explored[1] = [...new Set([...s.explored[1], enemy.tile])];
    s.units.find((v) => v.id === final.id).tile = s.tiles.find(
      (t) => t.city?.capital === 0,
    ).id;
    assert.match(investigationReason(s, enemy, choice), /already/);
    assert.equal(
      command(s, { type: "investigate", unit: enemy.id, choice }).state,
      s,
    );
  }
});
test("research insight stacks with native discounts and is consumed only by a valid purchase", () => {
  let s = discover(story(417, 17, "desert"));
  assert.equal(insightSpent(s, "agriculture"), 4);
  assert.equal(researchCost(s, "agriculture"), 2);
  const stars = s.players[0].stars;
  s = act(s, { type: "research", tech: "agriculture" });
  assert.equal(s.players[0].stars, stars - 2);
  assert.equal(s.chronicle.players[0].insight, 0);
  s = discover(s, 2);
  assert.equal(researchCost(s, "desertfarming"), 2);
  const before = s;
  assert.equal(
    command(s, { type: "research", tech: "greenhouses" }).state,
    before,
  );
  assert.equal(
    command(s, { type: "research", tech: "agriculture" }).state,
    before,
  );
  s = act(s, { type: "research", tech: "desertfarming" });
  assert.equal(s.chronicle.players[0].insight, 0);
  assert.ok(researchCost(s, "icefarming") >= 1);
});
test("native water travel does not bypass wreck salvage research", () => {
  const s = story(417, 17, "water"),
    u = ownUnit(s),
    wreck = s.chronicle.sites.find((v) => v.kind === "wreck");
  u.tile = wreck.tile;
  s.explored[0] = [...new Set([...s.explored[0], u.tile])];
  assert.ok(validateSave(s));
  assert.match(investigationReason(s, u, "records"), /Sailing/);
  assert.equal(
    command(s, { type: "investigate", unit: u.id, choice: "records" }).state,
    s,
  );
});
test("archives reserve development space only until recovered", () => {
  let s = story();
  const site = s.chronicle.sites[0];
  s.tiles[site.tile].owner = 0;
  assert.match(developmentReason(s, s.tiles[site.tile], "road"), /Recover/);
  s = discover(s);
  assert.doesNotMatch(
    developmentReason(s, s.tiles[site.tile], "road"),
    /Recover/,
  );
});
test("chart rewards reveal exactly the local radius without mutating the rival's exploration", () => {
  let s = story(),
    u = ownUnit(s);
  u.tile = s.chronicle.sites[0].tile;
  s.explored[0] = [u.tile];
  const rival = [...s.explored[1]],
    origin = s.tiles[u.tile];
  s = act(s, { type: "investigate", unit: u.id, choice: "charts" });
  assert.deepEqual(
    [...s.explored[0]].sort((a, b) => a - b),
    s.tiles
      .filter((t) => Math.abs(t.x - origin.x) + Math.abs(t.z - origin.z) <= 4)
      .map((t) => t.id),
  );
  assert.deepEqual(s.explored[1], rival);
});
test("restoration rejects spent units, missing fragments, enemy beacons and insufficient stars", () => {
  for (const variant of ["spent", "fragment", "owner", "stars"]) {
    const s = story();
    s.players[0].tech.push("masonry");
    const u = ownUnit(s),
      beacon = s.tiles.find((t) => t.beacon);
    u.tile = beacon.id;
    beacon.owner = 0;
    s.players[0].stars = 10;
    s.chronicle.players[0].fragments = 1;
    if (variant === "spent") u.moved = true;
    if (variant === "fragment") s.chronicle.players[0].fragments = 0;
    if (variant === "owner") beacon.owner = 1;
    if (variant === "stars") s.players[0].stars = 3;
    assert.ok(restorationReason(s, u));
    assert.equal(command(s, { type: "restore", unit: u.id }).state, s);
  }
});
test("dormant beacons do not score; restoration has gates, pays once and survives capture", () => {
  let s = story();
  const beacon = s.tiles.find((t) => t.beacon);
  beacon.owner = 0;
  s = act(act(s, { type: "end" }), { type: "end" });
  assert.equal(s.players[0].renown, 0);
  s = discover(s);
  let u = ownUnit(s);
  u.tile = beacon.id;
  ready(s, u);
  assert.match(restorationReason(s, u), /Masonry/);
  s = act(s, { type: "research", tech: "masonry" });
  const beforeStars = s.players[0].stars;
  s = act(s, { type: "restore", unit: u.id });
  assert.equal(s.players[0].stars, beforeStars - 4);
  assert.equal(s.chronicle.players[0].fragments, 0);
  assert.equal(ownUnit(s).xp, 3);
  assert.ok(beaconActive(s, s.tiles[beacon.id]));
  assert.equal(command(s, { type: "restore", unit: u.id }).state, s);
  s = act(act(s, { type: "end" }), { type: "end" });
  assert.equal(s.players[0].renown, 1);
  s.tiles[beacon.id].owner = 1;
  s = act(act(s, { type: "end" }), { type: "end" });
  assert.equal(s.players[1].renown, 1);
  assert.equal(s.chronicle.restored.length, 1);
  const legacy = createGame();
  legacy.tiles.find((t) => t.beacon).owner = 0;
  const next = act(act(legacy, { type: "end" }), { type: "end" });
  assert.equal(next.players[0].renown, 1);
  assert.equal(next.chronicle, undefined);
});
test("Guard adds one defense, cannot stack or follow movement, and expires on the correct turn", () => {
  let s = createGame();
  s.units[1].tile = s.units[0].tile + 1;
  const unguarded = combatPreview(s, s.units[1], s.units[0]).damage;
  s = act(s, { type: "guard", unit: 1 });
  assert.equal(combatPreview(s, s.units[1], s.units[0]).damage, unguarded - 1);
  assert.equal(command(s, { type: "guard", unit: 1 }).state, s);
  assert.deepEqual(reachable(s, s.units[0]), []);
  s = act(s, { type: "end" });
  assert.equal(s.units[0].guarded, true);
  const preview = combatPreview(s, s.units[1], s.units[0]);
  const hp = s.units[0].hp;
  s = act(s, { type: "attack", unit: 2, target: 1 });
  assert.equal(
    s.units.find((u) => u.id === 1)?.hp ?? 0,
    Math.max(0, hp - preview.damage),
  );
  s = act(s, { type: "end" });
  assert.equal(s.units[0].guarded, undefined);
  const another = createGame();
  another.units[0].moved = true;
  assert.equal(command(another, { type: "guard", unit: 1 }).state, another);
});
test("council choices are sequential, mutually exclusive, and do not win on a half-turn", () => {
  let s = discover(story());
  assert.match(councilReason(s, "sea"), /preceding/);
  const stars = s.players[0].stars;
  s = act(s, { type: "council", choice: "memory" });
  assert.equal(s.players[0].stars, stars + 6);
  assert.equal(command(s, { type: "council", choice: "bread" }).state, s);
  assert.equal(command(s, { type: "council", choice: "memory" }).state, s);
  s = discover(s, 4);
  const u = ownUnit(s);
  u.type = "boat";
  u.hp = 10;
  s = act(s, { type: "council", choice: "sea" });
  s.players[0].tech = Object.keys(TECHS).filter((k) => !TECHS[k].faction);
  for (const t of s.tiles.filter((t) => t.owner === 0 && !t.city).slice(0, 3)) {
    t.improved = true;
    t.building = "farm";
  }
  s.players[0].renown = 23;
  s = act(s, { type: "council", choice: "keepers" });
  assert.equal(s.winner, null);
  assert.equal(s.players[0].renown, 27);
  s = act(s, { type: "end" });
  assert.equal(s.winner, null);
  s = act(s, { type: "end" });
  assert.equal(s.winner, 0);
  assert.match(epilogue(s), /remember|keepers/);
});
test("an unspent gunship can Guard for retaliation but spent cannons cannot regain it", () => {
  let s = story();
  s.players.forEach(
    (p) => (p.tech = Object.keys(TECHS).filter((k) => !TECHS[k].faction)),
  );
  s.units = s.units.slice(0, 2);
  s.units[0].type = "gunship";
  s.units[0].hp = 18;
  s.units[0].tile = 17 * 8;
  s.units[1].type = "ship";
  s.units[1].hp = 16;
  s.units[1].tile = 17 * 9;
  s = act(s, { type: "guard", unit: 1 });
  assert.ok(combatPreview(s, s.units[1], s.units[0]).retaliation > 0);
  s.units[0].guarded = undefined;
  s.units[0].moved = true;
  assert.equal(command(s, { type: "guard", unit: 1 }).state, s);
  assert.equal(combatPreview(s, s.units[1], s.units[0]).retaliation, 0);
});
test("malformed story state, invented insight, duplicate restorations and invalid guard flags are rejected", () => {
  const base = discover(story());
  for (const mutate of [
    (s) => (s.chronicle = null),
    (s) => (s.chronicle.players[0].insight = 5),
    (s) => (s.chronicle.players[0].fragments = 9),
    (s) => s.chronicle.sites[0].tile++,
    (s) => (s.chronicle.sites[0].choice = "toString"),
    (s) => (s.chronicle.players[0].choices = ["keepers"]),
    (s) => (s.chronicle.restored = [{ tile: s.units[0].tile, owner: 0 }]),
    (s) => (s.units[0].guarded = "true"),
    (s) => {
      s.units[0].guarded = true;
      s.units[0].moved = false;
    },
  ]) {
    const s = structuredClone(base);
    mutate(s);
    assert.equal(validateSave(s), false);
  }
  assert.ok(validateSave(JSON.parse(JSON.stringify(base))));
});
test("Blender story pack has three centered bounded models with embedded PBR textures", () => {
  const file = readFileSync(
    new URL("../public/models/chronicle.glb", import.meta.url),
  );
  assert.equal(file.toString("utf8", 0, 4), "glTF");
  assert.equal(file.readUInt32LE(8), file.length);
  assert.ok(file.length < 4 * 1024 * 1024);
  const doc = JSON.parse(file.toString("utf8", 20, 20 + file.readUInt32LE(12)));
  for (const name of STORY_ASSETS) {
    const node = doc.nodes.find((n) => n.name === name);
    assert.ok(node, name);
    assert.ok(
      !node.translation || node.translation.every((v) => Math.abs(v) < 0.0001),
    );
  }
  for (const m of doc.meshes)
    for (const p of m.primitives) {
      assert.notEqual(p.attributes.NORMAL, undefined);
      const a = doc.accessors[p.attributes.POSITION];
      assert.ok(
        [...a.min, ...a.max].every(
          (v) => Number.isFinite(v) && Math.abs(v) < 1.3,
        ),
      );
    }
  assert.ok(
    doc.images.length > 0 &&
      doc.images.every((i) => i.bufferView !== undefined),
  );
  assert.ok(doc.materials.some((m) => m.normalTexture));
});
test("every tribe completes story-mode matches with valid states and uses story actions", () => {
  let recovered = 0,
    restored = 0,
    choices = 0;
  for (const size of [11, 17])
    for (const tribe of PLAYABLE_FACTIONS) {
      let s = story(91, size, tribe),
        turns = 0;
      while (s.winner === null && turns++ < 82) {
        s = aiTurn(s, s.active);
        assert.ok(validateSave(s), `${size}/${tribe}/${turns}`);
      }
      assert.notEqual(s.winner, null);
      recovered += s.chronicle.sites.filter((v) => v.owner !== null).length;
      restored += s.chronicle.restored.length;
      choices += s.chronicle.players.reduce((n, p) => n + p.choices.length, 0);
    }
  assert.ok(recovered > 18);
  assert.ok(restored > 10);
  assert.ok(choices > 18);
});
