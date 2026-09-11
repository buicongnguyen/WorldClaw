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
  buildingCost,
  prerequisites,
  researchCost,
  insightSpent,
  nextBuilding,
} from "./progression.js";
import { climateAt } from "./climate.js";
import { LIVERIES } from "./appearance.js";
import { FACTION_TYPES, faction, factionId, factionName } from "./factions.js";
import {
  createChronicle,
  validateChronicle,
  beaconActive,
  siteAt,
  investigationReason,
  restorationReason,
  councilReason,
  COUNCIL,
  DISCOVERIES,
} from "./chronicle.js";
export {
  TECHS,
  BUILDINGS,
  researchReason,
  developmentReason,
  promotionReason,
  migrateSave,
  buildingCost,
  prerequisites,
  researchCost,
  insightSpent,
  nextBuilding,
} from "./progression.js";
export const SIZE = 11;
export const MAP_SIZES = [11, 17];
export const mapSize = (s) => s.size ?? SIZE;
export const roundLimit = (s) => (mapSize(s) === 17 ? 40 : 30);
export const GOAL = 12;
export const renownGoal = (s) => s.renownTarget ?? GOAL;
export const FACTIONS = ["Canopy Covenant", "Ember Court"];
export const UNITS = {
  scout: {
    name: "Scout",
    hp: 8,
    attack: 3,
    range: 1,
    move: 2,
    cost: 4,
    equipment: "Knife, scabbard and light kit. Fast exploration.",
  },
  guardian: {
    name: "Guardian",
    hp: 12,
    attack: 5,
    range: 1,
    move: 1,
    cost: 5,
    equipment: "Sword and large kite shield. Durable front-line infantry.",
  },
  archer: {
    name: "Archer",
    hp: 8,
    attack: 4,
    range: 2,
    move: 1,
    cost: 6,
    equipment:
      "Bow, arrows and quiver. Requires Archery; develops through Marksmanship and Longbows.",
  },
  sentinel: {
    name: "Sentinel",
    hp: 16,
    attack: 6,
    range: 1,
    move: 1,
    cost: 9,
    equipment:
      "Long sword, plate armor and shield. Requires Engineering and a city Workshop.",
  },
  spearman: {
    name: "Spearman",
    hp: 10,
    attack: 4,
    range: 1,
    move: 1,
    cost: 6,
    requires: ["training"],
    equipment: "Long spear and buckler. +2 attack against mounts on land.",
  },
  rider: {
    name: "Horse rider",
    hp: 12,
    attack: 4,
    range: 1,
    move: 3,
    cost: 9,
    requires: ["riding"],
    mounted: true,
    equipment: "Horse, saddle and sword. +1 attack after moving on land.",
  },
  camel: {
    name: "Camel rider",
    hp: 12,
    attack: 4,
    range: 1,
    move: 3,
    cost: 9,
    requires: ["riding", "desertfarming"],
    mounted: true,
    equipment: "Camel, packs and spear. +1 protection on desert ground.",
  },
  boat: {
    name: "Boat",
    hp: 10,
    attack: 3,
    range: 1,
    move: 2,
    cost: 6,
    requires: ["sailing"],
    domain: "water",
    equipment: "Oared hull. Water-only boarding craft.",
  },
  ship: {
    name: "Ship",
    hp: 16,
    attack: 5,
    range: 2,
    move: 2,
    cost: 10,
    requires: ["navigation"],
    domain: "water",
    equipment: "Sailing hull with crew. Water-only ranged support.",
  },
  gunship: {
    name: "Gunship",
    hp: 18,
    attack: 7,
    range: 3,
    move: 1,
    cost: 15,
    requires: ["navalgunnery"],
    domain: "water",
    equipment:
      "Four deck guns. Fire or move, not both. Spent guns cannot retaliate; Guard preserves defensive fire for a ready crew.",
  },
  cutter: {
    name: "Fast cutter",
    hp: 10,
    attack: 3,
    range: 2,
    move: 4,
    cost: 11,
    requires: ["navigation"],
    domain: "water",
    equipment: "Narrow hull and angled sail. Fast but fragile.",
  },
};
export function unitStats(s, u) {
  const base = UNITS[u.type],
    rank = u.rank ?? 0;
  return {
    ...base,
    hp: base.hp + (u.promotion === "resilience" ? 2 * rank : 0),
    range:
      base.range +
      Number(u.type === "archer" && has(s, u.owner, "longbows") && !u.moved),
    attack:
      base.attack +
      rank +
      Number(
        base.range === 1 &&
          base.domain !== "water" &&
          has(s, u.owner, "dueling"),
      ) +
      (u.type === "archer" && has(s, u.owner, "firecraft") ? 1 : 0) +
      Number(
        factionId(s, u.owner) === "fire" &&
          base.range === 1 &&
          base.domain !== "water" &&
          u.hp === base.hp + (u.promotion === "resilience" ? 2 * rank : 0),
      ) +
      Number(
        u.type === "scout" &&
          has(s, u.owner, "dunewarfare") &&
          s.tiles[u.tile].terrain === "grass",
      ),
    move:
      (u.escort
        ? 3
        : base.move +
          (base.domain !== "water" && has(s, u.owner, "trails") ? 1 : 0)) +
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
// Unit traversal is separate from buildable land and canonical map connectivity.
export const canTraverse = (s, t, owner, unit) =>
  !!t &&
  (unit && UNITS[unit.type]?.domain === "water"
    ? t.terrain === "water"
    : passable(t) ||
      (t.terrain === "water" &&
        (factionId(s, owner) === "water" ||
          has(s, owner, "frozenpaths") ||
          has(s, owner, "sailing"))) ||
      (t.terrain === "mountain" && factionId(s, owner) === "mountain"));
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
export function createGame(
  seed = 417,
  size = SIZE,
  factions = ["classic", "classic"],
  options = {},
) {
  if (!MAP_SIZES.includes(size)) throw new Error("Unsupported island size");
  if (
    !Array.isArray(factions) ||
    factions.length !== 2 ||
    !factions.every((key) => Object.hasOwn(FACTION_TYPES, key))
  )
    throw new Error("Choose two valid factions");
  const at = (x, z) => idAt(x, z, size);
  const center = (size - 1) / 2;
  const last = size - 1;
  const rng = random(seed);
  const s = {
    version: 3,
    climates: options.climates === true,
    renownTarget: options.balancedStart ? 24 : 12,
    size,
    seed: seed >>> 0,
    round: 1,
    active: 0,
    nextId: 3,
    winner: null,
    reason: "",
    tiles: [],
    units: [],
    players: factions.map((key) => ({
      stars: 12,
      renown: 0,
      faction: key,
      tech: FACTION_TYPES[key].tech ? [FACTION_TYPES[key].tech] : [],
    })),
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
  for (const u of s.units) {
    Object.assign(u, { xp: 0, rank: 0, promotion: null });
    u.type = faction(s, u.owner).unit;
    u.hp = UNITS[u.type].hp;
  }
  if (options.balancedStart)
    for (const owner of [0, 1]) {
      if (faction(s, owner).unit === "scout") continue;
      const capital = s.tiles.find((t) => t.city?.capital === owner);
      s.units.push({
        id: s.nextId++,
        tile: capital.id,
        owner,
        type: "scout",
        hp: 8,
        moved: false,
        attacked: false,
        xp: 0,
        rank: 0,
        promotion: null,
        escort: true,
      });
    }
  reveal(s, 0);
  reveal(s, 1);
  if (options.chronicle === true) s.chronicle = createChronicle(s);
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
  for (const c of centers) {
    const scout = s.units.some(
      (u) => u.owner === owner && u.tile === c.id && u.type === "scout",
    );
    const radius = 3 + Number(factionId(s, owner) === "canopy" && scout);
    for (const t of s.tiles) if (distance(c, t) <= radius) seen.add(t.id);
  }
  s.explored[owner] = [...seen].sort((a, b) => a - b);
}
export function tradeCities(s, owner) {
  const result = new Set();
  if (!has(s, owner, "caravans")) return result;
  const legal = (t) =>
    t.owner === owner &&
    passable(t) &&
    !contested(s, t) &&
    (t.city || t.road) &&
    !s.units.some((u) => u.tile === t.id && u.owner !== owner);
  const visited = new Set();
  for (const root of s.tiles.filter((t) => t.city && legal(t))) {
    if (visited.has(root.id)) continue;
    const queue = [root],
      cities = [];
    visited.add(root.id);
    for (let i = 0; i < queue.length; i++) {
      const t = queue[i];
      if (t.city) cities.push(t.id);
      for (const n of neighbors(s, t))
        if (!visited.has(n.id) && legal(n)) {
          visited.add(n.id);
          queue.push(n);
        }
    }
    if (cities.length > 1) for (const id of cities) result.add(id);
  }
  return result;
}
export function plannedTradeRoads(s, owner) {
  const legal = (t) =>
    t.owner === owner &&
    passable(t) &&
    !t.beacon &&
    !contested(s, t) &&
    !s.units.some((u) => u.tile === t.id && u.owner !== owner);
  let best = [];
  for (const root of s.tiles.filter((t) => t.city && legal(t))) {
    const costs = new Map([[root.id, 0]]),
      paths = new Map([[root.id, []]]),
      queue = [root];
    while (queue.length) {
      queue.sort((a, b) => costs.get(a.id) - costs.get(b.id));
      const t = queue.shift(),
        path = paths.get(t.id);
      if (t.city && t.id !== root.id && path.length) {
        if (!best.length || path.length < best.length) best = path;
        break;
      }
      for (const n of neighbors(s, t))
        if (legal(n)) {
          const needsRoad = !n.city && !n.road,
            cost = costs.get(t.id) + Number(needsRoad);
          if (cost < (costs.get(n.id) ?? Infinity)) {
            costs.set(n.id, cost);
            paths.set(n.id, needsRoad ? [...path, n.id] : path);
            queue.push(n);
          }
        }
    }
  }
  return best;
}
export function tileIncome(s, t, network) {
  if (t.owner === null || contested(s, t)) return 0;
  const market = t.city?.specialization === "market";
  if (t.city)
    return (
      t.city.level +
      2 +
      ((network ?? tradeCities(s, t.owner)).has(t.id) ? 2 : 0) +
      (market
        ? 2 +
          Number(has(s, t.owner, "commerce")) +
          Number(has(s, t.owner, "granaries")) +
          Number(has(s, t.owner, "barter"))
        : 0)
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
  return (
    (BUILDINGS[t.building]?.income ?? 1) +
    Number(bonus) +
    Number(t.building === "farm2" && has(s, t.owner, "granaries"))
  );
}
export const income = (s, owner) => {
  const network = tradeCities(s, owner);
  return s.tiles.reduce(
    (sum, t) => sum + (t.owner === owner ? tileIncome(s, t, network) : 0),
    0,
  );
};
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
      if (!canTraverse(s, t, u.owner, u) || unitAt(s, t.id)) continue;
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
        costs.get(cur) +
        (road
          ? 0.5
          : t.terrain === "forest" ||
              (t.terrain === "water" &&
                UNITS[u.type].domain !== "water" &&
                !has(s, u.owner, "oceanways") &&
                !has(s, u.owner, "navigation") &&
                !has(s, u.owner, "frozenpaths"))
            ? 2
            : 1);
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
export function healAmount(s, unit) {
  const t = s.tiles[unit.tile];
  return (
    4 +
    Number(factionId(s, unit.owner) === "desert" && t.terrain === "grass") * 2 +
    Number(has(s, unit.owner, "rekindle")) * 2 +
    Number(
      factionId(s, unit.owner) === "stone" &&
        t.owner === unit.owner &&
        !contested(s, t),
    )
  );
}
function protection(s, unit, attacker) {
  const t = s.tiles[unit.tile];
  return (
    (t.terrain === "forest" ? 1 : 0) +
    Number(unit.guarded === true) +
    Number(
      attacker &&
        UNITS[attacker.type].range === 1 &&
        UNITS[attacker.type].domain !== "water" &&
        ["guardian", "sentinel"].includes(unit.type) &&
        has(s, unit.owner, "shielddrill"),
    ) +
    Number(t.terrain === "grass" && factionId(s, unit.owner) === "ice") +
    Number(unit.type === "camel" && climateAt(s, t) === "desert") +
    Number(t.terrain === "water" && has(s, unit.owner, "oceanways")) +
    Number(t.terrain === "mountain" && has(s, unit.owner, "summitguard")) * 2 +
    (t.city &&
    t.owner === unit.owner &&
    s.players[unit.owner].tech.includes("masonry")
      ? 1
      : 0) +
    (t.city?.fortification === "walls" && t.owner === unit.owner ? 2 : 0) +
    Number(t.terrain === "forest" && has(s, unit.owner, "groveguard")) +
    Number(
      ["guardian", "sentinel"].includes(unit.type) &&
        t.owner === unit.owner &&
        !contested(s, t) &&
        has(s, unit.owner, "shieldwall"),
    )
  );
}
export function shorePenalty(s, a, b) {
  return Number(
    (s.tiles[a.tile].terrain === "water") !==
      (s.tiles[b.tile].terrain === "water") && !has(s, a.owner, "marines"),
  );
}
function attackPower(s, a, b, retaliating = false) {
  return (
    unitStats(s, a).attack +
    Number(
      a.type === "spearman" &&
        UNITS[b.type].mounted === true &&
        s.tiles[b.tile].terrain !== "water",
    ) *
      2 +
    Number(
      a.type === "rider" &&
        a.moved &&
        !retaliating &&
        s.tiles[a.tile].terrain !== "water",
    ) +
    Number(
      a.type === "archer" &&
        has(s, a.owner, "marksmanship") &&
        distance(s.tiles[a.tile], s.tiles[b.tile]) >= 2,
    )
  );
}
export function combatPreview(s, attacker, defender) {
  const damage = Math.max(
    1,
    Math.ceil(
      (attackPower(s, attacker, defender) * attacker.hp) /
        unitStats(s, attacker).hp,
    ) -
      protection(s, defender, attacker) -
      shorePenalty(s, attacker, defender),
  );
  const remaining = Math.max(0, defender.hp - damage);
  const retaliation =
    remaining > 0 &&
    !(defender.type === "gunship" && defender.moved && !defender.guarded) &&
    distance(s.tiles[attacker.tile], s.tiles[defender.tile]) <=
      unitStats(s, defender).range
      ? Math.max(
          1,
          Math.ceil(
            (attackPower(s, { ...defender, hp: remaining }, attacker, true) *
              remaining) /
              unitStats(s, defender).hp,
          ) -
            protection(s, attacker, defender) -
            shorePenalty(s, defender, attacker),
        )
      : 0;
  return {
    damage: Math.min(damage, defender.hp),
    retaliation: Math.min(retaliation, attacker.hp),
    lethal: remaining === 0,
    shorePenalty: shorePenalty(s, attacker, defender),
  };
}
export function targets(s, u) {
  if (u?.type === "gunship" && u.moved) return [];
  if (!u || u.owner !== s.active || u.attacked || s.winner !== null) return [];
  return s.units.filter(
    (v) =>
      v.owner !== u.owner &&
      s.explored[u.owner].includes(v.tile) &&
      distance(s.tiles[u.tile], s.tiles[v.tile]) <= unitStats(s, u).range,
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
        `${factionName(s, u.owner)} is occupying ${t.city.name}. Survive the defender's turn to capture it.`,
      );
      return;
    }
    if (t.city) claim(s, t, u.owner);
    else t.owner = u.owner;
    u.xp = Math.min(1000, (u.xp ?? 0) + 2);
    log(
      s,
      `${factionName(s, u.owner)} claimed ${t.city?.name ?? "an ancient beacon"}.`,
    );
    if (
      t.city?.capital !== null &&
      t.city?.capital !== undefined &&
      t.city.capital !== u.owner
    )
      finish(
        s,
        u.owner,
        `${factionName(s, u.owner)} captured the rival capital.`,
      );
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
    log(s, `${factionName(s, u.owner)} secured ${t.city.name}.`);
    if (t.city.capital !== null && t.city.capital !== u.owner)
      finish(
        s,
        u.owner,
        `${factionName(s, u.owner)} captured the rival capital after surviving its counterattack.`,
      );
  }
}
export function launchTile(s, t, owner = s.active) {
  return s.tiles
    .filter(
      (n) => n.terrain === "water" && distance(n, t) <= 3 && !unitAt(s, n.id),
    )
    .sort(
      (a, b) =>
        distance(a, t) - distance(b, t) ||
        (owner === 0 ? a.id - b.id : b.id - a.id),
    )[0];
}
export function recruitReason(s, t, kind) {
  const def = Object.hasOwn(UNITS, kind) ? UNITS[kind] : null;
  if (!def || !t?.city || t.owner !== s.active)
    return "Recruit at a city you control.";
  if (contested(s, t)) return "Enemy occupation blocks recruitment.";
  if (
    unitAt(s, t.id)?.owner !== undefined &&
    unitAt(s, t.id).owner !== s.active
  )
    return "Enemy troops block recruitment.";
  if (unitAt(s, t.id) && def.domain !== "water")
    return "Move the unit out of the city first.";
  const missing = (def.requires ?? []).filter((k) => !has(s, s.active, k));
  if (missing.length)
    return `Requires ${missing.map((k) => TECHS[k].name).join(" + ")}.`;
  if (def.domain === "water" && !launchTile(s, t))
    return "Needs free water within 3 tiles of this coastal city.";
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
  const s = state.version < 3 ? migrateSave(state) : clone(state),
    p = s.players[s.active],
    u = s.units.find((v) => v.id === action.unit),
    t = s.tiles[action.tile];
  if (
    [
      "move",
      "attack",
      "heal",
      "promote",
      "guard",
      "investigate",
      "restore",
    ].includes(action.type) &&
    (!u || u.owner !== s.active)
  )
    return bad("Select one of your units.");
  if (action.type === "guard") {
    if (u.moved || u.attacked) return bad("Guard requires an unused turn.");
    u.guarded = true;
    u.moved = u.attacked = true;
    log(
      s,
      `${UNITS[u.type].name} is guarding: +1 protection until its next turn.`,
    );
  } else if (action.type === "investigate") {
    const reason = investigationReason(s, u, action.choice);
    if (reason) return bad(reason);
    const site = siteAt(s, u.tile),
      reward = DISCOVERIES[action.choice],
      progress = s.chronicle.players[s.active];
    site.owner = s.active;
    site.choice = action.choice;
    progress.fragments++;
    progress.insight += reward.insight;
    p.stars += reward.stars;
    u.moved = u.attacked = true;
    u.xp = Math.min(1000, u.xp + 1);
    if (action.choice === "charts") {
      const seen = new Set(s.explored[s.active]);
      for (const tile of s.tiles)
        if (distance(tile, s.tiles[u.tile]) <= 4) seen.add(tile.id);
      s.explored[s.active] = [...seen];
    }
    log(
      s,
      `${factionName(s, s.active)} recovered a ${site.kind}: ${reward.name}. +1 Meridian fragment.`,
    );
  } else if (action.type === "restore") {
    const reason = restorationReason(s, u);
    if (reason) return bad(reason);
    s.chronicle.players[s.active].fragments--;
    p.stars -= 4;
    s.chronicle.restored.push({ tile: u.tile, owner: s.active });
    u.moved = u.attacked = true;
    u.xp = Math.min(1000, u.xp + 2);
    log(
      s,
      `${factionName(s, s.active)} restored a Meridian beacon. Its current owner now earns renown each full round.`,
    );
  } else if (action.type === "council") {
    const reason = councilReason(s, action.choice);
    if (reason) return bad(reason);
    const reward = COUNCIL[action.choice];
    s.chronicle.players[s.active].choices.push(action.choice);
    s.chronicle.players[s.active].insight += reward.insight;
    p.stars += reward.stars;
    p.renown += reward.renown;
    log(s, `${factionName(s, s.active)} council: ${reward.name}.`);
  } else if (action.type === "livery") {
    if (!LIVERIES.includes(action.livery))
      return bad("Unknown cosmetic style.");
    p.livery = action.livery;
  } else if (action.type === "move") {
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
    if (u.hp > 0)
      u.xp = Math.min(
        1000,
        (u.xp ?? 0) +
          (v.hp <= 0 ? 3 + Number(factionId(s, u.owner) === "ember") : 1),
      );
    if (v.hp > 0)
      v.xp = Math.min(
        1000,
        (v.xp ?? 0) +
          (u.hp <= 0 ? 3 + Number(factionId(s, v.owner) === "ember") : 1),
      );
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
    u.hp = Math.min(unitStats(s, u).hp, u.hp + healAmount(s, u));
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
      tile: def.domain === "water" ? launchTile(s, t).id : t.id,
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
    log(
      s,
      `${factionName(s, s.active)} recruited a ${def.name.toLowerCase()}.`,
    );
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
      p.stars -= buildingCost(s, kind);
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
    const spentInsight = insightSpent(s, action.tech);
    p.stars -= researchCost(s, action.tech);
    if (s.chronicle) s.chronicle.players[s.active].insight -= spentInsight;
    p.tech.push(action.tech);
    log(s, `${factionName(s, s.active)} learned ${tech.name}.`);
  } else if (action.type === "end") {
    // Resolve only after the original owner has had an entire response turn.
    // On the final round these completions precede the score; fresh occupations do not count.
    resolveOccupations(s, s.active);
    if (s.winner !== null) return { state: s, error: null };
    if (s.active === 1) {
      // Score beacons together after both factions act, avoiding a half-turn victory race.
      for (const owner of [0, 1])
        s.players[owner].renown += s.tiles.filter(
          (t) => t.beacon && t.owner === owner && beaconActive(s, t),
        ).length;
      const [a, b] = s.players.map((p) => p.renown);
      if (Math.max(a, b) >= renownGoal(s) && a !== b) {
        const winner = a > b ? 0 : 1;
        finish(
          s,
          winner,
          `${factionName(s, winner)} united the beacons with ${s.players[winner].renown} renown.`,
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
            : `${factionName(s, winner)} prevailed after ${roundLimit(s)} rounds.`,
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
      delete unit.guarded;
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
    if (!investigationReason(s, u, "records")) {
      act({
        type: "investigate",
        unit: id,
        choice: s.players[owner].stars < 10 ? "supplies" : "records",
      });
      continue;
    }
    if (!restorationReason(s, u)) {
      act({ type: "restore", unit: id });
      continue;
    }
    if (!promotionReason(s, u, u.promotion ?? "resilience")) {
      act({ type: "promote", unit: id, choice: u.promotion ?? "resilience" });
      continue;
    }
    let enemies = targets(s, u).sort((a, b) => a.hp - b.hp);
    // Ranged armies should keep a firing lane instead of accepting free melee retaliation.
    if (
      u.type === "archer" &&
      enemies.some((v) => distance(s.tiles[u.tile], s.tiles[v.tile]) === 1)
    ) {
      const retreats = reachable(s, u)
        .map((tile) => {
          const candidate = { ...u, tile, moved: true };
          const shots = targets(s, candidate).filter(
            (v) => combatPreview(s, candidate, v).retaliation === 0,
          );
          const threatened = s.units.some(
            (v) =>
              v.owner !== owner &&
              s.explored[owner].includes(v.tile) &&
              distance(s.tiles[tile], s.tiles[v.tile]) <= unitStats(s, v).range,
          );
          return { tile, shots, threatened };
        })
        .filter((r) => r.shots.length && !r.threatened);
      if (retreats.length) {
        act({ type: "move", unit: id, tile: retreats[0].tile });
        u = s.units.find((v) => v.id === id);
        enemies = targets(s, u).sort((a, b) => a.hp - b.hp);
      }
    }
    if (u.hp <= 3 && !enemies.length) {
      act({ type: "heal", unit: id });
      continue;
    }
    if (!enemies.length) {
      const known = new Set(s.explored[owner]);
      let goals = s.tiles.filter(
        (t) =>
          known.has(t.id) &&
          (t.city || t.beacon) &&
          (t.owner !== owner ||
            t.occupation ||
            (s.chronicle &&
              t.beacon &&
              !beaconActive(s, t) &&
              s.chronicle.players[owner].fragments > 0)),
      );
      const capital = s.tiles.find((t) => t.city?.capital === owner);
      const threats = s.units.filter(
        (v) =>
          v.owner !== owner &&
          known.has(v.tile) &&
          distance(s.tiles[v.tile], capital) <= 3,
      );
      if (capital.owner === owner && threats.length && u.type !== "scout")
        goals = threats.map((v) => s.tiles[v.tile]);
      // Ships seek water firing positions; seeding a land-city distance field
      // would trap them on the first coastline and send them back and forth.
      if (UNITS[u.type].domain === "water") {
        const targetsOnShore = s.units.filter(
          (v) => v.owner !== owner && known.has(v.tile),
        );
        goals = s.tiles.filter(
          (t) =>
            t.terrain === "water" &&
            known.has(t.id) &&
            targetsOnShore.some(
              (v) => distance(t, s.tiles[v.tile]) <= unitStats(s, u).range,
            ),
        );
      }
      if (
        s.chronicle &&
        !(capital.owner === owner && threats.length && u.type !== "scout")
      ) {
        const discoveries = s.chronicle.sites
          .filter(
            (v) =>
              v.owner === null &&
              known.has(v.tile) &&
              canTraverse(s, s.tiles[v.tile], owner, u),
          )
          .map((v) => s.tiles[v.tile]);
        if (
          discoveries.length &&
          (s.chronicle.players[owner].fragments === 0 ||
            UNITS[u.type].domain === "water")
        )
          goals = discoveries;
      }
      const frontier = s.tiles.filter(
        (t) =>
          known.has(t.id) &&
          canTraverse(s, t, owner, u) &&
          neighbors(s, t).some((n) => !known.has(n.id)),
      );
      const options = reachable(s, u);
      const training =
        UNITS[u.type].domain !== "water" &&
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
          if (
            canTraverse(s, n, owner, u) &&
            known.has(n.id) &&
            !distances.has(n.id)
          ) {
            distances.set(n.id, distances.get(cur) + 1);
            queue.push(n.id);
          }
      }
      options.sort(
        (a, b) =>
          (distances.get(a) ?? 999) - (distances.get(b) ?? 999) ||
          (owner === 0 ? a - b : b - a),
      );
      const standing = s.tiles[u.tile];
      if (
        standing.beacon &&
        standing.owner === owner &&
        beaconActive(s, standing) &&
        !threats.length &&
        !goals.some((g) => g.owner !== owner) &&
        !training.length
      ) {
        act({ type: "guard", unit: id });
      } else if (options.length)
        act({ type: "move", unit: id, tile: options[0] });
      if (s.winner !== null) return s;
      u = s.units.find((v) => v.id === id);
      enemies = targets(s, u).sort((a, b) => a.hp - b.hp);
    }
    if (enemies.length)
      act({ type: "attack", unit: id, target: enemies[0].id });
    else if (!u.moved && !u.attacked) act({ type: "guard", unit: id });
  }
  for (const choice of Object.keys(COUNCIL))
    if (!councilReason(s, choice)) act({ type: "council", choice });
  // Reserve five stars for defense, buy one technology per turn, then develop.
  for (const tech of [
    "trails",
    "agriculture",
    ...(s.chronicle ? ["masonry", ...(s.round >= 4 ? ["sailing"] : [])] : []),
    ...(s.round >= 7 ? ["riding"] : []),
    ...(s.round >= 9 &&
    s.tiles.some((t) => t.city && t.owner === owner && launchTile(s, t, owner))
      ? ["sailing", "navigation", "navalgunnery"]
      : []),
    ...(s.round >= 5
      ? s.units.some((u) => u.owner === owner && u.type === "archer")
        ? ["marksmanship", "longbows"]
        : ["archery", "training", "dueling"]
      : []),
    ...(s.tiles.some((t) => t.owner === owner && climateAt(s, t) === "desert")
      ? ["agriculture", "desertfarming", "oasisengineering"]
      : []),
    ...(s.tiles.some((t) => t.owner === owner && climateAt(s, t) === "ice")
      ? ["agriculture", "icefarming", "greenhouses"]
      : []),
    ...(faction(s, owner).doctrine ? [faction(s, owner).doctrine] : []),
    ...({
      canopy: ["archery", "training"],
      ember: ["training", "tactics"],
      stone: ["engineering"],
      tide: ["irrigation", "commerce"],
      desert: ["archery", "training"],
      ice: ["engineering", "trails"],
      fire: ["training"],
      water: ["trails", "irrigation"],
      mountain: ["engineering", "trails"],
    }[factionId(s, owner)] ?? []),
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
    ...(s.units.some((u) => u.owner === owner && u.type === "archer")
      ? ["marksmanship", "longbows"]
      : ["dueling", "shielddrill"]),
    "barter",
    "caravans",
    "sailing",
    "navigation",
    "marines",
    "riding",
    "navalgunnery",
  ])
    if (
      !researchReason(s, tech) &&
      s.players[owner].stars >=
        researchCost(s, tech) + (tech === "trails" ? 4 : 5)
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
        const kind = nextBuilding(s, t);
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
    (t) => t.city && t.owner === owner && !t.occupation,
  )) {
    const army = s.units.filter((u) => u.owner === owner);
    if (army.length < Math.min(7, 2 + Math.floor(s.round / 5))) {
      const baseline =
        city.city.fortification === "workshop" && has(s, owner, "engineering")
          ? "sentinel"
          : factionId(s, owner) === "ember"
            ? s.units.filter((u) => u.owner === owner && u.type === "guardian")
                .length <
              s.units.filter((u) => u.owner === owner && u.type === "archer")
                .length
              ? "guardian"
              : "archer"
            : ["stone", "ice", "fire", "mountain"].includes(factionId(s, owner))
              ? "guardian"
              : s.players[owner].tech.includes("archery") && s.round % 3 === 0
                ? "archer"
                : s.round % 2
                  ? "scout"
                  : "guardian";
      const hasEnemyMount = s.units.some(
        (u) =>
          u.owner !== owner &&
          UNITS[u.type].mounted &&
          s.explored[owner].includes(u.tile),
      );
      const candidates = [
        ...(hasEnemyMount && !army.some((u) => u.type === "spearman")
          ? ["spearman"]
          : []),
        ...((s.round >= 9 || (s.chronicle && s.round >= 5)) &&
        army.length >= 3 &&
        army.filter((u) => UNITS[u.type].domain === "water").length < 2
          ? ["gunship", s.round % 2 ? "ship" : "cutter", "boat"]
          : []),
        ...(!army.some((u) => UNITS[u.type].mounted) ? ["camel", "rider"] : []),
        baseline,
        "guardian",
        "scout",
      ];
      const kind = candidates.find(
        (kind) => !recruitReason(s, s.tiles[city.id], kind),
      );
      if (kind) act({ type: "recruit", tile: city.id, kind });
    }
  }
  if (s.players[owner].stars >= 9) {
    const t = orderedTiles.find(
      (t) =>
        t.owner === owner &&
        !developmentReason(s, t, "improve", nextBuilding(s, t)),
    );
    if (t)
      act({
        type: "improve",
        tile: t.id,
        kind: nextBuilding(s, t),
      });
  }
  if (has(s, owner, "logistics") && s.players[owner].stars >= 7) {
    const planned = plannedTradeRoads(s, owner)[0];
    const t =
      planned !== undefined
        ? s.tiles[planned]
        : orderedTiles.find(
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
    ![1, 2, 3].includes(s.version) ||
    (s.climates !== undefined && typeof s.climates !== "boolean") ||
    (s.version < 3 && s.climates === true) ||
    (s.renownTarget !== undefined && ![12, 24].includes(s.renownTarget)) ||
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
        (p.livery === undefined || LIVERIES.includes(p.livery)) &&
        new Set(p.tech).size === p.tech.length &&
        p.tech.every((t) => Object.hasOwn(TECHS, t)),
    )
  )
    return false;
  if (
    s.version === 3 &&
    s.players.some(
      (p) =>
        !Object.hasOwn(FACTION_TYPES, p.faction) ||
        (FACTION_TYPES[p.faction].tech &&
          !p.tech.includes(FACTION_TYPES[p.faction].tech)) ||
        p.tech.some(
          (key) => TECHS[key].faction && TECHS[key].faction !== p.faction,
        ),
    )
  )
    return false;
  if (
    s.version < 3 &&
    s.players.some((p) => p.tech.some((key) => TECHS[key].faction))
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
        canTraverse(s, s.tiles[u.tile], u.owner, u) &&
        Object.hasOwn(UNITS, u.type) &&
        (s.version !== 1 || ["scout", "guardian", "archer"].includes(u.type)) &&
        (u.escort === undefined ||
          (s.version === 3 && u.escort === true && u.type === "scout")) &&
        int(u.hp, 1, s.version === 1 ? UNITS[u.type].hp : unitStats(s, u).hp) &&
        typeof u.moved === "boolean" &&
        typeof u.attacked === "boolean" &&
        (u.guarded === undefined ||
          (s.version === 3 && u.guarded === true && u.moved && u.attacked)),
    ) ||
    new Set(s.units.map((u) => u.id)).size !== s.units.length ||
    new Set(s.units.map((u) => u.tile)).size !== s.units.length
  )
    return false;
  if (s.version >= 2) {
    if (
      s.players.some((p) =>
        p.tech.some((key) =>
          prerequisites(key).some((k) => !p.tech.includes(k)),
        ),
      )
    )
      return false;
    if (
      s.units.some(
        (u) =>
          !int(u.xp, 0, 1000) ||
          !int(u.rank, 0, 2) ||
          (UNITS[u.type].domain === "water" && u.rank !== 0) ||
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
          (t.building &&
            t.terrain === "grass" &&
            climateAt(s, t) !==
              (BUILDINGS[t.building]?.climate ?? "temperate")) ||
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
    validateChronicle(s) &&
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
