import { createGame, aiTurn } from "../src/game.js";
import { PLAYABLE_FACTIONS } from "../src/factions.js";
const results = Object.fromEntries(
  PLAYABLE_FACTIONS.map((k) => [k, { games: 0, wins: 0, draws: 0 }]),
);
let matches = 0,
  rounds = 0;
const seeds = (process.env.BALANCE_SEEDS ?? "417,91,2026")
  .split(",")
  .map(Number);
for (const size of [11, 17])
  for (const seed of seeds)
    for (const a of PLAYABLE_FACTIONS)
      for (const b of PLAYABLE_FACTIONS) {
        if (a === b) continue;
        let s = createGame(seed, size, [a, b], {
            climates: true,
            balancedStart: true,
          }),
          turns = 0;
        while (s.winner === null && turns++ < 90) s = aiTurn(s, s.active);
        if (s.winner === null) throw new Error("Stalled match");
        matches++;
        rounds += s.round;
        for (const k of [a, b]) results[k].games++;
        if (s.winner === -1) {
          results[a].draws++;
          results[b].draws++;
        } else results[[a, b][s.winner]].wins++;
      }
console.log(
  JSON.stringify(
    { matches, meanRounds: Math.round((rounds / matches) * 10) / 10, results },
    null,
    2,
  ),
);
