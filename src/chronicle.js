// Story definitions and pure derived rules. Never award rewards from rendering.
import { factionId } from "./factions.js";
import { NAVAL_ROLES } from "./appearance.js";

export const STORY_ASSETS = [
  "meridian_archive",
  "meridian_wreck",
  "meridian_dormant",
];
export const STORY_TITLE = "The Broken Meridian";
export const PROLOGUE =
  "On the Night of Glass, the Meridian shattered. Winter entered summer; the sea swallowed roads. Now the Verdant Reach has risen with three surviving beacons. You and a rival expedition have arrived to decide who carries the next dawn. Recover the lost agreements before you restore the machine.";
export const TRIBE_STORIES = {
  canopy:
    "Your Covenant remembers a time when every river had a keeper. Restore the watershed without replacing living knowledge with a throne of brass.",
  ember:
    "Your Court guarded the libraries—and took the blame when the lights failed. Recover the records that can clear your people's name before fear burns the last copies.",
  stone:
    "Your Clans have buried too many families beneath other rulers' promises. Build foundations, and a council, that can bear the weight of the next winter.",
  tide: "Your League carried grain and medicine between strangers. Reopen the routes before emergency blockades become permanent borders.",
  desert:
    "Your Sunstriders saved seeds by carrying them through drought. No distant crown should decide whose oasis deserves another spring.",
  ice: "Your Frostborn kept names and seeds beneath the snow. Bring home those stranded beyond the thaw, without letting restoration erase the knowledge that saved them.",
  fire: "Your Ashen furnaces can make ploughs as readily as blades. Win a future in which your people are needed after the war is over.",
  water:
    "Your Reefwalkers remember the names beneath the drowned harbors. Recover those names, and keep the sea from becoming another ruler's wall.",
  mountain:
    "Your Skypeak observatories saw the warning before the Night of Glass. Preserve the instruments—and build a council willing to listen next time.",
  classic:
    "Your expedition carries people from every broken shore. What you preserve matters as much as what you conquer.",
};
export const DISCOVERIES = {
  supplies: {
    name: "Rescue the supplies",
    detail: "+1 fragment, +1 XP, +6 stars",
    stars: 6,
    insight: 0,
    text: "Ilyan opens the sealed stores. There is enough grain here to make tomorrow a little less frightening.",
  },
  records: {
    name: "Preserve the records",
    detail: "+1 fragment, +1 XP, +4 research insight",
    stars: 0,
    insight: 4,
    text: "Mara reads the last instruction: ‘Let no crown outlive the hands that carry it.’ The council severed the network to stop one ruler controlling every season.",
  },
  charts: {
    name: "Follow the lost charts",
    detail: "+1 fragment, +1 XP; reveal tiles within distance 4",
    stars: 0,
    insight: 0,
    text: "The maps show no royal borders—only paths between communities. Your cartographers mark the surviving routes.",
  },
};
export const COUNCIL = {
  bread: {
    chapter: 0,
    name: "Bread before crowns",
    requirement: "Own two improved, uncontested tiles",
    stars: 10,
    insight: 0,
    renown: 0,
    ending: "You made the first promise with bread, not a banner.",
    text: "Ilyan: ‘These stores belong to the households that filled them.’ The council releases ten stars to sustain the settlement.",
  },
  memory: {
    chapter: 0,
    name: "Read the drowned",
    requirement: "Recover one archive or wreck",
    stars: 6,
    insight: 2,
    renown: 0,
    ending: "You taught the expedition to remember before it judged.",
    text: "Mara lays the recovered names beside the maps. Six stars and two insight support a new school of keepers.",
  },
  homes: {
    chapter: 1,
    name: "A harbor for every home",
    requirement: "Own two uncontested cities; at least one level II",
    stars: 12,
    insight: 0,
    renown: 0,
    ending:
      "Your settlements became places where strangers could put down their tools.",
    text: "Delegates arrive from the second settlement. The council grants twelve stars to build a realm that can survive its founder.",
  },
  sea: {
    chapter: 1,
    name: "No sea is a border",
    requirement: "Own a naval unit and recover a shipwreck",
    stars: 10,
    insight: 4,
    renown: 0,
    ending: "You reopened the sea as a road, not a wall.",
    text: "A ship carries the drowned harbor's bell home. Ten stars and four insight are pledged to keeping the passage open.",
  },
  covenant: {
    chapter: 2,
    name: "The open covenant",
    requirement: "Own two restored beacons and recover two sites",
    stars: 0,
    insight: 0,
    renown: 6,
    ending:
      "The restored agreements put the Meridian in many hands, not one crown.",
    text: "Mara reads the completed agreement aloud. The council recognizes six renown; the rival still receives its normal turn to answer.",
  },
  keepers: {
    chapter: 2,
    name: "Keepers, not kings",
    requirement: "Know Engineering and Tactics; own three improved tiles",
    stars: 12,
    insight: 0,
    renown: 4,
    ending:
      "You founded an order of keepers answerable to the people who feed it.",
    text: "Ilyan sets his sword outside the council door. Twelve stars and four renown support institutions stronger than any one commander.",
  },
};
export const CHAPTERS = [
  "I · A fire to gather around",
  "II · The distance between us",
  "III · Who carries the dawn?",
];
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
const contested = (s, t) =>
  !!(
    t.occupation ||
    (t.territory !== null && s.tiles[t.territory]?.occupation)
  );
