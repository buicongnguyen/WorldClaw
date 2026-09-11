import { createGame, aiTurn, validateSave } from "../src/game.js";
// Deterministic regression diagnostics, not a substitute for human playtesting.
const games = Number(process.argv[2] ?? 100);
if (!Number.isInteger(games) || games < 1 || games > 10000)
  throw new Error("Choose 1–10000 games.");
const report = {
  games,
  size: 17,
  wins: [0, 0],
  draws: 0,
  totalRounds: 0,
  technologyPurchases: {},
  cityLevels: {},
  survivingVeterans: 0,
  victoryPaths: {},
};
for (let seed = 0; seed < games; seed++) {
  let s = createGame(seed, 17);
  for (let i = 0; i < 82 && s.winner === null; i++) {
    s = aiTurn(s, s.active);
    if (!validateSave(s))
      throw new Error(`Invalid state at seed ${seed}, turn ${i}`);
  }
  if (s.winner === null) throw new Error(`Non-terminating seed ${seed}`);
  if (s.winner < 0) report.draws++;
  else report.wins[s.winner]++;
  report.totalRounds += s.round;
  for (const p of s.players)
    for (const key of p.tech)
      report.technologyPurchases[key] =
        (report.technologyPurchases[key] ?? 0) + 1;
  for (const t of s.tiles.filter((t) => t.city))
    report.cityLevels[t.city.level] =
      (report.cityLevels[t.city.level] ?? 0) + 1;
  report.survivingVeterans += s.units.filter((u) => u.rank).length;
  const path = s.reason.includes("beacons")
    ? "beacons"
    : s.reason.includes("capital")
      ? "capital"
      : "round limit";
  report.victoryPaths[path] = (report.victoryPaths[path] ?? 0) + 1;
}
report.meanRounds = report.totalRounds / games;
console.log(JSON.stringify(report, null, 2));
