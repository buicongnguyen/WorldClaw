import {
  TECHS,
  prerequisites,
  researchReason,
  researchCost,
} from "./progression.js";
import { factionId } from "./factions.js";
export function skillMap(s) {
  const groups = new Map();
  for (const [key, def] of Object.entries(TECHS)) {
    if (def.faction && def.faction !== factionId(s, 0)) continue;
    const group = def.faction
      ? "Tribe mastery"
      : ["archery", "marksmanship", "longbows"].includes(key)
        ? "Ranged combat"
        : ["training", "tactics", "dueling", "shielddrill"].includes(key)
          ? "Melee combat"
          : def.branch;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push([key, def]);
  }
  return `<p class="skill-legend">● Learned · ◇ Available · ○ Locked. Arrows link to prerequisites; some skills need two parents. All branches remain learnable.</p><div class="skill-map">${[
    ...groups,
  ]
    .map(
      ([name, nodes]) =>
        `<section class="skill-branch" aria-label="${name}"><h3>${name}</h3><div class="tech-list">${nodes
          .map(([key, def]) => {
            const learned = s.players[0].tech.includes(key),
              reason = researchReason(s, key),
              available = !reason;
            return `<article id="skill-${key}" class="skill-node ${learned ? "learned" : available ? "available" : "locked"}"><span class="tech-icon" aria-hidden="true">${learned ? "●" : available ? "◇" : "○"}</span><div><small class="skill-parents">${
              prerequisites(key)
                .map((k) => `<a href="#skill-${k}">${TECHS[k].name}</a>`)
                .join(" + ") || "Foundation"
            } →</small><h3>${def.name}</h3><p>${def.description}</p><small class="action-reason">${reason || "Available to learn"}${researchCost(s, key, 0) < def.cost ? " · Native climate discount" : ""}</small></div><button data-tech="${key}" ${reason || s.active !== 0 || s.winner !== null ? "disabled" : ""}>${learned ? "Learned" : `✦ ${researchCost(s, key, 0)}`}</button></article>`;
          })
          .join("")}</div></section>`,
    )
    .join("")}</div>`;
}