function landDistances(s, start) {
  const result = new Map([[start, 0]]),
    queue = [start],
    size = s.size ?? 11;
  for (let i = 0; i < queue.length; i++)
    for (const id of [
      queue[i] - 1,
      queue[i] + 1,
      queue[i] - size,
      queue[i] + size,
    ]) {
      const t = s.tiles[id];
      if (
        t &&
        ["grass", "forest"].includes(t.terrain) &&
        distance(t, s.tiles[queue[i]]) === 1 &&
        !result.has(id)
      ) {
        result.set(id, result.get(queue[i]) + 1);
        queue.push(id);
      }
    }
  return result;
}
export function canonicalSites(s) {
  const size = s.size ?? 11,
    last = s.tiles.length - 1;
  const capitals = [0, 1].map((owner) =>
    s.tiles.find((t) => t.city?.capital === owner),
  );
  const routes = capitals.map((t) => landDistances(s, t.id));
  const candidates = s.tiles.filter(
    (t) =>
      t.terrain === "grass" &&
      !t.city &&
      !t.beacon &&
      t.id !== last - t.id &&
      routes[0].has(t.id) &&
      routes[1].has(last - t.id) &&
      distance(t, capitals[0]) > 2 &&
      distance(t, capitals[1]) > 2,
  );
  const sites = [];
  for (const depth of [4, size === 17 ? 8 : 6]) {
    const sorted = candidates
      .filter(
        (t) => !sites.some((v) => v.tile === t.id || v.tile === last - t.id),
      )
      .sort(
        (a, b) =>
          Math.abs(routes[0].get(a.id) - depth) -
            Math.abs(routes[0].get(b.id) - depth) ||
          distance(b, capitals[1]) - distance(a, capitals[1]) ||
          a.id - b.id,
      );
    const chosen =
      sorted.find((t) =>
        sites.every((v) => distance(s.tiles[v.tile], t) >= 3),
      ) ?? sorted[0];
    if (!chosen) throw new Error("Map has no room for the mirrored archives");
    for (const tile of [chosen.id, last - chosen.id])
      sites.push({ tile, kind: "archive", owner: null, choice: null });
  }
  const water = (capitals[0].z - 2) * size;
  for (const tile of [water, last - water])
    sites.push({ tile, kind: "wreck", owner: null, choice: null });
  return sites;
}
export function createChronicle(s) {
  return {
    version: 1,
    sites: canonicalSites(s),
    restored: [],
    players: [0, 1].map(() => ({ fragments: 0, insight: 0, choices: [] })),
  };
}
export const siteAt = (s, tile) =>
  s.chronicle?.sites.find((v) => v.tile === tile);
export const beaconActive = (s, t) =>
  !s.chronicle || s.chronicle.restored.some((v) => v.tile === t.id);
export const recoveredSites = (s, owner) =>
  s.chronicle?.sites.filter((v) => v.owner === owner) ?? [];
