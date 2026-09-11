export const SIZE = 11;
export const MAP_SIZES = [11, 17];
export const mapSize = (s) => s.size ?? SIZE;
export const roundLimit = (s) => (mapSize(s) === 17 ? 40 : 30);
export const GOAL = 12;
export const FACTIONS = ["Canopy Covenant", "Ember Court"];
export const UNITS = {
  scout: { name: "Scout", hp: 8, attack: 3, range: 1, move: 2, cost: 4 },
  guardian: { name: "Guardian", hp: 12, attack: 5, range: 1, move: 1, cost: 5 },
  archer: { name: "Archer", hp: 8, attack: 4, range: 2, move: 1, cost: 6 },
};
export const TECHS = {
  archery: {
    name: "Archery",
    cost: 7,
    description: "Recruit archers. Strike from two tiles away.",
  },
  trails: {
    name: "Trailcraft",
    cost: 8,
    description: "Every unit gains one movement point.",
  },
  masonry: {
    name: "Masonry",
    cost: 6,
    description: "Your cities provide +1 damage protection.",
  },
};
export const idAt = (x, z, size = SIZE) => z * size + x;
export const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
export const neighbors = (s, t) =>
  [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]
    .map(([x, z]) => s.tiles[idAt(t.x + x, t.z + z, mapSize(s))])
    .filter((n) => n && distance(t, n) === 1);
