import {
  TECHS,
  BUILDINGS,
  SPECIALIZATIONS,
  has,
  contested,
  researchReason,
  developmentReason,
  promotionReason,
  assignTerritories,
  migrateSave,
} from "./progression.js";
export {
  TECHS,
  BUILDINGS,
  researchReason,
  developmentReason,
  promotionReason,
  migrateSave,
} from "./progression.js";
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
  sentinel: { name: "Sentinel", hp: 16, attack: 6, range: 1, move: 1, cost: 9 },
};
export function unitStats(s, u) {
  const base = UNITS[u.type],
    rank = u.rank ?? 0;
  return {
    ...base,
    hp: base.hp + (u.promotion === "resilience" ? 2 * rank : 0),
    attack: base.attack + rank,
    move:
      base.move +
      (has(s, u.owner, "trails") ? 1 : 0) +
      (u.promotion === "mobility" ? rank : 0),
  };
}
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
    version: 2,
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
        building: null,
        territory: null,
        road: false,
        occupation: null,
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
    t.city = {
      name,
      level: 1,
      capital: owner,
      specialization: null,
      fortification: null,
    };
    let cx = x;
    while (cx !== center) {
      s.tiles[at(cx, z)].terrain = "grass";
      cx += Math.sign(center - cx);
    }
    for (const n of neighbors(s, t)) n.terrain = "grass";
  }
  for (const z of size === 11 ? [2, 5, 8] : [3, 8, 13]) {
    const t = s.tiles[at(center, z)];
    t.beacon = true;
    t.terrain = "grass";
  }
  assignTerritories(s);
  for (const t of s.tiles.filter((t) => t.city && t.owner !== null))
    claim(s, t, t.owner);
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
  for (const u of s.units)
    Object.assign(u, { xp: 0, rank: 0, promotion: null });
  reveal(s, 0);
  reveal(s, 1);
  return s;
}
function claim(s, tile, owner) {
  const previous = tile.owner;
  tile.owner = owner;
  for (const n of s.tiles)
    if (
      n.territory === tile.id &&
      ((n.owner === null &&
        distance(tile, n) <= Math.min(2, tile.city.level)) ||
        (previous !== null && n.owner === previous))
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
export function tileIncome(s, t) {
  if (t.owner === null || contested(s, t)) return 0;
  const market = t.city?.specialization === "market";
  if (t.city)
    return (
      t.city.level + 2 + (market ? 2 + Number(has(s, t.owner, "commerce")) : 0)
    );
  if (!t.improved) return 0;
  const bonus =
    has(s, t.owner, "commerce") &&
    neighbors(s, t).some(
      (n) =>
        n.owner === t.owner &&
        n.city?.specialization === "market" &&
        !contested(s, n),
    );
  return (BUILDINGS[t.building]?.income ?? 1) + Number(bonus);
}
export const income = (s, owner) =>
  s.tiles.reduce(
    (sum, t) => sum + (t.owner === owner ? tileIncome(s, t) : 0),
    0,
  );
export function reachable(s, u) {
  if (!u || u.owner !== s.active || u.moved || u.attacked || s.winner !== null)
    return [];
  const max = unitStats(s, u).move;
  const costs = new Map([[u.tile, 0]]),
    queue = [u.tile];
  while (queue.length) {
    queue.sort((a, b) => costs.get(a) - costs.get(b));
    const cur = queue.shift();
    for (const t of neighbors(s, s.tiles[cur])) {
      if (!passable(t) || unitAt(s, t.id)) continue;
      const from = s.tiles[cur];
      const road =
        has(s, u.owner, "logistics") &&
        from.road &&
        t.road &&
        from.owner === u.owner &&
        t.owner === u.owner &&
        !contested(s, from) &&
        !contested(s, t);
      const cost =
        costs.get(cur) + (road ? 0.5 : t.terrain === "forest" ? 2 : 1);
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
      : 0) +
    (t.city?.fortification === "walls" && t.owner === unit.owner ? 2 : 0)
  );
}
export function combatPreview(s, attacker, defender) {
  const damage = Math.max(
    1,
    Math.ceil(
      (unitStats(s, attacker).attack * attacker.hp) / unitStats(s, attacker).hp,
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
            (unitStats(s, defender).attack * remaining) /
              unitStats(s, defender).hp,
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
    if (t.city && t.owner !== null) {
      t.occupation = { unit: u.id, owner: u.owner };
      log(
        s,
        `${FACTIONS[u.owner]} is occupying ${t.city.name}. Survive the defender's turn to capture it.`,
      );
      return;
    }
    if (t.city) claim(s, t, u.owner);
    else t.owner = u.owner;
    u.xp = Math.min(1000, (u.xp ?? 0) + 2);
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
function cancelOccupations(s) {
  for (const t of s.tiles.filter((t) => t.occupation)) {
    const u = unitAt(s, t.id);
    if (!u || u.id !== t.occupation.unit || u.owner !== t.occupation.owner) {
      t.occupation = null;
      log(s, `Occupation of ${t.city.name} was broken.`);
    }
  }
}
function resolveOccupations(s, defender) {
  cancelOccupations(s);
  for (const t of s.tiles.filter((t) => t.occupation && t.owner === defender)) {
    const u = unitAt(s, t.id);
    t.occupation = null;
    claim(s, t, u.owner);
    u.xp = Math.min(1000, (u.xp ?? 0) + 2);
    reveal(s, u.owner);
    log(s, `${FACTIONS[u.owner]} secured ${t.city.name}.`);
    if (t.city.capital !== null && t.city.capital !== u.owner)
      finish(
        s,
        u.owner,
        `${FACTIONS[u.owner]} captured the rival capital after surviving its counterattack.`,
      );
  }
}
export function recruitReason(s, t, kind) {
  const def = Object.hasOwn(UNITS, kind) ? UNITS[kind] : null;
  if (!def || !t?.city || t.owner !== s.active)
    return "Recruit at a city you control.";
  if (contested(s, t)) return "Enemy occupation blocks recruitment.";
  if (unitAt(s, t.id)) return "Move the unit out of the city first.";
  if (kind === "archer" && !has(s, s.active, "archery"))
    return "Research Archery first.";
  if (
    kind === "sentinel" &&
    (!has(s, s.active, "engineering") || t.city.fortification !== "workshop")
  )
    return "Requires Engineering and a Workshop.";
  if (s.units.filter((u) => u.owner === s.active).length >= 10)
    return "Army limit: 10 units.";
  return s.players[s.active].stars < def.cost ? `Needs ${def.cost} stars.` : "";
}
export function command(state, action) {
  const bad = (error) => ({ state, error });
  if (!action || typeof action !== "object") return bad("Unknown command.");
  if (state.winner !== null)
    return bad("This expedition has ended. Start a new island.");
  const s = state.version === 1 ? migrateSave(state) : clone(state),
    p = s.players[s.active],
    u = s.units.find((v) => v.id === action.unit),
    t = s.tiles[action.tile];
  if (
    ["move", "attack", "heal", "promote"].includes(action.type) &&
    (!u || u.owner !== s.active)
  )
    return bad("Select one of your units.");
  if (action.type === "move") {
    if (!reachable(s, u).includes(action.tile))
      return bad("That tile is not reachable this turn.");
    u.tile = action.tile;
    u.moved = true;
    cancelOccupations(s);
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
    if (u.hp > 0) u.xp = Math.min(1000, (u.xp ?? 0) + (v.hp <= 0 ? 3 : 1));
    if (v.hp > 0) v.xp = Math.min(1000, (v.xp ?? 0) + (u.hp <= 0 ? 3 : 1));
    log(
      s,
      `${UNITS[u.type].name} dealt ${hit.damage} damage; received ${hit.retaliation}.`,
    );
    s.units = s.units.filter((v) => v.hp > 0);
    cancelOccupations(s);
  } else if (action.type === "heal") {
    if (s.tiles[u.tile].occupation)
      return bad("An occupying unit cannot rest.");
    if (u.moved || u.attacked || u.hp >= unitStats(s, u).hp)
      return bad("Only wounded, unspent units can rest.");
    u.hp = Math.min(unitStats(s, u).hp, u.hp + 4);
    u.moved = true;
    u.attacked = true;
    log(s, `${UNITS[u.type].name} rested and recovered health.`);
  } else if (action.type === "promote") {
    const reason = promotionReason(s, u, action.choice);
    if (reason) return bad(reason);
    const oldMax = unitStats(s, u).hp;
    p.stars -= u.rank ? 7 : 4;
    u.rank = (u.rank ?? 0) + 1;
    u.promotion = action.choice;
    u.hp = Math.max(1, Math.floor((u.hp * unitStats(s, u).hp) / oldMax));
    u.moved = u.attacked = true;
    log(s, `${UNITS[u.type].name} trained to rank ${u.rank}: ${u.promotion}.`);
  } else if (action.type === "recruit") {
    const reason = recruitReason(s, t, action.kind);
    if (reason) return bad(reason);
    const def = UNITS[action.kind];
    p.stars -= def.cost;
    s.units.push({
      id: s.nextId++,
      tile: t.id,
      owner: s.active,
      type: action.kind,
      hp: def.hp,
      moved: true,
      attacked: true,
      xp: 0,
      rank: 0,
      promotion: null,
    });
    reveal(s, s.active);
    log(s, `${FACTIONS[s.active]} recruited a ${def.name.toLowerCase()}.`);
  } else if (
    ["improve", "upgrade", "specialize", "road"].includes(action.type)
  ) {
    const kind = action.kind ?? (t?.terrain === "forest" ? "lumber" : "farm");
    const reason = developmentReason(s, t, action.type, kind);
    if (reason) return bad(reason);
    if (action.type === "specialize") {
      const level = SPECIALIZATIONS[kind].level;
      p.stars -= level === 2 ? 6 : 12;
      t.city[level === 2 ? "specialization" : "fortification"] = kind;
      log(s, `${t.city.name} added ${kind}.`);
    } else if (action.type === "upgrade") {
      p.stars -= t.city.level === 1 ? 6 : 12;
      t.city.level++;
      t.city[t.city.level === 2 ? "specialization" : "fortification"] = kind;
      claim(s, t, t.owner);
      reveal(s, t.owner);
      log(s, `${t.city.name} reached level ${t.city.level}: ${kind}.`);
    } else if (action.type === "road") {
      p.stars -= 2;
      t.road = true;
      log(
        s,
        "A road connects your realm. Friendly road steps cost half movement.",
      );
    } else {
      p.stars -= BUILDINGS[kind].cost;
      t.improved = true;
      t.building = kind;
      log(
        s,
        `${BUILDINGS[kind].name} now produces ${BUILDINGS[kind].income} income each turn.`,
      );
    }
  } else if (action.type === "research") {
    const tech = Object.hasOwn(TECHS, action.tech) ? TECHS[action.tech] : null;
    const reason = researchReason(s, action.tech);
    if (reason) return bad(reason);
    p.stars -= tech.cost;
    p.tech.push(action.tech);
    log(s, `${FACTIONS[s.active]} learned ${tech.name}.`);
  } else if (action.type === "end") {
    // Resolve only after the original owner has had an entire response turn.
    // On the final round these completions precede the score; fresh occupations do not count.
    resolveOccupations(s, s.active);
    if (s.winner !== null) return { state: s, error: null };
    if (s.active === 1) {
      // Score beacons together after both factions act, avoiding a half-turn victory race.
      for (const owner of [0, 1])
        s.players[owner].renown += s.tiles.filter(
          (t) => t.beacon && t.owner === owner,
        ).length;
      const [a, b] = s.players.map((p) => p.renown);
      if (Math.max(a, b) >= GOAL && a !== b) {
        const winner = a > b ? 0 : 1;
        finish(
          s,
          winner,
          `${FACTIONS[winner]} united the beacons with ${s.players[winner].renown} renown.`,
        );
        return { state: s, error: null };
      }
      if (s.round >= roundLimit(s)) {
        const score = (owner) => [
          s.players[owner].renown,
          s.tiles.filter((t) => t.city && t.owner === owner && !t.occupation)
            .length,
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
    for (const unit of s.units.filter((v) => v.owner === s.active)) {
      unit.moved = false;
      unit.attacked = false;
    }
    reveal(s, s.active);
  } else return bad("Unknown command.");
  return { state: s, error: null };
}
export function aiTurn(state, owner = 1) {
  let s = state;
  if (s.active !== owner || s.winner !== null) return s;
  const act = (a) => {
    s = command(s, a).state;
  };
  for (const id of s.units.filter((u) => u.owner === owner).map((u) => u.id)) {
    let u = s.units.find((v) => v.id === id);
    if (!u) continue;
    // Hold an occupation instead of walking away from its pending capture.
    if (s.tiles[u.tile].occupation?.unit === id) continue;
    if (!promotionReason(s, u, u.promotion ?? "resilience")) {
      act({ type: "promote", unit: id, choice: u.promotion ?? "resilience" });
      continue;
    }
    let enemies = targets(s, u).sort((a, b) => a.hp - b.hp);
    if (u.hp <= 3 && !enemies.length) {
      act({ type: "heal", unit: id });
      continue;
    }
    if (!enemies.length) {
      const known = new Set(s.explored[owner]);
      const goals = s.tiles.filter(
        (t) =>
          known.has(t.id) &&
          (t.city || t.beacon) &&
          (t.owner !== owner || t.occupation),
      );
      const frontier = s.tiles.filter(
        (t) =>
          known.has(t.id) &&
          passable(t) &&
          neighbors(s, t).some((n) => !known.has(n.id)),
      );
      const options = reachable(s, u);
      const training =
        (u.rank ?? 0) < 2 &&
        (u.xp ?? 0) >= (u.rank ? 6 : 3) &&
        has(s, owner, u.rank ? "tactics" : "training")
          ? s.tiles.filter(
              (t) =>
                t.owner === owner &&
                t.city?.specialization === "barracks" &&
                !t.occupation &&
                !unitAt(s, t.id),
            )
          : [];
      const goalSet = training.length
        ? training
        : goals.length
          ? goals
          : frontier;
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
          (distances.get(a) ?? 999) - (distances.get(b) ?? 999) ||
          (owner === 0 ? a - b : b - a),
      );
      if (options.length) act({ type: "move", unit: id, tile: options[0] });
      if (s.winner !== null) return s;
      u = s.units.find((v) => v.id === id);
      enemies = targets(s, u).sort((a, b) => a.hp - b.hp);
    }
    if (enemies.length)
      act({ type: "attack", unit: id, target: enemies[0].id });
  }
  // Reserve five stars for defense, buy one technology per turn, then develop.
  for (const tech of [
    "agriculture",
    "archery",
    "masonry",
    "trails",
    "training",
    "irrigation",
    "engineering",
    "commerce",
    "tactics",
    "logistics",
  ])
    if (
      !researchReason(s, tech) &&
      s.players[owner].stars >= TECHS[tech].cost + 5
    ) {
      act({ type: "research", tech });
      break;
    }
  const orderedTiles = [...s.tiles].sort((a, b) =>
    owner === 0 ? a.id - b.id : b.id - a.id,
  );
  for (const city of orderedTiles.filter(
    (t) => t.city && t.owner === owner && !t.occupation,
  )) {
    const owned = orderedTiles.filter(
      (t) => t.territory === city.id && t.owner === owner,
    );
    if (city.city.level === 1) {
      for (const t of owned.filter((t) => !t.improved).slice(0, 2)) {
        const kind = t.terrain === "forest" ? "lumber" : "farm";
        if (
          s.players[owner].stars >= 9 &&
          !developmentReason(s, t, "improve", kind)
        )
          act({ type: "improve", tile: t.id, kind });
      }
    }
    const kind =
      city.city.level === 1
        ? s.tiles.some(
            (t) => t.owner === owner && t.city?.specialization === "barracks",
          )
          ? "market"
          : "barracks"
        : city.city.capital !== null
          ? "walls"
          : "workshop";
    const preferred = !developmentReason(s, s.tiles[city.id], "upgrade", kind)
      ? kind
      : "market";
    if (
      s.players[owner].stars >= (city.city.level === 1 ? 11 : 17) &&
      !developmentReason(s, s.tiles[city.id], "upgrade", preferred)
    )
      act({ type: "upgrade", tile: city.id, kind: preferred });
  }
  for (const city of orderedTiles.filter(
    (t) => t.city && t.owner === owner && !t.occupation && !unitAt(s, t.id),
  ))
    if (
      s.units.filter((u) => u.owner === owner).length <
      Math.min(7, 2 + Math.floor(s.round / 5))
    )
      act({
        type: "recruit",
        tile: city.id,
        kind:
          city.city.fortification === "workshop" && has(s, owner, "engineering")
            ? "sentinel"
            : s.players[owner].tech.includes("archery") && s.round % 3 === 0
              ? "archer"
              : s.round % 2
                ? "scout"
                : "guardian",
      });
  if (s.players[owner].stars >= 9) {
    const t = orderedTiles.find(
      (t) =>
        t.owner === owner &&
        !developmentReason(
          s,
          t,
          "improve",
          t.building === "farm" || t.building === "estate"
            ? "farm2"
            : t.terrain === "forest"
              ? "lumber"
              : "farm",
        ),
    );
    if (t)
      act({
        type: "improve",
        tile: t.id,
        kind:
          t.building === "farm" || t.building === "estate"
            ? "farm2"
            : t.terrain === "forest"
              ? "lumber"
              : "farm",
      });
  }
  if (has(s, owner, "logistics") && s.players[owner].stars >= 7) {
    const t = orderedTiles.find(
      (t) => t.owner === owner && !developmentReason(s, t, "road"),
    );
    if (t) act({ type: "road", tile: t.id });
  }
  act({ type: "end" });
  return s;
}
export function validateSave(s) {
  const int = (n, a, b) => Number.isInteger(n) && n >= a && n <= b;
  if (
    !s ||
    ![1, 2].includes(s.version) ||
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
        int(u.hp, 1, s.version === 1 ? UNITS[u.type].hp : unitStats(s, u).hp) &&
        typeof u.moved === "boolean" &&
        typeof u.attacked === "boolean",
    ) ||
    new Set(s.units.map((u) => u.id)).size !== s.units.length ||
    new Set(s.units.map((u) => u.tile)).size !== s.units.length
  )
    return false;
  if (s.version === 2) {
    if (
      s.players.some((p) =>
        p.tech.some(
          (key) => TECHS[key].requires && !p.tech.includes(TECHS[key].requires),
        ),
      )
    )
      return false;
    if (
      s.units.some(
        (u) =>
          !int(u.xp, 0, 1000) ||
          !int(u.rank, 0, 2) ||
          (u.rank === 0
            ? u.promotion !== null
            : !["mobility", "resilience"].includes(u.promotion)) ||
          (u.rank > 0 && u.xp < (u.rank === 1 ? 3 : 6)),
      )
    )
      return false;
    if (
      s.tiles.some(
        (t) =>
          typeof t.road !== "boolean" ||
          (t.road && (!passable(t) || t.beacon || t.owner === null)) ||
          (t.territory !== null &&
            (!int(t.territory, 0, s.tiles.length - 1) ||
              !s.tiles[t.territory]?.city ||
              t.city ||
              t.beacon ||
              !passable(t))) ||
          (t.improved
            ? !Object.hasOwn(BUILDINGS, t.building)
            : t.building !== null) ||
          (t.building &&
            BUILDINGS[t.building]?.terrain &&
            t.terrain !== BUILDINGS[t.building].terrain) ||
          (t.city &&
            (![null, "market", "barracks"].includes(t.city.specialization) ||
              ![null, "walls", "workshop"].includes(t.city.fortification) ||
              (t.city.level < 2 && t.city.specialization !== null) ||
              (t.city.level < 3 && t.city.fortification !== null))) ||
          (t.occupation !== null &&
            (!t.occupation ||
              !t.city ||
              t.owner === null ||
              ![0, 1].includes(t.occupation.owner) ||
              t.occupation.owner === t.owner ||
              !s.units.some(
                (u) =>
                  u.id === t.occupation.unit &&
                  u.tile === t.id &&
                  u.owner === t.occupation.owner,
              ))),
      )
    )
      return false;
  } else if (
    s.players.some((p) =>
      p.tech.some((key) => !["archery", "masonry", "trails"].includes(key)),
    ) ||
    s.units.some((u) => u.type === "sentinel")
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
