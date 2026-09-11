// Shared registries and derived rules: the UI and command engine use the same gates.
import { factionId } from "./factions.js";
import { climateAt } from "./climate.js";
export const TECHS = {
  dunewarfare: {
    name: "Dune Warfare",
    faction: "desert",
    requires: "training",
    cost: 12,
    branch: "Faction mastery",
    description: "Scouts gain +1 attack while standing on a meadow.",
  },
  frozenpaths: {
    name: "Frozen Paths",
    faction: "ice",
    requires: "engineering",
    cost: 12,
    branch: "Faction mastery",
    description:
      "Your units cross water at 1 movement each. Other armies cannot use your ice paths.",
  },
  rekindle: {
    name: "Rekindle",
    faction: "fire",
    requires: "training",
    cost: 12,
    branch: "Faction mastery",
    description:
      "Rest restores +2 HP, helping melee units regain their full-health attack bonus.",
  },
  oceanways: {
    name: "Oceanways",
    faction: "water",
    requires: "irrigation",
    cost: 12,
    branch: "Faction mastery",
    description:
      "Water movement costs 1 instead of 2, and units gain +1 protection while on water.",
  },
  summitguard: {
    name: "Summit Guard",
    faction: "mountain",
    requires: "engineering",
    cost: 12,
    branch: "Faction mastery",
    description: "Units gain +2 protection while standing on mountains.",
  },
  groveguard: {
    name: "Groveguard",
    faction: "canopy",
    requires: "training",
    cost: 12,
    branch: "Faction mastery",
    description: "Your units gain +1 damage protection in forests.",
  },
  firecraft: {
    name: "Firecraft",
    faction: "ember",
    requires: "tactics",
    cost: 12,
    branch: "Faction mastery",
    description:
      "Your archers gain +1 attack, including combat previews and retaliation.",
  },
  shieldwall: {
    name: "Shieldwall",
    faction: "stone",
    requires: "engineering",
    cost: 12,
    branch: "Faction mastery",
    description:
      "Guardians and sentinels gain +1 protection on friendly, uncontested land.",
  },
  granaries: {
    name: "Grand Granaries",
    faction: "tide",
    requires: "commerce",
    cost: 12,
    branch: "Faction mastery",
    description: "Farm II and Markets each produce +1 additional income.",
  },
  agriculture: {
    name: "Agriculture",
    cost: 6,
    branch: "Economy",
    description: "Build farms on meadows (+1 income).",
  },
  irrigation: {
    name: "Irrigation",
    cost: 10,
    requires: "agriculture",
    branch: "Economy",
    description: "Upgrade farms to +2 total income.",
  },
  commerce: {
    name: "Commerce",
    cost: 16,
    requires: "irrigation",
    branch: "Economy",
    description: "Markets gain +1 income; adjacent developed tiles gain +1.",
  },
  archery: {
    name: "Archery",
    cost: 7,
    branch: "Military",
    description: "Recruit archers with range two.",
  },
  training: {
    name: "Training",
    cost: 10,
    requires: "archery",
    branch: "Military",
    description: "Build barracks; train rank I veterans at 3 XP.",
  },
  tactics: {
    name: "Tactics",
    cost: 16,
    requires: "training",
    branch: "Military",
    description: "Train rank II veterans at 6 XP.",
  },
  masonry: {
    name: "Masonry",
    cost: 6,
    branch: "Infrastructure",
    description: "Owned cities provide +1 damage protection.",
  },
  engineering: {
    name: "Engineering",
    cost: 10,
    requires: "masonry",
    branch: "Infrastructure",
    description: "Strongholds, workshops, and forest lumber camps.",
  },
  logistics: {
    name: "Logistics",
    cost: 16,
    requires: "engineering",
    branch: "Infrastructure",
    description:
      "Build roads for 2 stars; connected friendly roads cost half a movement point.",
  },
  trails: {
    name: "Trailcraft",
    cost: 8,
    branch: "Exploration",
    description:
      "Units gain one movement point. Starting scout escorts already have this training (3 movement).",
  },
  marksmanship: {
    name: "Marksmanship",
    requires: "archery",
    cost: 10,
    branch: "Ranged combat",
    description:
      "Archers gain +1 attack at distance 2 or more, scaled by remaining health.",
  },
  longbows: {
    name: "Longbows",
    requires: "marksmanship",
    cost: 16,
    branch: "Ranged combat",
    description:
      "Archers can shoot 3 tiles before moving; after moving their range stays 2.",
  },
  dueling: {
    name: "Dueling",
    requires: "training",
    cost: 10,
    branch: "Melee combat",
    description: "Melee units gain +1 attack.",
  },
  shielddrill: {
    name: "Shield Drill",
    requires: "dueling",
    cost: 14,
    branch: "Melee combat",
    description:
      "Guardians and sentinels resist 1 extra damage from melee attacks.",
  },
  sailing: {
    name: "Sailing",
    requires: "trails",
    cost: 10,
    branch: "Seafaring",
    description: "All units may enter water at 2 movement per tile.",
  },
  navigation: {
    name: "Navigation",
    requires: "sailing",
    cost: 14,
    branch: "Seafaring",
    description: "Water movement costs 1.",
  },
  marines: {
    name: "Marines",
    requires: "navigation",
    cost: 14,
    branch: "Seafaring",
    description:
      "Remove the -1 damage penalty when attacking across a shoreline in either direction.",
  },
  barter: {
    name: "Barter",
    requires: "agriculture",
    cost: 8,
    branch: "Trade",
    description: "Markets produce +1 income.",
  },
  caravans: {
    name: "Caravans",
    requires: "barter",
    requiresAll: ["logistics"],
    cost: 12,
    branch: "Trade",
    description:
      "Each city linked to another city by friendly roads earns +2 income. Enemy units and occupation interrupt routes.",
  },
  desertfarming: {
    name: "Desert Farming",
    requires: "agriculture",
    cost: 8,
    branch: "Climate farming",
    description: "Build Oasis I on desert meadows: 5 stars, +1 income.",
  },
  oasisengineering: {
    name: "Oasis Engineering",
    requires: "desertfarming",
    cost: 12,
    branch: "Climate farming",
    description: "Upgrade an oasis for 6 stars to +2 base income.",
  },
  icefarming: {
    name: "Ice Farming",
    requires: "agriculture",
    cost: 8,
    branch: "Climate farming",
    description: "Build Ice Farm I on frozen meadows: 5 stars, +1 income.",
  },
  greenhouses: {
    name: "Greenhouses",
    requires: "icefarming",
    cost: 12,
    branch: "Climate farming",
    description:
      "Upgrade an ice farm to a heated greenhouse for 6 stars: +2 base income.",
  },
};
export const BUILDINGS = {
  oasis: {
    name: "Oasis I",
    cost: 5,
    income: 1,
    requires: "desertfarming",
    terrain: "grass",
    climate: "desert",
    model: "farm",
  },
  oasis2: {
    name: "Oasis II",
    cost: 6,
    income: 2,
    requires: "oasisengineering",
    terrain: "grass",
    climate: "desert",
    from: ["oasis"],
    model: "farm2",
  },
  icefarm: {
    name: "Ice Farm I",
    cost: 5,
    income: 1,
    requires: "icefarming",
    terrain: "grass",
    climate: "ice",
    model: "farm",
  },
  greenhouse: {
    name: "Heated Greenhouse",
    cost: 6,
    income: 2,
    requires: "greenhouses",
    terrain: "grass",
    climate: "ice",
    from: ["icefarm"],
    model: "farm2",
  },
  estate: { name: "Estate", cost: 4, income: 1 }, // Existing estates remain productive.
  farm: {
    name: "Farm I",
    cost: 4,
    income: 1,
    requires: "agriculture",
    terrain: "grass",
  },
  farm2: {
    name: "Farm II",
    cost: 5,
    income: 2,
    requires: "irrigation",
    terrain: "grass",
    from: ["farm", "estate"],
  },
  lumber: {
    name: "Lumber camp",
    cost: 4,
    income: 1,
    requires: "engineering",
    terrain: "forest",
  },
};
export const SPECIALIZATIONS = {
  market: {
    name: "Market",
    level: 2,
    description: "+2 city income",
    requires: "agriculture",
  },
  barracks: {
    name: "Barracks",
    level: 2,
    description: "Train veterans",
    requires: "training",
  },
  walls: {
    name: "Walls",
    level: 3,
    description: "+2 city protection",
    requires: "engineering",
  },
  workshop: {
    name: "Workshop",
    level: 3,
    description: "Recruit sentinels",
    requires: "engineering",
  },
};
export const has = (s, owner, tech) => s.players[owner].tech.includes(tech);
export const prerequisites = (key) =>
  [TECHS[key]?.requires, ...(TECHS[key]?.requiresAll ?? [])].filter(Boolean);
