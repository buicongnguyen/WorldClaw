import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  command,
  validateSave,
  migrateSave,
  income,
  unitStats,
  tileIncome,
  combatPreview,
  reachable,
  aiTurn,
  idAt,
  TECHS,
} from "../src/game.js";
import { developmentReason } from "../src/progression.js";
const act = (s, a) => {
  const r = command(s, a);
  assert.equal(r.error, null, JSON.stringify(a));
  assert.ok(validateSave(r.state), `Invalid state after ${JSON.stringify(a)}`);
  return r.state;
};
const rich = () => {
  const s = createGame();
  s.players[0].stars = 500;
  return s;
};
const learn = (s, ...keys) =>
  keys.reduce((s, tech) => act(s, { type: "research", tech }), s);
const cap = idAt(2, 7),
  enemyCap = idAt(8, 3);
test("beacon awards wait for both turns and tied renown does not favor the first faction", () => {
  let s = createGame();
  s.players[0].renown = 11;
  s.players[1].renown = 11;
  const beacons = s.tiles.filter((t) => t.beacon);
  beacons[0].owner = 0;
  beacons[2].owner = 1;
  s = act(s, { type: "end" });
  assert.deepEqual(
    s.players.map((p) => p.renown),
    [11, 11],
  );
  assert.equal(s.winner, null);
  s = act(s, { type: "end" });
  assert.deepEqual(
    s.players.map((p) => p.renown),
    [12, 12],
  );
  assert.equal(s.winner, null);
  s.tiles[beacons[1].id].owner = 1;
  s = act(act(s, { type: "end" }), { type: "end" });
  assert.equal(s.winner, 1);
});
test("territory ties preserve rotational faction symmetry", () => {
  for (const size of [11, 17])
    for (let seed = 0; seed < 50; seed++) {
      const s = createGame(seed, size),
        last = s.tiles.length - 1;
      for (const t of s.tiles)
        if (t.territory !== null)
          assert.equal(s.tiles[last - t.id].territory, last - t.territory);
    }
});
function town(kind = "market") {
  let s = learn(rich(), "agriculture", "archery", "training");
  for (const t of s.tiles
    .filter((t) => t.territory === cap && t.owner === 0 && !t.city)
    .slice(0, 2))
    s = act(s, { type: "improve", tile: t.id, kind: "farm" });
  return act(s, { type: "upgrade", tile: cap, kind });
}
function invasion(owner = 0) {
  const s = rich();
  s.active = owner;
  const target = owner === 0 ? enemyCap : cap;
  s.units[owner].tile = target + (owner === 0 ? -1 : 1);
  s.units[1 - owner].tile = owner === 0 ? idAt(8, 2) : idAt(2, 8);
  s.explored[owner] = s.tiles.map((t) => t.id);
  return act(s, { type: "move", unit: s.units[owner].id, tile: target });
}
test("research graph is acyclic, complete, and gated without charging", () => {
  let s = rich();
  for (const [key, def] of Object.entries(TECHS)) {
    if (def.requires)
      assert.equal(command(s, { type: "research", tech: key }).state, s);
    const seen = new Set([key]);
    let next = def.requires;
    while (next) {
      assert.ok(TECHS[next]);
      assert.ok(!seen.has(next));
      seen.add(next);
      next = TECHS[next].requires;
    }
  }
  for (const key of Object.keys(TECHS))
    s = act(s, { type: "research", tech: key });
  assert.equal(s.players[0].tech.length, 10);
});
test("farms require tech; upgrades replace income rather than stacking", () => {
  let s = rich();
  const tile = s.tiles.find((t) => t.owner === 0 && !t.city).id;
  assert.equal(command(s, { type: "improve", tile, kind: "farm" }).state, s);
  s = learn(s, "agriculture");
  s = act(s, { type: "improve", tile, kind: "farm" });
  assert.equal(income(s, 0), 4);
  assert.equal(command(s, { type: "improve", tile, kind: "farm2" }).state, s);
  s = learn(s, "irrigation");
  s = act(s, { type: "improve", tile, kind: "farm2" });
  assert.equal(income(s, 0), 5);
  assert.equal(command(s, { type: "improve", tile, kind: "farm2" }).state, s);
});
test("city branches need two developed tiles, expand territory, and cannot switch", () => {
  let s = learn(rich(), "agriculture");
  assert.match(
    developmentReason(s, s.tiles[cap], "upgrade", "market"),
    /two tiles/,
  );
  s = town();
  assert.equal(s.tiles[cap].city.level, 2);
  assert.equal(tileIncome(s, s.tiles[cap]), 6);
  assert.ok(
    s.tiles.filter((t) => t.owner === 0 && t.territory === cap).length > 4,
  );
  assert.equal(
    command(s, { type: "upgrade", tile: cap, kind: "barracks" }).state,
    s,
  );
  assert.equal(
    command(s, { type: "upgrade", tile: cap, kind: "walls" }).state,
    s,
  );
  s = learn(s, "masonry", "engineering");
  s = act(s, { type: "upgrade", tile: cap, kind: "walls" });
  assert.equal(s.tiles[cap].city.specialization, "market");
  assert.equal(s.tiles[cap].city.fortification, "walls");
  assert.equal(
    command(s, { type: "upgrade", tile: cap, kind: "workshop" }).state,
    s,
  );
});
test("commerce adds market and adjacent farm bonuses only once", () => {
  let s = town();
  const before = income(s, 0);
  s = learn(s, "irrigation", "commerce");
  assert.equal(income(s, 0), before + 3);
});
test("workshop recruitment gates sentinels and walls modify combat previews", () => {
  let s = town("barracks");
  assert.equal(
    command(s, { type: "recruit", tile: cap, kind: "sentinel" }).state,
    s,
  );
  s = learn(s, "masonry", "engineering");
  s = act(s, { type: "upgrade", tile: cap, kind: "workshop" });
  s = act(s, { type: "recruit", tile: cap, kind: "sentinel" });
  assert.equal(s.units.at(-1).hp, 16);
  const protectedState = structuredClone(s);
  protectedState.tiles[cap].city.fortification = "walls";
  assert.ok(
    combatPreview(protectedState, s.units[1], s.units.at(-1)).damage <=
      combatPreview(s, s.units[1], s.units.at(-1)).damage,
  );
});
test("promotions require XP, barracks, tech and unused actions; damage ratio is preserved", () => {
  let s = town("barracks");
  s.units[0].tile = cap;
  s.units[0].hp = 4;
  assert.equal(
    command(s, { type: "promote", unit: 1, choice: "resilience" }).state,
    s,
  );
  s.units[0].xp = 3;
  s = act(s, { type: "promote", unit: 1, choice: "resilience" });
  assert.equal(unitStats(s, s.units[0]).hp, 10);
  assert.equal(s.units[0].hp, 5);
  assert.ok(s.units[0].attacked);
  assert.equal(
    command(s, { type: "promote", unit: 1, choice: "mobility" }).state,
    s,
  );
  s = act(act(s, { type: "end" }), { type: "end" });
  s.units[0].xp = 6;
  assert.equal(
    command(s, { type: "promote", unit: 1, choice: "resilience" }).state,
    s,
  );
  s = learn(s, "tactics");
  s = act(s, { type: "promote", unit: 1, choice: "resilience" });
  assert.equal(s.units[0].hp, 6);
  assert.equal(unitStats(s, s.units[0]).attack, 5);
  assert.equal(
    command(s, { type: "promote", unit: 1, choice: "resilience" }).state,
    s,
  );
});
test("mobility promotion changes legal movement without increasing max health", () => {
  let s = town("barracks");
  s.units[0].tile = cap;
  s.units[0].xp = 3;
  s = act(s, { type: "promote", unit: 1, choice: "mobility" });
  assert.equal(unitStats(s, s.units[0]).move, 3);
  assert.equal(unitStats(s, s.units[0]).hp, 8);
  assert.deepEqual(reachable(s, s.units[0]), []);
});
test("occupation suspends city and estate income, then captures after either defender's turn", () => {
  for (const owner of [0, 1]) {
    let s = invasion(owner);
    const target = owner ? cap : enemyCap;
    const estate = s.tiles.find(
      (t) => t.territory === target && t.owner === 1 - owner,
    );
    estate.improved = true;
    estate.building = "estate";
    assert.equal(income(s, 1 - owner), 0);
    assert.equal(s.tiles[target].owner, 1 - owner);
    assert.equal(s.winner, null);
    s = act(s, { type: "end" });
    assert.equal(s.winner, null);
    assert.equal(
      command(s, { type: "upgrade", tile: target, kind: "market" }).state,
      s,
    );
    assert.equal(
      command(s, { type: "recruit", tile: target, kind: "scout" }).state,
      s,
    );
    s = act(s, { type: "end" });
    assert.equal(s.winner, owner);
    assert.equal(s.tiles[target].owner, owner);
    assert.equal(s.tiles[estate.id].owner, owner);
  }
});
test("defeating an occupier cancels capture and restores income", () => {
  let s = invasion();
  s = act(s, { type: "end" });
  s.units[0].hp = 1;
  s = act(s, { type: "attack", unit: 2, target: 1 });
  assert.equal(s.tiles[enemyCap].occupation, null);
  assert.equal(income(s, 1), 3);
  s = act(s, { type: "end" });
  assert.equal(s.winner, null);
});
test("leaving an occupied city cancels its pending record and occupiers cannot heal", () => {
  let s = invasion();
  s.units[0].moved = false;
  s.units[0].hp = 4;
  assert.equal(command(s, { type: "heal", unit: 1 }).state, s);
  s = act(s, { type: "move", unit: 1, tile: enemyCap - 1 });
  assert.equal(s.tiles[enemyCap].occupation, null);
  assert.equal(income(s, 1), 3);
});
test("final-round occupation resolves before scoring but fresh occupation never wins instantly", () => {
  let s = invasion();
  s.round = 30;
  s = act(s, { type: "end" });
  s = act(s, { type: "end" });
  assert.equal(s.winner, 0);
  s = invasion(1);
  s.round = 30;
  s = act(s, { type: "end" });
  assert.notEqual(s.reason.includes("captured"), true);
  assert.equal(s.tiles[cap].owner, 0);
});
test("legacy save migration preserves levels, money, income and permits missing specializations", () => {
  const raw = createGame();
  raw.version = 1;
  delete raw.size;
  raw.tiles[cap].city.level = 3;
  raw.players[0].tech = ["archery", "trails", "masonry"];
  raw.tiles.find((t) => t.owner === 0 && !t.city).improved = true;
  for (const t of raw.tiles) {
    delete t.building;
    delete t.road;
    delete t.territory;
    delete t.occupation;
    if (t.city) {
      delete t.city.specialization;
      delete t.city.fortification;
    }
  }
  for (const u of raw.units) {
    delete u.xp;
    delete u.rank;
    delete u.promotion;
  }
  assert.ok(validateSave(raw));
  const before = structuredClone(raw);
  let s = migrateSave(raw);
  assert.deepEqual(raw, before);
  assert.ok(validateSave(s));
  assert.equal(income(s, 0), 6);
  assert.equal(s.tiles[cap].city.level, 3);
  assert.deepEqual(s.players, raw.players);
  s.players[0].stars = 100;
  s = learn(s, "agriculture", "engineering");
  s = act(s, { type: "specialize", tile: cap, kind: "market" });
  s = act(s, { type: "specialize", tile: cap, kind: "walls" });
  assert.equal(s.tiles[cap].city.level, 3);
  assert.equal(s.tiles[cap].city.specialization, "market");
});
test("new save validator rejects broken progression, territory, rank and occupation records", () => {
  for (const mutation of [
    (s) => s.players[0].tech.push("commerce"),
    (s) => (s.units[0].rank = 3),
    (s) => (s.units[0].xp = -1),
    (s) => (s.tiles[cap].occupation = { unit: 999, owner: 1 }),
    (s) => (s.tiles[cap].territory = cap),
    (s) => (s.tiles[0].building = "farm"),
    (s) => (s.tiles[cap].city.fortification = "walls"),
    (s) => delete s.tiles[1].road,
  ]) {
    const s = createGame();
    mutation(s);
    assert.equal(validateSave(s), false);
  }
});
test("roads require logistics and connected friendly endpoints", () => {
  let s = town();
  s = learn(s, "masonry", "engineering", "logistics");
  s.units[0].type = "guardian";
  s.units[0].hp = 12;
  s.units[0].tile = cap;
  const a = cap + 1,
    b = cap + 2;
  assert.ok(!reachable(s, s.units[0]).includes(b));
  for (const tile of [cap, a, b]) s = act(s, { type: "road", tile });
  assert.ok(reachable(s, s.units[0]).includes(b));
  s.tiles[a].owner = 1;
  assert.ok(!reachable(s, s.units[0]).includes(b));
});
test("territory registry supplies at least two developable starting tiles over 200 maps", () => {
  for (const size of [11, 17])
    for (let seed = 0; seed < 100; seed++) {
      const s = createGame(seed, size);
      for (const t of s.tiles.filter((t) => t.city))
        assert.ok(
          s.tiles.filter(
            (n) =>
              n.territory === t.id &&
              Math.abs(n.x - t.x) + Math.abs(n.z - t.z) === 1,
          ).length >= 2,
        );
    }
});
test("both-side AI simulations exercise progression and end with valid states", () => {
  let developed = 0,
    researched = 0;
  for (const size of [11, 17])
    for (let seed = 0; seed < 20; seed++) {
      let s = createGame(seed, size);
      for (let i = 0; i < 82 && s.winner === null; i++) {
        s = aiTurn(s, s.active);
        assert.ok(validateSave(s));
      }
      assert.notEqual(s.winner, null);
      developed += s.tiles.filter((t) => t.city?.level > 1).length;
      researched += s.players.filter((p) =>
        p.tech.some((key) => TECHS[key].requires),
      ).length;
    }
  assert.ok(developed > 0, "AI must actually upgrade cities");
  assert.ok(researched > 0, "AI must reach tier II");
});
