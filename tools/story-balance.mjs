// Same policies/seeds/positions on both rule sets; measures pacing, not human fun.
import { createGame, aiTurn, validateSave } from "../src/game.js";
import { PLAYABLE_FACTIONS } from "../src/factions.js";
import { NAVAL_ROLES } from "../src/appearance.js";
import { writeFileSync } from "node:fs";
const seeds = (process.env.BALANCE_SEEDS ?? "417,91,2026")
  .split(",")
  .map(Number);
const result = { seeds, reports: {} };
for (const chronicle of [false, true]) {
  const report = {
    matches: 0,
    rounds: 0,
    techs: 0,
    navalMatches: 0,
    discoveries: 0,
    restorations: 0,
    chapters: 0,
    wins: Object.fromEntries(PLAYABLE_FACTIONS.map((k) => [k, 0])),
    draws: 0,
  };
  for (const size of [11, 17])
    for (const seed of seeds)
      for (const a of PLAYABLE_FACTIONS)
        for (const b of PLAYABLE_FACTIONS) {
          if (a === b) continue;
          let s = createGame(seed, size, [a, b], {
              climates: true,
              balancedStart: true,
              chronicle,
            }),
            turns = 0,
            navy = false;
          while (s.winner === null && turns++ < 82) {
            s = aiTurn(s, s.active);
            navy ||= s.units.some((u) => NAVAL_ROLES.includes(u.type));
            if (!validateSave(s))
              throw Error(`Invalid ${chronicle}/${seed}/${a}/${b}/${turns}`);
          }
          if (s.winner === null) throw Error("Non-terminating match");
          report.matches++;
          report.rounds += s.round;
          report.techs += s.players.reduce((n, p) => n + p.tech.length, 0);
          report.navalMatches += Number(navy);
          if (s.winner === -1) report.draws++;
          else report.wins[[a, b][s.winner]]++;
          if (s.chronicle) {
            report.discoveries += s.chronicle.sites.filter(
              (v) => v.owner !== null,
            ).length;
            report.restorations += s.chronicle.restored.length;
            report.chapters += s.chronicle.players.reduce(
              (n, p) => n + p.choices.length,
              0,
            );
          }
        }
  report.meanRounds = Number((report.rounds / report.matches).toFixed(2));
  report.meanTechsPerPlayer = Number(
    (report.techs / (report.matches * 2)).toFixed(2),
  );
  report.navalMatchPercent = Number(
    ((100 * report.navalMatches) / report.matches).toFixed(1),
  );
  result.reports[chronicle ? "story" : "skirmish"] = report;
  console.log(chronicle ? "STORY" : "SKIRMISH", JSON.stringify(report));
}
writeFileSync(
  new URL(
    process.env.BALANCE_HOLDOUT === "1"
      ? "../docs/story-balance-holdout.json"
      : "../docs/story-balance.json",
    import.meta.url,
  ),
  JSON.stringify(result, null, 2) + "\n",
);