export const researchCost = (s, key, owner = s.active) =>
  TECHS[key].cost -
  ((factionId(s, owner) === "desert" &&
    ["desertfarming", "oasisengineering"].includes(key)) ||
  (factionId(s, owner) === "ice" && ["icefarming", "greenhouses"].includes(key))
    ? 2
    : 0);
export function nextBuilding(s, t) {
  if (t.building === "oasis") return "oasis2";
  if (t.building === "icefarm") return "greenhouse";
  if (["farm", "estate"].includes(t.building)) return "farm2";
  if (t.terrain === "forest") return "lumber";
  return { desert: "oasis", ice: "icefarm", temperate: "farm" }[
    climateAt(s, t)
  ];
}
export const buildingCost = (s, kind, owner = s.active) =>
  BUILDINGS[kind].cost -
  (kind === "farm" && factionId(s, owner) === "tide" ? 1 : 0);
export const contested = (s, tile) =>
  !!(
    tile.occupation ||
    (tile.territory !== null && s.tiles[tile.territory]?.occupation)
  );
export function researchReason(s, key) {
  const def = Object.hasOwn(TECHS, key) ? TECHS[key] : null;
  if (!def) return "Unknown technology.";
  if (def.faction && def.faction !== factionId(s, s.active))
    return "Exclusive to another faction.";
  if (has(s, s.active, key)) return "Already learned.";
  const missing = prerequisites(key).filter((k) => !has(s, s.active, k));
  if (missing.length)
    return `Requires ${missing.map((k) => TECHS[k].name).join(" + ")}.`;
  const cost = researchCost(s, key);
  return s.players[s.active].stars < cost ? `Needs ${cost} stars.` : "";
}
export function developmentReason(s, t, type, kind) {
  const p = s.players[s.active];
  if (
    !t ||
    t.owner !== s.active ||
    t.beacon ||
    !["grass", "forest"].includes(t.terrain)
  )
    return "Choose land you control.";
  if (
    contested(s, t) ||
    s.units.some((u) => u.tile === t.id && u.owner !== s.active)
  )
    return "Enemy occupation blocks development.";
  let cost;
  if (type === "upgrade" || type === "specialize") {
    const def = Object.hasOwn(SPECIALIZATIONS, kind)
      ? SPECIALIZATIONS[kind]
      : null;
    if (
      !t.city ||
      !def ||
      (type === "upgrade"
        ? t.city.level + 1 !== def.level
        : t.city.level < def.level ||
          t.city[def.level === 2 ? "specialization" : "fortification"] !== null)
    )
      return "Choose an available city specialization.";
    if (!has(s, s.active, def.requires))
      return `Requires ${TECHS[def.requires].name}.`;
    if (
      type === "upgrade" &&
      t.city.level === 1 &&
      s.tiles.filter(
        (n) => n.territory === t.id && n.owner === s.active && n.improved,
      ).length < 2
    )
      return "Develop two tiles in this city's territory first.";
    cost = def.level === 2 ? 6 : 12;
  } else if (type === "road") {
    if (t.road) return "Road already built.";
    if (!has(s, s.active, "logistics")) return "Requires Logistics.";
    cost = 2;
  } else {
    const def = Object.hasOwn(BUILDINGS, kind) ? BUILDINGS[kind] : null;
    if (!def || kind === "estate" || t.city || t.terrain !== def.terrain)
      return "Choose a compatible farm or lumber camp.";
    if (!has(s, s.active, def.requires))
      return `Requires ${TECHS[def.requires].name}.`;
    if (def.from ? !def.from.includes(t.building) : t.improved)
      return "This building cannot be developed further.";
    if (
      t.terrain === "grass" &&
      climateAt(s, t) !== (def.climate ?? "temperate")
    )
      return `Requires a ${def.climate ?? "temperate"} meadow and its matching farming branch.`;
    cost = buildingCost(s, kind);
  }
  return p.stars < cost ? `Needs ${cost} stars.` : "";
}
export function promotionReason(s, u, choice) {
  if (!u || u.owner !== s.active) return "Select your unit.";
  if (!["mobility", "resilience"].includes(choice))
    return "Choose mobility or resilience.";
  const rank = u.rank ?? 0,
    t = s.tiles[u.tile];
  if (rank >= 2) return "Maximum veteran rank.";
  if (rank && u.promotion !== choice)
    return "Continue your existing specialization.";
  if (!has(s, u.owner, rank ? "tactics" : "training"))
    return `Requires ${rank ? "Tactics" : "Training"}.`;
  if ((u.xp ?? 0) < (rank ? 6 : 3)) return `Needs ${rank ? 6 : 3} XP.`;
  if (
    t.owner !== u.owner ||
    t.city?.specialization !== "barracks" ||
    contested(s, t)
  )
    return "Train at a friendly, uncontested barracks.";
  if (u.moved || u.attacked) return "Training requires an unused turn.";
  return s.players[u.owner].stars < (rank ? 7 : 4)
    ? `Needs ${rank ? 7 : 4} stars.`
    : "";
}
export function assignTerritories(s, preserve = false) {
  const cities = s.tiles.filter((t) => t.city);
  for (const t of s.tiles) {
    t.territory = null;
    if (t.city || t.beacon || !["grass", "forest"].includes(t.terrain))
      continue;
    const candidates =
      preserve && t.owner !== null && cities.some((c) => c.owner === t.owner)
        ? cities.filter((c) => c.owner === t.owner)
        : cities;
    t.territory = [...candidates].sort(
      (a, b) =>
        Math.abs(t.x - a.x) +
          Math.abs(t.z - a.z) -
          (Math.abs(t.x - b.x) + Math.abs(t.z - b.z)) ||
        (t.id < s.tiles.length / 2 ? a.id - b.id : b.id - a.id),
    )[0].id;
  }
}
export function migrateSave(raw) {
  const s = structuredClone(raw);
  if (s.version === 3) return s;
  if (s.version === 2) {
    s.version = 3;
    for (const p of s.players) p.faction = "classic";
    return s;
  }
  if (s.version !== 1) return s;
  s.version = 2;
  for (const t of s.tiles) {
    t.building = t.improved ? "estate" : null;
    t.road = false;
    t.occupation = null;
    if (t.city) {
      t.city.specialization = null;
      t.city.fortification = null;
    }
  }
  for (const u of s.units)
    Object.assign(u, { xp: 0, rank: 0, promotion: null });
  assignTerritories(s, true);
  return migrateSave(s);
}
