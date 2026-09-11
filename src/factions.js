// Factions are gameplay identities; owner 0/1 still identifies the two turn-taking teams.
export const FACTION_TYPES = {
  desert: {
    name: "Desert · Sunstrider Tribe",
    emblem: "☼",
    color: 0xe3bb60,
    unit: "scout",
    tech: "trails",
    trait:
      "Rest restores +2 HP on meadows. Desert farming research costs 2 fewer stars per skill.",
    doctrine: "dunewarfare",
    style: "Mobile open-ground warfare",
  },
  ice: {
    name: "Ice · Frostborn Tribe",
    emblem: "❄",
    color: 0xd8edf0,
    unit: "guardian",
    tech: "masonry",
    trait:
      "Units gain +1 protection on meadows. Ice farming research costs 2 fewer stars per skill.",
    doctrine: "frozenpaths",
    style: "Defend, then cross frozen seas",
  },
  fire: {
    name: "Fire · Ashen Tribe",
    emblem: "♨",
    color: 0xef493e,
    unit: "guardian",
    tech: "archery",
    trait: "Full-health melee units gain +1 attack.",
    doctrine: "rekindle",
    style: "Strike hard and recover",
  },
  water: {
    name: "Water · Reefwalker Tribe",
    emblem: "≋",
    color: 0x388dee,
    unit: "scout",
    tech: "agriculture",
    trait: "All units cross water at 2 movement per tile.",
    doctrine: "oceanways",
    style: "Amphibious exploration and flanking",
  },
  mountain: {
    name: "Mountain · Skypeak Tribe",
    emblem: "△",
    color: 0xab80bc,
    unit: "guardian",
    tech: "masonry",
    trait: "All units cross mountain tiles at 1 movement each.",
    doctrine: "summitguard",
    style: "Mountain routes and strong defenses",
  },
  classic: {
    name: "Classic expedition",
    emblem: "♜",
    unit: "scout",
    tech: null,
    trait: "Original rules: no faction bonuses.",
    doctrine: null,
  },
  canopy: {
    name: "Canopy Covenant",
    emblem: "♧",
    color: 0x69b997,
    unit: "scout",
    tech: "trails",
    trait: "Scouts reveal land four tiles away instead of three.",
    doctrine: "groveguard",
    style: "Explore and hold forests",
  },
  ember: {
    name: "Ember Court",
    emblem: "☀",
    color: 0xdf805d,
    unit: "archer",
    tech: "archery",
    trait: "Surviving units earn +1 extra XP when they defeat an enemy.",
    doctrine: "firecraft",
    style: "Ranged warfare and veterans",
  },
  stone: {
    name: "Stoneward Clans",
    emblem: "♜",
    color: 0x9caacc,
    unit: "guardian",
    tech: "masonry",
    trait: "Rest heals +1 HP on friendly, uncontested land.",
    doctrine: "shieldwall",
    style: "Defense and durable armies",
  },
  tide: {
    name: "Tidewell League",
    emblem: "≈",
    color: 0x6dbbda,
    unit: "scout",
    tech: "agriculture",
    trait: "Farm I costs 3 stars instead of 4.",
    doctrine: "granaries",
    style: "Farming and city development",
  },
};
export const PLAYABLE_FACTIONS = Object.keys(FACTION_TYPES).filter(
  (key) => key !== "classic",
);
export const factionId = (s, owner) =>
  s.version >= 3 ? s.players[owner].faction : "classic";
export const faction = (s, owner) =>
  FACTION_TYPES[factionId(s, owner)] ?? FACTION_TYPES.classic;
export const factionName = (s, owner) =>
  factionId(s, owner) === "classic"
    ? ["Canopy Covenant", "Ember Court"][owner]
    : faction(s, owner).name;
export function armyColor(s, owner) {
  const id = factionId(s, owner);
  // Mirror matches remain distinguishable by team, even with the same chosen faction.
  if (id === "classic" || id === factionId(s, 1 - owner))
    return [0x75e4c0, 0xed9375][owner];
  return faction(s, owner).color;
}
