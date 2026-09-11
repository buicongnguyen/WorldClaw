import { PLAYABLE_FACTIONS, factionId } from "./factions.js";
export const UNIT_ROLES = [
  "scout",
  "guardian",
  "archer",
  "sentinel",
  "spearman",
  "rider",
  "camel",
  "boat",
  "ship",
  "gunship",
  "cutter",
];
export const NAVAL_ROLES = ["boat", "ship", "gunship", "cutter"];
export const MOUNT_ROLES = ["rider", "camel"];
export const LIVERIES = ["auto", "field", "veteran", "ceremonial"];
export const ARMY_ASSETS = [
  ...UNIT_ROLES.map((k) => "unit_" + k),
  ...PLAYABLE_FACTIONS.flatMap((t) =>
    ["field", "veteran", "ceremonial"].flatMap((v) => [
      "outfit_" + t + "_" + v,
      "prow_" + t + "_" + v,
    ]),
  ),
];
export function appearanceFor(s, u) {
  const identity = factionId(s, u.owner),
    tribe =
      identity === "classic" ? (u.owner === 0 ? "canopy" : "ember") : identity;
  const choice = s.players[u.owner].livery ?? "auto";
  const style =
    choice === "auto"
      ? ["field", "veteran", "ceremonial"][u.rank ?? 0]
      : choice;
  const naval = NAVAL_ROLES.includes(u.type),
    embarked = !naval && s.tiles[u.tile].terrain === "water";
  return {
    tribe,
    style,
    naval,
    embarked,
    body: "unit_" + (embarked ? "boat" : u.type),
    outfit: "outfit_" + tribe + "_" + style,
    prow: "prow_" + tribe + "_" + style,
    mounted: MOUNT_ROLES.includes(u.type),
    skin: u.id % 3,
  };
}