export function investigationReason(s, u, choice) {
  if (!s.chronicle)
    return "Start a Broken Meridian expedition to recover archives.";
  if (!u || u.owner !== s.active) return "Select your unit.";
  if (!Object.hasOwn(DISCOVERIES, choice))
    return "Choose supplies, records or charts.";
  const site = siteAt(s, u.tile);
  if (!site || !s.explored[u.owner].includes(u.tile))
    return "Stand on a charted archive or shipwreck.";
  if (site.owner !== null) return "This site has already been recovered.";
  if (site.kind === "wreck" && !s.players[u.owner].tech.includes("sailing"))
    return "Requires Sailing for salvage equipment, even for native water-crossing tribes.";
  if (u.moved || u.attacked) return "Investigation requires an unused turn.";
  return "";
}
export function restorationReason(s, u) {
  if (!s.chronicle) return "Skirmish beacons are already active.";
  if (!u || u.owner !== s.active) return "Select your unit.";
  const t = s.tiles[u.tile];
  if (!t.beacon || t.owner !== u.owner) return "Stand on a beacon you control.";
  if (beaconActive(s, t)) return "This beacon is already restored.";
  if (u.moved || u.attacked) return "Restoration requires an unused turn.";
  if (!s.players[u.owner].tech.includes("masonry")) return "Requires Masonry.";
  if (s.chronicle.players[u.owner].fragments < 1)
    return "Recover an archive or wreck for a Meridian fragment.";
  return s.players[u.owner].stars < 4 ? "Needs 4 stars." : "";
}
export function councilProgress(s, owner = s.active) {
  const cities = s.tiles.filter(
    (t) => t.city && t.owner === owner && !contested(s, t),
  );
  return {
    improved: s.tiles.filter(
      (t) => t.owner === owner && t.improved && !contested(s, t),
    ).length,
    sites: recoveredSites(s, owner).length,
    wrecks: recoveredSites(s, owner).filter((t) => t.kind === "wreck").length,
    cities: cities.length,
    developed: cities.filter((t) => t.city.level >= 2).length,
    navy: s.units.filter(
      (u) => u.owner === owner && NAVAL_ROLES.includes(u.type),
    ).length,
    beacons: s.tiles.filter(
      (t) => t.beacon && t.owner === owner && beaconActive(s, t),
    ).length,
  };
}
export function councilReason(s, key, owner = s.active) {
  if (!s.chronicle)
    return "Start a Broken Meridian expedition to convene the council.";
  if (!Object.hasOwn(COUNCIL, key)) return "Unknown council resolution.";
  const def = COUNCIL[key],
    chosen = s.chronicle.players[owner].choices;
  if (chosen.length !== def.chapter)
    return chosen.length > def.chapter
      ? "This chapter is already resolved."
      : "Resolve the preceding chapter first.";
  const p = councilProgress(s, owner),
    tech = s.players[owner].tech;
  const met = {
    bread: p.improved >= 2,
    memory: p.sites >= 1,
    homes: p.cities >= 2 && p.developed >= 1,
    sea: p.navy >= 1 && p.wrecks >= 1,
    covenant: p.beacons >= 2 && p.sites >= 2,
    keepers:
      tech.includes("engineering") &&
      tech.includes("tactics") &&
      p.improved >= 3,
  };
  return met[key] ? "" : def.requirement + ".";
}
export function epilogue(s, owner = 0) {
  if (!s.chronicle) return "";
  const ending =
    s.winner === -1
      ? "Neither expedition could claim the dawn alone. The unfinished agreement remains between you."
      : s.winner !== owner
        ? "Your expedition did not take the Meridian. But the names you carried home will outlast this defeat."
        : s.reason.includes("capital")
          ? "Your banners fly over the rival capital. Ilyan orders the stores opened to both peoples. Victory can compel silence; peace will still need consent."
          : "The beacons answer one another across the Reach. Mara closes the old book and opens a blank one: the next agreement belongs to the living.";
  return [
    ending,
    ...s.chronicle.players[owner].choices.map((key) => COUNCIL[key].ending),
    TRIBE_STORIES[factionId(s, owner)],
  ].join(" ");
}
export function validateChronicle(s) {
  if (s.chronicle === undefined) return true;
  const c = s.chronicle;
  if (
    s.version !== 3 ||
    !c ||
    c.version !== 1 ||
    !Array.isArray(c.sites) ||
    c.sites.length !== 6 ||
    !Array.isArray(c.restored) ||
    c.restored.length > 3 ||
    !Array.isArray(c.players) ||
    c.players.length !== 2
  )
    return false;
  const canonical = canonicalSites(s);
  if (
    c.sites.some(
      (v, i) =>
        !v ||
        v.tile !== canonical[i].tile ||
        v.kind !== canonical[i].kind ||
        ![null, 0, 1].includes(v.owner) ||
        (v.owner === null
          ? v.choice !== null
          : !Object.hasOwn(DISCOVERIES, v.choice)),
    )
  )
    return false;
  if (
    new Set(c.restored.map((v) => v?.tile)).size !== c.restored.length ||
    c.restored.some(
      (v) =>
        !v ||
        !Number.isInteger(v.tile) ||
        !s.tiles[v.tile]?.beacon ||
        ![0, 1].includes(v.owner) ||
        !s.players[v.owner].tech.includes("masonry"),
    )
  )
    return false;
  return c.players.every((p, owner) => {
    if (
      !p ||
      !Array.isArray(p.choices) ||
      p.choices.length > 3 ||
      p.choices.some(
        (key, i) => !Object.hasOwn(COUNCIL, key) || COUNCIL[key].chapter !== i,
      )
    )
      return false;
    const recovered = recoveredSites(s, owner),
      spent = c.restored.filter((v) => v.owner === owner).length;
    if (
      recovered.some((v) => v.kind === "wreck") &&
      !s.players[owner].tech.includes("sailing")
    )
      return false;
    const earned =
      recovered.reduce((n, v) => n + DISCOVERIES[v.choice].insight, 0) +
      p.choices.reduce((n, k) => n + COUNCIL[k].insight, 0);
    return (
      Number.isInteger(p.fragments) &&
      p.fragments >= 0 &&
      p.fragments === recovered.length - spent &&
      Number.isInteger(p.insight) &&
      p.insight >= 0 &&
      p.insight <= earned
    );
  });
}