export const unitAt = (s, tile) => s.units.find((u) => u.tile === tile);
export const passable = (t) => t && !["water", "mountain"].includes(t.terrain);
const clone = (s) => structuredClone(s);
function random(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function createGame(seed = 417, size = SIZE) {
  if (!MAP_SIZES.includes(size)) throw new Error("Unsupported island size");
  const at = (x, z) => idAt(x, z, size);
  const center = (size - 1) / 2;
  const last = size - 1;
  const rng = random(seed);
  const s = {
    version: 1,
    size,
    seed: seed >>> 0,
    round: 1,
    active: 0,
    nextId: 3,
    winner: null,
    reason: "",
    tiles: [],
    units: [],
    players: [0, 1].map(() => ({ stars: 12, renown: 0, tech: [] })),
    explored: [[], []],
    log: ["Your people have reached the island. Chart a path to the beacons."],
  };
  for (let z = 0; z < size; z++)
    for (let x = 0; x < size; x++) {
      const i = at(x, z),
        mirror = size * size - 1 - i;
      const r = rng();
      const terrain =
        mirror < i
          ? s.tiles[mirror].terrain
          : x === 0 ||
              z === 0 ||
              x === last ||
              z === last ||
              ((x === 1 || x === last - 1) && (z === 1 || z === last - 1))
            ? "water"
            : r < 0.16
              ? "mountain"
              : r < 0.49
                ? "forest"
                : "grass";
      s.tiles.push({
        id: i,
        x,
        z,
        terrain,
        owner: null,
        city: null,
        beacon: false,
        improved: false,
      });
    }
  // A connected backbone and city approaches eliminate impossible seeds.
  for (let i = 1; i < last; i++) {
    s.tiles[at(center, i)].terrain = "grass";
    s.tiles[at(i, center)].terrain = "grass";
  }
  const cities =
    size === 11
      ? [
          [2, 7, "Willowhome", 0],
          [8, 3, "Cinderhold", 1],
          [3, 3, "Mossgate", null],
          [7, 7, "Sunhollow", null],
          [2, 5, "Westmere", null],
          [8, 5, "Eastmere", null],
        ]
      : [
          [3, 12, "Willowhome", 0],
          [13, 4, "Cinderhold", 1],
          [4, 4, "Mossgate", null],
          [12, 12, "Sunhollow", null],
          [3, 8, "Westmere", null],
          [13, 8, "Eastmere", null],
          [6, 12, "Fernwatch", null],
          [10, 4, "Ashford", null],
          [6, 6, "Northgrove", null],
          [10, 10, "Amberfield", null],
        ];
  for (const [x, z, name, owner] of cities) {
    const t = s.tiles[at(x, z)];
    t.terrain = "grass";
    t.owner = owner;
    t.city = { name, level: 1, capital: owner };
    let cx = x;
    while (cx !== center) {
      s.tiles[at(cx, z)].terrain = "grass";
      cx += Math.sign(center - cx);
    }
    for (const n of neighbors(s, t)) n.terrain = "grass";
    if (owner !== null) claim(s, t, owner);
  }
  for (const z of size === 11 ? [2, 5, 8] : [3, 8, 13]) {
    const t = s.tiles[at(center, z)];
    t.beacon = true;
    t.terrain = "grass";
  }
  s.units = [
    {
      id: 1,
      tile: at(cities[0][0] + 1, cities[0][1]),
      owner: 0,
      type: "scout",
      hp: 8,
      moved: false,
      attacked: false,
    },
    {
      id: 2,
      tile: at(cities[1][0] - 1, cities[1][1]),
      owner: 1,
      type: "scout",
      hp: 8,
      moved: false,
      attacked: false,
    },
  ];
  reveal(s, 0);
  reveal(s, 1);
  return s;
}
function claim(s, tile, owner) {
  const previous = tile.owner;
  tile.owner = owner;
  for (const n of neighbors(s, tile))
    if (
      passable(n) &&
      !n.city &&
      !n.beacon &&
      (n.owner === null || n.owner === previous)
    )
      n.owner = owner;
}
function reveal(s, owner) {
  const seen = new Set(s.explored[owner]);
  const centers = [
    ...s.units.filter((u) => u.owner === owner).map((u) => s.tiles[u.tile]),
    ...s.tiles.filter((t) => t.city && t.owner === owner),
  ];
  for (const c of centers)
    for (const t of s.tiles) if (distance(c, t) <= 3) seen.add(t.id);
  s.explored[owner] = [...seen].sort((a, b) => a - b);
}
export const income = (s, owner) =>
  s.tiles.reduce(
    (sum, t) =>
      sum +
      (t.owner === owner
        ? t.city
          ? t.city.level + 2
          : t.improved
            ? 1
            : 0
        : 0),
    0,
  );
export function reachable(s, u) {
  if (!u || u.owner !== s.active || u.moved || u.attacked || s.winner !== null)
    return [];
  const max =
    UNITS[u.type].move + (s.players[u.owner].tech.includes("trails") ? 1 : 0);
  const costs = new Map([[u.tile, 0]]),
    queue = [u.tile];
  while (queue.length) {
    queue.sort((a, b) => costs.get(a) - costs.get(b));
    const cur = queue.shift();
    for (const t of neighbors(s, s.tiles[cur])) {
      if (!passable(t) || unitAt(s, t.id)) continue;
      const cost = costs.get(cur) + (t.terrain === "forest" ? 2 : 1);
      if (cost <= max && cost < (costs.get(t.id) ?? Infinity)) {
        costs.set(t.id, cost);
        queue.push(t.id);
      }
    }
  }
  return [...costs.keys()].filter(
    (t) => t !== u.tile && s.explored[u.owner].includes(t),
  );
}
function protection(s, unit) {
  const t = s.tiles[unit.tile];
  return (
    (t.terrain === "forest" ? 1 : 0) +
    (t.city &&
    t.owner === unit.owner &&
    s.players[unit.owner].tech.includes("masonry")
      ? 1
      : 0)
  );
}
export function combatPreview(s, attacker, defender) {
  const damage = Math.max(
    1,
    Math.ceil(
      (UNITS[attacker.type].attack * attacker.hp) / UNITS[attacker.type].hp,
    ) - protection(s, defender),
  );
  const remaining = Math.max(0, defender.hp - damage);
  const retaliation =
    remaining > 0 &&
    distance(s.tiles[attacker.tile], s.tiles[defender.tile]) <=
      UNITS[defender.type].range
      ? Math.max(
          1,
          Math.ceil(
            (UNITS[defender.type].attack * remaining) / UNITS[defender.type].hp,
          ) - protection(s, attacker),
        )
      : 0;
  return {
    damage: Math.min(damage, defender.hp),
    retaliation: Math.min(retaliation, attacker.hp),
    lethal: remaining === 0,
  };
}
export function targets(s, u) {
  if (!u || u.owner !== s.active || u.attacked || s.winner !== null) return [];
  return s.units.filter(
    (v) =>
      v.owner !== u.owner &&
      s.explored[u.owner].includes(v.tile) &&
      distance(s.tiles[u.tile], s.tiles[v.tile]) <= UNITS[u.type].range,
  );
}
function log(s, message) {
  s.log.unshift(message);
  s.log = s.log.slice(0, 30);
}
function finish(s, winner, reason) {
  s.winner = winner;
  s.reason = reason;
  log(s, reason);
}
function occupy(s, u) {
  const t = s.tiles[u.tile];
  if ((t.city || t.beacon) && t.owner !== u.owner) {
    if (t.city) claim(s, t, u.owner);
    else t.owner = u.owner;
    log(
      s,
      `${FACTIONS[u.owner]} claimed ${t.city?.name ?? "an ancient beacon"}.`,
    );
    if (
      t.city?.capital !== null &&
      t.city?.capital !== undefined &&
      t.city.capital !== u.owner
    )
      finish(s, u.owner, `${FACTIONS[u.owner]} captured the rival capital.`);
  }
}
export function command(state, action) {
  const bad = (error) => ({ state, error });
  if (state.winner !== null)
    return bad("This expedition has ended. Start a new island.");
  const s = clone(state),
    p = s.players[s.active],
    u = s.units.find((v) => v.id === action.unit),
    t = s.tiles[action.tile];
  if (
    ["move", "attack", "heal"].includes(action.type) &&
    (!u || u.owner !== s.active)
  )
    return bad("Select one of your units.");
  if (action.type === "move") {
    if (!reachable(s, u).includes(action.tile))
      return bad("That tile is not reachable this turn.");
    u.tile = action.tile;
    u.moved = true;
    occupy(s, u);
    reveal(s, u.owner);
  } else if (action.type === "attack") {
    const v = s.units.find((v) => v.id === action.target);
    if (!v || !targets(s, u).some((x) => x.id === v.id))
      return bad("No enemy in attack range.");
    const hit = combatPreview(s, u, v);
    v.hp -= hit.damage;
    u.hp -= hit.retaliation;
    u.attacked = true;
    u.moved = true;
    log(
      s,
      `${UNITS[u.type].name} dealt ${hit.damage} damage; received ${hit.retaliation}.`,
    );
    s.units = s.units.filter((v) => v.hp > 0);
  } else if (action.type === "heal") {
    if (u.moved || u.attacked || u.hp >= UNITS[u.type].hp)
      return bad("Only wounded, unspent units can rest.");
    u.hp = Math.min(UNITS[u.type].hp, u.hp + 4);
    u.moved = true;
    u.attacked = true;
    log(s, `${UNITS[u.type].name} rested and recovered health.`);
  } else if (action.type === "recruit") {
    const def = Object.hasOwn(UNITS, action.kind) ? UNITS[action.kind] : null;
    if (!def || !t?.city || t.owner !== s.active)
      return bad("Recruit at a city you control.");
    if (unitAt(s, t.id)) return bad("Move the unit out of the city first.");
    if (action.kind === "archer" && !p.tech.includes("archery"))
      return bad("Research Archery first.");
    if (s.units.filter((v) => v.owner === s.active).length >= 10)
      return bad("Your army is at its 10-unit limit.");
    if (p.stars < def.cost) return bad("Not enough stars.");
    p.stars -= def.cost;
    s.units.push({
      id: s.nextId++,
      tile: t.id,
      owner: s.active,
      type: action.kind,
      hp: def.hp,
      moved: true,
      attacked: true,
    });
    reveal(s, s.active);
    log(s, `${FACTIONS[s.active]} recruited a ${def.name.toLowerCase()}.`);
  } else if (action.type === "improve" || action.type === "upgrade") {
    if (!t || t.owner !== s.active || !passable(t) || t.beacon)
      return bad("Choose eligible land you control.");
    const upgrade = action.type === "upgrade",
      cost = upgrade ? 6 : 4;
    if (upgrade ? !t.city || t.city.level >= 3 : t.city || t.improved)
      return bad("This tile cannot be developed further.");
    if (p.stars < cost) return bad("Not enough stars.");
    p.stars -= cost;
    if (upgrade) t.city.level++;
    else t.improved = true;
    log(
      s,
      upgrade
        ? `${t.city.name} grew to level ${t.city.level}.`
        : "An estate now produces +1 star each turn.",
    );
  } else if (action.type === "research") {
    const tech = Object.hasOwn(TECHS, action.tech) ? TECHS[action.tech] : null;
    if (!tech || p.tech.includes(action.tech))
      return bad("That knowledge is already yours or unavailable.");
    if (p.stars < tech.cost) return bad("Not enough stars.");
    p.stars -= tech.cost;
    p.tech.push(action.tech);
    log(s, `${FACTIONS[s.active]} learned ${tech.name}.`);
  } else if (action.type === "end") {
    if (s.active === 1) {
      if (s.round >= roundLimit(s)) {
        const score = (owner) => [
          s.players[owner].renown,
          s.tiles.filter((t) => t.city && t.owner === owner).length,
          s.units
            .filter((u) => u.owner === owner)
            .reduce((a, u) => a + u.hp, 0),
        ];
        const a = score(0),
          b = score(1);
        let winner = -1;
        for (let i = 0; i < a.length; i++)
          if (a[i] !== b[i]) {
            winner = a[i] > b[i] ? 0 : 1;
            break;
          }
        finish(
          s,
          winner,
          winner < 0
            ? "The island is shared. The expedition ends in a draw."
            : `${FACTIONS[winner]} prevailed after ${roundLimit(s)} rounds.`,
        );
        return { state: s, error: null };
      }
      s.round++;
    }
    s.active = 1 - s.active;
    const next = s.players[s.active];
    next.stars += income(s, s.active);
    next.renown += s.tiles.filter(
      (t) => t.beacon && t.owner === s.active,
    ).length;
    for (const unit of s.units.filter((v) => v.owner === s.active)) {
      unit.moved = false;
      unit.attacked = false;
    }
    reveal(s, s.active);
    if (next.renown >= GOAL)
      finish(
        s,
        s.active,
        `${FACTIONS[s.active]} united the beacons with ${next.renown} renown.`,
      );
  } else return bad("Unknown command.");
  return { state: s, error: null };
}
export function aiTurn(state) {
  let s = state;
  if (s.active !== 1 || s.winner !== null) return s;
  const act = (a) => {
    s = command(s, a).state;
  };
  for (const id of s.units.filter((u) => u.owner === 1).map((u) => u.id)) {
    let u = s.units.find((v) => v.id === id);
    if (!u) continue;
    let enemies = targets(s, u).sort((a, b) => a.hp - b.hp);
    if (u.hp <= 3 && !enemies.length) {
      act({ type: "heal", unit: id });
      continue;
    }
    if (!enemies.length) {
      const known = new Set(s.explored[1]);
      const goals = s.tiles.filter(
        (t) => known.has(t.id) && (t.city || t.beacon) && t.owner !== 1,
      );
      const frontier = s.tiles.filter(
        (t) =>
          known.has(t.id) &&
          passable(t) &&
          neighbors(s, t).some((n) => !known.has(n.id)),
      );
      const options = reachable(s, u);
      const goalSet = goals.length ? goals : frontier;
      // Distance field respects impassable terrain, avoiding greedy mountain traps.
      const distances = new Map(),
        queue = [];
      for (const g of goalSet) {
        distances.set(g.id, 0);
        queue.push(g.id);
      }
      while (queue.length) {
        const cur = queue.shift();
        for (const n of neighbors(s, s.tiles[cur]))
          if (passable(n) && known.has(n.id) && !distances.has(n.id)) {
            distances.set(n.id, distances.get(cur) + 1);
            queue.push(n.id);
          }
      }
      options.sort(
        (a, b) =>
          (distances.get(a) ?? 999) - (distances.get(b) ?? 999) || a - b,
      );
      if (options.length) act({ type: "move", unit: id, tile: options[0] });
      if (s.winner !== null) return s;
      u = s.units.find((v) => v.id === id);
      enemies = targets(s, u).sort((a, b) => a.hp - b.hp);
    }
    if (enemies.length)
      act({ type: "attack", unit: id, target: enemies[0].id });
  }
  if (s.players[1].stars >= 12 && !s.players[1].tech.includes("trails"))
    act({ type: "research", tech: "trails" });
  if (s.players[1].stars >= 12 && !s.players[1].tech.includes("archery"))
    act({ type: "research", tech: "archery" });
  for (const city of s.tiles.filter(
    (t) => t.city && t.owner === 1 && !unitAt(s, t.id),
  ))
    act({
      type: "recruit",
      tile: city.id,
      kind:
        s.players[1].tech.includes("archery") && s.round % 3 === 0
          ? "archer"
          : s.round % 2
            ? "scout"
            : "guardian",
    });
  if (s.players[1].stars >= 8) {
    const t = s.tiles.find(
      (t) =>
        t.owner === 1 && !t.city && !t.beacon && !t.improved && passable(t),
    );
    if (t) act({ type: "improve", tile: t.id });
  }
  act({ type: "end" });
  return s;
}
export function validateSave(s) {
  const int = (n, a, b) => Number.isInteger(n) && n >= a && n <= b;
  if (
    !s ||
    s.version !== 1 ||
    !MAP_SIZES.includes(mapSize(s)) ||
    !int(s.seed, 0, 4294967295) ||
    !int(s.round, 1, roundLimit(s)) ||
    ![0, 1].includes(s.active) ||
    ![null, -1, 0, 1].includes(s.winner) ||
    typeof s.reason !== "string" ||
    s.reason.length > 500 ||
    !int(s.nextId, 1, 10000)
  )
    return false;
  if (
    !Array.isArray(s.players) ||
    s.players.length !== 2 ||
    !s.players.every(
      (p) =>
        p &&
        int(p.stars, 0, 100000) &&
        int(p.renown, 0, 100) &&
        Array.isArray(p.tech) &&
        new Set(p.tech).size === p.tech.length &&
        p.tech.every((t) => Object.hasOwn(TECHS, t)),
    )
  )
    return false;
  if (
    !Array.isArray(s.tiles) ||
    s.tiles.length !== mapSize(s) * mapSize(s) ||
    !s.tiles.every(
      (t, i) =>
        t &&
        t.id === i &&
        t.x === i % mapSize(s) &&
        t.z === Math.floor(i / mapSize(s)) &&
        ["water", "grass", "forest", "mountain"].includes(t.terrain) &&
        [null, 0, 1].includes(t.owner) &&
        typeof t.beacon === "boolean" &&
        typeof t.improved === "boolean" &&
        (t.city === null ||
          (typeof t.city === "object" &&
            typeof t.city.name === "string" &&
            t.city.name.length < 40 &&
            int(t.city.level, 1, 3) &&
            [null, 0, 1].includes(t.city.capital))),
    )
  )
    return false;
  if (
    !Array.isArray(s.units) ||
    s.units.length > 20 ||
    !s.units.every(
      (u) =>
        u &&
        int(u.id, 1, s.nextId - 1) &&
        [0, 1].includes(u.owner) &&
        int(u.tile, 0, mapSize(s) ** 2 - 1) &&
        passable(s.tiles[u.tile]) &&
        Object.hasOwn(UNITS, u.type) &&
        int(u.hp, 1, UNITS[u.type].hp) &&
        typeof u.moved === "boolean" &&
        typeof u.attacked === "boolean",
    ) ||
    new Set(s.units.map((u) => u.id)).size !== s.units.length ||
    new Set(s.units.map((u) => u.tile)).size !== s.units.length
  )
    return false;
  if (
    [0, 1].some((owner) => s.units.filter((u) => u.owner === owner).length > 10)
  )
    return false;
  const canonical = createGame(s.seed, mapSize(s));
  if (
    s.tiles.some(
      (t, i) =>
        t.terrain !== canonical.tiles[i].terrain ||
        t.beacon !== canonical.tiles[i].beacon ||
        (t.city?.name ?? null) !== (canonical.tiles[i].city?.name ?? null) ||
        (t.city?.capital ?? null) !==
          (canonical.tiles[i].city?.capital ?? null) ||
        (t.improved && (t.city || t.beacon || !passable(t))),
    )
  )
    return false;
  return (
    Array.isArray(s.explored) &&
    s.explored.length === 2 &&
    s.explored.every(
      (a) =>
        Array.isArray(a) &&
        a.length <= mapSize(s) ** 2 &&
        new Set(a).size === a.length &&
        a.every((i) => int(i, 0, mapSize(s) ** 2 - 1)),
    ) &&
    Array.isArray(s.log) &&
    s.log.length <= 30 &&
    s.log.every((x) => typeof x === "string" && x.length < 500)
  );
}
