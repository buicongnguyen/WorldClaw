import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  command,
  aiTurn,
  validateSave,
  idAt,
  neighbors,
  passable,
  reachable,
  income,
  combatPreview,
  targets,
  UNITS,
  mapSize,
  roundLimit,
} from "../src/game.js";
const act = (s, a) => {
  const r = command(s, a);
  assert.equal(r.error, null);
  return r.state;
};

test("large maps preserve symmetry and connected objectives across 100 seeds", () => {
  for (let seed = 0; seed < 100; seed++) {
    const s = createGame(seed, 17);
    assert.equal(s.tiles.length, 289);
    assert.equal(roundLimit(s), 40);
    assert.ok(validateSave(s));
    assert.deepEqual(s, createGame(seed, 17));
    assert.equal(
      s.tiles.filter((t) => t.city && t.city.capital === null).length,
      8,
    );
    for (const t of s.tiles)
      assert.equal(t.terrain, s.tiles[288 - t.id].terrain);
    const start = s.tiles.find((t) => t.city?.capital === 0).id;
    const seen = new Set([start]),
      queue = [start];
    while (queue.length)
      for (const n of neighbors(s, s.tiles[queue.shift()]))
        if (passable(n) && !seen.has(n.id)) {
          seen.add(n.id);
          queue.push(n.id);
        }
    for (const t of s.tiles.filter((t) => t.city || t.beacon))
      assert.ok(seen.has(t.id));
    for (const t of s.tiles)
      for (const n of neighbors(s, t))
        assert.equal(Math.abs(n.x - t.x) + Math.abs(n.z - t.z), 1);
  }
});
test("old 11x11 saves without size remain valid and unsupported sizes fail", () => {
  const s = createGame();
  delete s.size;
  assert.equal(mapSize(s), 11);
  assert.ok(validateSave(s));
  s.size = 18;
  assert.equal(validateSave(s), false);
  assert.throws(() => createGame(1, 18), /Unsupported/);
});
test("large-map round limit is 40 and both sides receive their final turn", () => {
  let s = createGame(417, 17);
  s.round = 40;
  s = act(s, { type: "end" });
  assert.equal(s.winner, null);
  s = act(s, { type: "end" });
  assert.equal(s.winner, -1);
});
test("large-map AI terminates and preserves saves over 40 seeds", () => {
  for (let seed = 0; seed < 40; seed++) {
    let s = createGame(seed, 17);
    for (let turn = 0; turn < 41 && s.winner === null; turn++) {
      s = act(s, { type: "end" });
      s = aiTurn(s);
      assert.ok(validateSave(s));
    }
    assert.notEqual(s.winner, null);
  }
});
test("100 seeded boards are deterministic, symmetric and all objectives connected", () => {
  for (let seed = 0; seed < 100; seed++) {
    const s = createGame(seed);
    assert.deepEqual(s, createGame(seed));
    assert.ok(validateSave(s));
    for (const t of s.tiles)
      assert.equal(t.terrain, s.tiles[120 - t.id].terrain);
    const visited = new Set([idAt(2, 7)]),
      queue = [...visited];
    while (queue.length)
      for (const n of neighbors(s, s.tiles[queue.shift()]))
        if (passable(n) && !visited.has(n.id)) {
          visited.add(n.id);
          queue.push(n.id);
        }
    for (const t of s.tiles.filter((t) => t.city || t.beacon))
      assert.ok(visited.has(t.id), `seed ${seed}, tile ${t.id}`);
  }
});
test("invalid moves do not mutate state, and paths cannot jump over blocking tiles", () => {
  const s = createGame(),
    before = structuredClone(s),
    u = s.units[0];
  assert.equal(command(s, { type: "move", unit: u.id, tile: 0 }).state, s);
  assert.deepEqual(s, before);
  for (const t of neighbors(s, s.tiles[u.tile])) t.terrain = "water";
  assert.deepEqual(reachable(s, u), []);
});
test("one move per turn; attack and heal exhaust movement", () => {
  let s = createGame();
  const tile = reachable(s, s.units[0])[0];
  s = act(s, { type: "move", unit: 1, tile });
  assert.deepEqual(reachable(s, s.units[0]), []);
  assert.ok(command(s, { type: "heal", unit: 1 }).error);
  s = createGame();
  s.units[0].hp = 3;
  s = act(s, { type: "heal", unit: 1 });
  assert.equal(s.units[0].hp, 7);
  assert.ok(s.units[0].attacked);
  assert.deepEqual(reachable(s, s.units[0]), []);
});
test("income occurs exactly once at turn start, capture has no immediate income", () => {
  let s = createGame();
  const initial = s.players[0].stars;
  s = act(s, { type: "end" });
  assert.equal(s.players[1].stars, 15);
  assert.equal(s.players[0].stars, initial);
  s = act(s, { type: "end" });
  assert.equal(s.players[0].stars, initial + 3);
  assert.equal(s.round, 2);
  s.units[0].tile = idAt(2, 6);
  s.explored[0] = s.tiles.map((t) => t.id);
  const stars = s.players[0].stars;
  s = act(s, { type: "move", unit: 1, tile: idAt(2, 5) });
  assert.equal(s.tiles[idAt(2, 5)].owner, 0);
  assert.equal(s.players[0].stars, stars);
  assert.equal(income(s, 0), 6);
});
test("recruitment checks ownership, occupancy, costs, tech, and exhausts new units", () => {
  let s = createGame();
  assert.ok(
    command(s, { type: "recruit", tile: idAt(8, 3), kind: "guardian" }).error,
  );
  assert.ok(
    command(s, { type: "recruit", tile: idAt(2, 7), kind: "archer" }).error,
  );
  s = act(s, { type: "recruit", tile: idAt(2, 7), kind: "guardian" });
  assert.equal(s.players[0].stars, 7);
  assert.ok(s.units.at(-1).attacked);
  assert.ok(
    command(s, { type: "recruit", tile: idAt(2, 7), kind: "scout" }).error,
  );
});
test("technology and land development cannot charge twice", () => {
  let s = createGame();
  s = act(s, { type: "research", tech: "archery" });
  assert.equal(s.players[0].stars, 5);
  assert.ok(command(s, { type: "research", tech: "archery" }).error);
  s.players[0].tech.push("agriculture");
  const tile = s.tiles.find((t) => t.owner === 0 && !t.city && passable(t));
  s = act(s, { type: "improve", tile: tile.id });
  assert.equal(s.players[0].stars, 1);
  assert.equal(income(s, 0), 4);
  assert.ok(command(s, { type: "improve", tile: tile.id }).error);
});
test("combat prediction matches damage, health-scaled retaliation and lethal removal", () => {
  let s = createGame();
  s.explored[0] = s.tiles.map((t) => t.id);
  s.units[1].tile = idAt(4, 7);
  s.tiles[idAt(4, 7)].terrain = "grass";
  const preview = combatPreview(s, s.units[0], s.units[1]);
  s = act(s, { type: "attack", unit: 1, target: 2 });
  assert.equal(s.units[0].hp, 8 - preview.retaliation);
  assert.equal(s.units[1].hp, 8 - preview.damage);
  assert.ok(s.units[0].moved);
  s = createGame();
  s.explored[0] = s.tiles.map((t) => t.id);
  s.units[1].tile = idAt(4, 7);
  s.units[1].hp = 1;
  s = act(s, { type: "attack", unit: 1, target: 2 });
  assert.equal(s.units.length, 1);
  assert.equal(s.units[0].hp, 8);
});
test("ranged units attack without distant melee retaliation; hidden enemies cannot be targeted", () => {
  const s = createGame();
  s.units[0].type = "archer";
  s.units[1].tile = idAt(5, 7);
  s.explored[0] = [s.units[0].tile];
  assert.equal(targets(s, s.units[0]).length, 0);
  s.explored[0].push(s.units[1].tile);
  assert.equal(combatPreview(s, s.units[0], s.units[1]).retaliation, 0);
  assert.equal(targets(s, s.units[0]).length, 1);
});
test("capital and beacon victories freeze all future commands", () => {
  let s = createGame();
  s.units[0].tile = idAt(7, 3);
  s.units[1].tile = idAt(8, 2);
  s.explored[0] = s.tiles.map((t) => t.id);
  s = act(s, { type: "move", unit: 1, tile: idAt(8, 3) });
  assert.equal(s.winner, null);
  s = act(s, { type: "end" });
  assert.equal(s.winner, null);
  s = act(s, { type: "end" });
  assert.equal(s.winner, 0);
  assert.ok(command(s, { type: "end" }).error);
  s = createGame();
  s.active = 1;
  s.players[0].renown = 11;
  s.tiles[idAt(5, 5)].owner = 0;
  s = act(s, { type: "end" });
  assert.equal(s.winner, 0);
  assert.equal(s.players[0].renown, 12);
});
test("30 round limit gives both players a turn and resolves draws", () => {
  let s = createGame();
  s.round = 30;
  s = act(s, { type: "end" });
  assert.equal(s.winner, null);
  s = act(s, { type: "end" });
  assert.equal(s.winner, -1);
});
test("AI turns terminate and preserve invariants across 40 unattended matches", () => {
  for (let seed = 0; seed < 40; seed++) {
    let s = createGame(seed);
    for (let round = 0; round < 31 && s.winner === null; round++) {
      s = act(s, { type: "end" });
      s = aiTurn(s);
      assert.ok(validateSave(s), `invalid AI state seed ${seed}`);
      assert.ok(s.active === 0 || s.winner !== null);
    }
    assert.notEqual(s.winner, null, `seed ${seed} never ended`);
  }
});
test("save validator rejects malformed state, unknown types and unit stacking", () => {
  for (const invalid of [null, {}, [], { version: 1 }])
    assert.equal(validateSave(invalid), false);
  const mutations = [
    (s) => (s.units[0].hp = NaN),
    (s) => (s.units[1].tile = s.units[0].tile),
    (s) => s.players[0].tech.push("toString"),
    (s) => (s.units[0].type = "__proto__"),
    (s) => s.tiles.pop(),
    (s) => (s.round = 0),
    (s) => (s.players[0].stars = -1),
  ];
  for (const mutation of mutations) {
    const s = createGame();
    mutation(s);
    assert.equal(validateSave(s), false);
  }
});
test("prototype names are rejected as commands without spending currency", () => {
  const s = createGame();
  for (const name of ["toString", "__proto__", "constructor"]) {
    assert.equal(
      command(s, { type: "recruit", tile: idAt(2, 7), kind: name }).state,
      s,
    );
    assert.equal(command(s, { type: "research", tech: name }).state, s);
  }
});
test("forest movement costs two and friendly occupation blocks travel", () => {
  const s = createGame();
  const u = s.units[0],
    first = idAt(4, 7),
    second = idAt(5, 7);
  s.tiles[first].terrain = "forest";
  s.explored[0] = s.tiles.map((t) => t.id);
  assert.ok(reachable(s, u).includes(first));
  assert.ok(!reachable(s, u).includes(second));
  s.units.push({ ...u, id: s.nextId++, tile: first });
  assert.ok(!reachable(s, u).includes(first));
});
