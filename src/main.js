import "./style.css";
import {
  createGame,
  command,
  aiTurn,
  income,
  unitAt,
  UNITS,
  TECHS,
  FACTIONS,
  GOAL,
  reachable,
  targets,
  combatPreview,
  validateSave,
  mapSize,
  roundLimit,
  unitStats,
  tileIncome,
  recruitReason,
  researchReason,
  developmentReason,
  promotionReason,
  migrateSave,
  BUILDINGS,
} from "./game.js";
import { SPECIALIZATIONS } from "./progression.js";
import { createWorld } from "./world.js";

const SAVE_KEY = "crown-canopy-v1";
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let saveNotice = "",
  state = createGame(417, 17),
  selectedTile = state.units[0].tile,
  selectedUnit = 1,
  busy = false,
  sound = false,
  timer;
try {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) {
    const saved = JSON.parse(raw);
    if (validateSave(saved)) {
      state = migrateSave(saved);
      if (saved.version === 1)
        saveNotice =
          "Save upgraded: your cities, estates and learned technology are preserved.";
      selectedUnit = state.units.find((u) => u.owner === 0)?.id ?? null;
      selectedTile =
        state.units.find((u) => u.id === selectedUnit)?.tile ??
        state.tiles.find((t) => t.city?.capital === 0).id;
    } else
      saveNotice = "An incompatible save was ignored. A fresh island awaits.";
  }
} catch {
  saveNotice = "Autosave is unavailable in this browser session.";
}
document.querySelector("#app").innerHTML = `
  <header class="topbar">
    <a class="brand" href="#" aria-label="Crown and Canopy home"><span class="brand-mark">♜</span><span>CROWN <i>&</i> CANOPY<small>A SMALL WORLD. A GRAND STRATEGY.</small></span></a>
    <div class="resources" aria-label="Realm resources"><div><span class="gold">✦</span><b id="stars">12</b><small id="income">+3 / turn</small></div><div class="round"><small>ROUND</small><b id="round">01 <span>/ 30</span></b></div></div>
    <nav><button class="icon-button" id="sound" aria-label="Enable sound" title="Toggle sound">♪</button><button class="icon-button" id="help" aria-label="How to play" title="How to play">?</button><button class="outline" id="new-game">New island</button></nav>
  </header>
  <main class="game-layout">
    <section class="board-shell" aria-label="Island map">
      <div class="map-heading"><span class="eyebrow">THE VERDANT REACH</span><h1>An island to claim.</h1><p>Explore. Establish. Endure.</p></div>
      <div id="world"></div>
      <div class="map-compass" aria-hidden="true"><span>N</span>✧</div>
      <div class="camera-tools"><button id="zoom-in" aria-label="Zoom in">+</button><button id="zoom-out" aria-label="Zoom out">−</button><button id="focus-camera" aria-label="Inspect selected tile" title="Close-up of the selected tile">◎</button><button id="reset-camera" aria-label="Reset camera">⌖</button></div>
      <div class="map-caption"><span class="mint-dot"></span> <span id="explored">CHARTING THE UNKNOWN</span><span class="gesture">Drag to orbit · Scroll to zoom</span></div>
      <div id="toast" role="status" aria-live="polite"></div>
    </section>
    <aside class="sidebar">
      <section class="realm-card"><div class="eyebrow">YOUR REALM <span class="tag">PLAYER 01</span></div><h2><span class="realm-emblem">♧</span> Canopy Covenant</h2><p>From a single seed, a kingdom.</p><div class="realm-stats"><div><b id="cities">1</b><small>CITIES</small></div><div><b id="army">1</b><small>UNITS</small></div><div><b id="ready">1</b><small>READY</small></div></div></section>
      <section class="objective"><div class="eyebrow">PATH TO VICTORY <span>◇</span></div><h3>Awaken the beacons</h3><p>Hold beacons to earn ${GOAL} renown.<br>Or capture the rival capital.</p><div class="progress-label"><span>Canopy</span><b id="renown">0 / 12</b></div><div class="progress-track"><i id="renown-bar"></i></div><div class="progress-label rival"><span>Ember Court</span><b id="enemy-renown">0 / 12</b></div><div class="progress-track enemy"><i id="enemy-bar"></i></div></section>
      <section class="inspector" id="inspector" aria-live="polite"></section>
      <section class="journal"><div class="eyebrow">FIELD NOTES</div><p id="log"></p></section>
    </aside>
  </main>
  <footer class="bottom-bar"><div class="turn-identity"><span class="turn-orb">♧</span><div><b id="turn-label">Your turn</b><small id="turn-hint">Choose where your story grows.</small></div></div><div class="utility-actions"><button id="next-unit" aria-label="Next unit">♙ <span>Next unit</span><kbd>N</kbd></button><button id="research" aria-label="Research">⌘ <span>Research</span></button><button id="export" aria-label="Export GLB" title="Export explored 3D world for Blender">↗ <span>Export GLB</span></button></div><button class="end-turn" id="end-turn">End turn <span>→</span></button></footer>
  <dialog id="dialog"><div id="dialog-content"></div></dialog>
`;
const $ = (selector) => document.querySelector(selector);
let world;
try {
  world = createWorld($("#world"), pick);
  world.ready.then((ok) => {
    if (!ok)
      notify(
        "Detailed models could not load. Basic graphics are active; reload to retry.",
      );
  });
} catch (error) {
  $("#world").innerHTML =
    '<div class="webgl-error"><h2>3D rendering is unavailable</h2><p>Enable hardware acceleration or try a browser with WebGL2. You can still play using the tile navigator.</p></div>';
  console.error(error);
}
function notify(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  clearTimeout(timer);
  timer = setTimeout(() => $("#toast").classList.remove("show"), 4200);
}
function beep() {
  if (!sound) return;
  try {
    const ctx = (audioContext ??= new (
      window.AudioContext || window.webkitAudioContext
    )());
    if (ctx.state === "suspended") ctx.resume();
    const o = ctx.createOscillator(),
      g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(520, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(780, ctx.currentTime + 0.08);
    g.gain.setValueAtTime(0.045, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.17);
  } catch {
    /* Audio is optional. */
  }
}
let audioContext;
function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    saveNotice =
      "Autosave unavailable — keep this tab open to retain your expedition.";
  }
}
function pick(tile) {
  if (busy || state.active !== 0 || state.winner !== null) return;
  if (!state.explored[0].includes(tile)) {
    notify("Uncharted territory. Move a scout closer to reveal it.");
    return;
  }
  selectedTile = tile;
  const u = unitAt(state, tile);
  if (u?.owner === 0) selectedUnit = u.id;
  render();
}
function act(action) {
  if (busy || state.active !== 0) return;
  const result = command(state, action);
  if (result.error) {
    notify(result.error);
    return;
  }
  state = result.state;
  beep();
  save();
  render();
  if (state.winner !== null) showResult();
}
function actionButton(label, action, disabled = false, klass = "") {
  return `<button class="action ${klass}" data-command='${JSON.stringify(action)}' ${disabled ? "disabled" : ""}>${label}</button>`;
}
function gatedButton(label, action, reason) {
  return (
    actionButton(label, action, busy || state.winner !== null || !!reason) +
    (reason ? `<small class="action-reason">${escape(reason)}</small>` : "")
  );
}
function render() {
  const p = state.players[0];
  $("#stars").textContent = p.stars;
  $("#income").textContent = `+${income(state, 0)} / turn`;
  $("#round").innerHTML =
    `${String(state.round).padStart(2, "0")} <span>/ ${roundLimit(state)}</span>`;
  $("#cities").textContent = state.tiles.filter(
    (t) => t.city && t.owner === 0,
  ).length;
  $("#army").textContent = state.units.filter((u) => u.owner === 0).length;
  $("#ready").textContent = state.units.filter(
    (u) => u.owner === 0 && !u.attacked,
  ).length;
  $("#renown").textContent = `${p.renown} / ${GOAL}`;
  $("#enemy-renown").textContent = `${state.players[1].renown} / ${GOAL}`;
  $("#renown-bar").style.width = `${Math.min(100, (p.renown / GOAL) * 100)}%`;
  $("#enemy-bar").style.width =
    `${Math.min(100, (state.players[1].renown / GOAL) * 100)}%`;
  $("#explored").textContent =
    `${Math.round((state.explored[0].length / state.tiles.length) * 100)}% CHARTED · ${mapSize(state)}×${mapSize(state)} · SEED ${state.seed}`;
  $("#turn-label").textContent =
    state.winner !== null
      ? "Expedition complete"
      : busy || state.active === 1
        ? "Ember is planning…"
        : "Your turn";
  $("#turn-hint").textContent =
    saveNotice ||
    (busy
      ? "The rival court weighs its next move."
      : "Choose where your story grows.");
  $("#end-turn").disabled = busy || state.active !== 0 || state.winner !== null;
  $("#next-unit").disabled = busy || state.winner !== null;
  $("#research").disabled = busy || state.winner !== null;
  $("#new-game").disabled = busy;
  $("#log").textContent = state.log[0];
  let u = state.units.find((u) => u.id === selectedUnit && u.owner === 0);
  if (!u) selectedUnit = null;
  const t = state.tiles[selectedTile],
    tileUnit = t ? unitAt(state, t.id) : null;
  const known = t && state.explored[0].includes(t.id);
  const terrainName = {
    grass: "Meadow",
    forest: "Pine forest",
    mountain: "Limestone peaks",
    water: "Coastal waters",
  };
  let html = `<div class="eyebrow">${u ? "COMMAND YOUR PEOPLE" : "EXPLORE THE ISLAND"}<span>${known ? `${t.x + 1} · ${t.z + 1}` : ""}</span></div>`;
  if (u) {
    html += `<h3>♙ ${UNITS[u.type].name} <span class="health">${u.hp}/${unitStats(state, u).hp} HP</span></h3><p class="unit-status">${u.attacked ? "Actions spent · ready next turn" : u.moved ? "Moved · can still attack" : "Ready to move and attack"}</p><p class="unit-status">Attack ${unitStats(state, u).attack} · Range ${UNITS[u.type].range} · Movement ${unitStats(state, u).move}</p>`;
    if (known && reachable(state, u).includes(t.id))
      html += actionButton(
        `Move to ${terrainName[t.terrain]} →`,
        { type: "move", unit: u.id, tile: t.id },
        busy,
        "primary",
      );
    if (
      tileUnit?.owner === 1 &&
      targets(state, u).some((v) => v.id === tileUnit.id)
    ) {
      const hit = combatPreview(state, u, tileUnit);
      html +=
        `<p class="combat-preview">Deal <b>${hit.damage}</b> · receive <b>${hit.retaliation}</b>${hit.lethal ? " · defeats enemy" : ""}</p>` +
        actionButton(
          "Attack enemy",
          { type: "attack", unit: u.id, target: tileUnit.id },
          busy,
          "danger",
        );
    }
    if (
      !u.moved &&
      !u.attacked &&
      u.hp < unitStats(state, u).hp &&
      !state.tiles[u.tile].occupation
    )
      html += actionButton(
        "Rest · recover 4 HP",
        { type: "heal", unit: u.id },
        busy,
      );
    html +=
      '<p class="selection-tip">Select a mint outline to move. Select a rival to preview combat.</p>';
    html += `<p class="unit-status">${u.xp} XP · Veteran ${u.rank}/2${u.promotion ? ` · ${u.promotion}` : ""}. Combat survival +1 XP; defeat an enemy +3; capture +2.</p>`;
    if (u.rank < 2)
      for (const choice of u.promotion
        ? [u.promotion]
        : ["mobility", "resilience"])
        html += gatedButton(
          `Train ${choice}<small>✦ ${u.rank ? 7 : 4} · +1 attack, ${choice === "mobility" ? "+1 movement" : "+2 maximum HP"}</small>`,
          { type: "promote", unit: u.id, choice },
          promotionReason(state, u, choice),
        );
  }
  if (known) {
    html += `<div class="tile-info"><strong>${escape(t.city?.name ?? (t.beacon ? "Ancient beacon" : terrainName[t.terrain]))}</strong><small>${t.owner === null ? "Unclaimed" : FACTIONS[t.owner]}${t.city ? ` · Level ${t.city.level}` : t.improved ? ` · ${BUILDINGS[t.building].name}` : ""}</small></div>`;
    if (t.occupation)
      html += `<p class="combat-preview">⚑ ${FACTIONS[t.occupation.owner]} is occupying this city. Capture completes after ${FACTIONS[t.owner]}'s turn. Remove the occupier to restore income.</p>`;
    if (t.territory !== null)
      html += `<p class="selection-tip">Territory: ${escape(state.explored[0].includes(t.territory) ? state.tiles[t.territory].city.name : "Uncharted settlement")}</p>`;
    if (t.owner === 0) {
      html += `<p class="unit-status">Tile income: +${tileIncome(state, t)} / turn${t.road ? " · Road" : ""}${t.building ? ` · ${BUILDINGS[t.building].name}` : ""}</p>`;
      if (t.city) {
        html += `<p class="unit-status">${t.city.specialization ?? "No specialization"} · ${t.city.fortification ?? "No stronghold upgrade"}</p><div class="recruit-grid">`;
        for (const [kind, def] of Object.entries(UNITS))
          html += `<div>${gatedButton(`${def.name}<small>✦ ${def.cost}</small>`, { type: "recruit", tile: t.id, kind }, recruitReason(state, t, kind))}</div>`;
        html += "</div>";
        for (const [kind, def] of Object.entries(SPECIALIZATIONS)) {
          const retrofit =
            t.city.level >= def.level &&
            !t.city[def.level === 2 ? "specialization" : "fortification"];
          if (t.city.level + 1 !== def.level && !retrofit) continue;
          const type = retrofit ? "specialize" : "upgrade";
          html += gatedButton(
            `${retrofit ? "Add" : "Grow city ·"} ${def.name}<small>✦ ${def.level === 2 ? 6 : 12} · ${def.description}${retrofit ? "" : " · +1 base income"}</small>`,
            { type, tile: t.id, kind },
            developmentReason(state, t, type, kind),
          );
        }
      } else if (!t.beacon && ["grass", "forest"].includes(t.terrain)) {
        const kind =
          t.building === "farm" || t.building === "estate"
            ? "farm2"
            : t.terrain === "forest"
              ? "lumber"
              : "farm";
        if (!t.improved || kind === "farm2")
          html += gatedButton(
            `Build ${BUILDINGS[kind].name}<small>✦ ${BUILDINGS[kind].cost} · +${BUILDINGS[kind].income} total income</small>`,
            { type: "improve", tile: t.id, kind },
            developmentReason(state, t, "improve", kind),
          );
      }
      if (!t.road && !t.beacon && ["grass", "forest"].includes(t.terrain))
        html += gatedButton(
          "Build road<small>✦ 2 · half-cost connected road movement</small>",
          { type: "road", tile: t.id },
          developmentReason(state, t, "road"),
        );
    }
  }
  html += `<label class="tile-picker">Tile navigator<select id="tile-picker" aria-label="Select a charted tile" ${busy || state.winner !== null ? "disabled" : ""}>${state.explored[0]
    .map((id) => {
      const tile = state.tiles[id];
      return `<option value="${id}" ${id === selectedTile ? "selected" : ""}>${tile.x + 1},${tile.z + 1} — ${escape(tile.city?.name ?? (tile.beacon ? "Beacon" : terrainName[tile.terrain]))}${unitAt(state, id) ? " · Unit" : ""}</option>`;
    })
    .join("")}</select></label>`;
  $("#inspector").innerHTML = html;
  $("#tile-picker").addEventListener("change", (e) =>
    pick(Number(e.target.value)),
  );
  $("#inspector")
    .querySelectorAll("[data-command]")
    .forEach((b) =>
      b.addEventListener("click", () => act(JSON.parse(b.dataset.command))),
    );
  world?.update(state, selectedTile, selectedUnit);
}
function modal(content) {
  $("#dialog-content").innerHTML =
    `<button class="dialog-close icon-button" aria-label="Close dialog">×</button>${content}`;
  if (!$("#dialog").open) $("#dialog").showModal();
  $(".dialog-close").onclick = () => $("#dialog").close();
}
function showResearch() {
  modal(
    `<span class="eyebrow">THE COUNCIL OF KNOWLEDGE</span><h2>Ideas become empires.</h2><p>Spend stars now. Open new possibilities for every turn ahead.</p><div class="tech-list">${Object.entries(
      TECHS,
    )
      .map(
        ([key, tech]) =>
          `<article><span class="tech-icon">${tech.branch === "Military" ? "➶" : tech.branch === "Economy" ? "♧" : "♜"}</span><div><small>${tech.branch}${tech.requires ? ` · ${TECHS[tech.requires].name} →` : " · Foundation"}</small><h3>${tech.name}</h3><p>${tech.description}</p><small class="action-reason">${researchReason(state, key)}</small></div><button data-tech="${key}" ${researchReason(state, key) || state.active !== 0 || state.winner !== null ? "disabled" : ""}>${state.players[0].tech.includes(key) ? "Learned" : `✦ ${tech.cost}`}</button></article>`,
      )
      .join("")}</div>`,
  );
  document.querySelectorAll("[data-tech]").forEach(
    (b) =>
      (b.onclick = () => {
        act({ type: "research", tech: b.dataset.tech });
        showResearch();
      }),
  );
}
function showHelp() {
  const limitDescription = `This ${mapSize(state)}×${mapSize(state)} island lasts at most ${roundLimit(state)} rounds.`;
  modal(
    `<span class="eyebrow">YOUR FIRST EXPEDITION</span><h2>A kingdom, one turn at a time.</h2><ol class="help-list"><li><b>Explore with your scout.</b> Select a mint-outlined tile, then choose Move. Fog clears within three tiles and charted land stays visible.</li><li><b>Grow your realm.</b> Neutral villages transfer immediately. Enemy cities require occupation through one defender turn; leaving or dying cancels capture, and contested city territory produces no income. Select an empty owned city to recruit; newly recruited units act next turn. Research Agriculture, build two farms, then specialize your city as a Market or Barracks. Engineering unlocks Walls or a Workshop at level III.</li><li><b>Choose your battles.</b> Units move once and attack once. Attacking ends movement. Forests cost two movement and reduce damage by one. Water and peaks cannot be crossed.</li><li><b>Claim the beacons.</b> Each owned beacon adds 1 renown after both factions finish a round. Reach at least 12 and lead in renown to win; equal totals continue. Alternatively, complete occupation of the rival capital. After ${roundLimit(state)} rounds, renown, then city count, then surviving HP decide the winner.</li><li><b>Develop your veterans.</b> Combat and captures earn XP. At a friendly Barracks, an unused unit can train at 3 XP (Training, 4 stars) and 6 XP (Tactics, 7 stars). Pick mobility or resilience; training consumes the turn and preserves damage percentage. Logistics unlocks roads; both endpoints must be friendly roads for half-cost movement.</li></ol><p>Drag to orbit · Right-drag to pan · Pinch or scroll to zoom.<br>N selects the next unit; E ends the turn while no form control is focused. Tab navigates controls normally. Use the tile navigator for keyboard play.</p><p class="muted">Progress saves on this device. Export GLB downloads the explored board for Blender. Original game inspired by compact 4X strategy.</p>`,
  );
  const limitNote = document.createElement("p");
  limitNote.textContent = limitDescription;
  $("#dialog-content").appendChild(limitNote);
}
function showNewGame() {
  modal(
    '<span class="eyebrow">A NEW EXPEDITION</span><h2>Beyond the horizon.</h2><p>This replaces the saved expedition on this device.</p><label class="seed-label">Island seed<input id="seed" type="number" min="0" max="4294967295" value="' +
      Math.floor(Math.random() * 99999) +
      '"></label><label class="seed-label">Island size<select id="map-size"><option value="17">Expedition · 17 × 17 · 40 rounds</option><option value="11">Quick skirmish · 11 × 11 · 30 rounds</option></select></label><button class="primary action" id="start-new">Set sail →</button>',
  );
  $("#start-new").onclick = () => {
    const n = Number($("#seed").value);
    if (!Number.isInteger(n) || n < 0 || n > 4294967295) {
      $("#seed").setCustomValidity("Use a whole number from 0 to 4294967295.");
      $("#seed").reportValidity();
      return;
    }
    state = createGame(n, Number($("#map-size").value));
    selectedUnit = 1;
    selectedTile = state.units[0].tile;
    busy = false;
    save();
    render();
    world?.resetCamera();
    $("#dialog").close();
    notify("A fresh island. A new beginning.");
  };
}
function showResult() {
  modal(
    `<span class="eyebrow">EXPEDITION COMPLETE</span><h2>${state.winner === 0 ? "The canopy endures." : state.winner === -1 ? "A shared horizon." : "Embers take the crown."}</h2><p>${escape(state.reason)}</p><div class="result-score"><b>${state.players[0].renown}<small>YOUR RENOWN</small></b><span>◇</span><b>${state.players[1].renown}<small>EMBER RENOWN</small></b></div><button class="primary action" id="again">Explore another island →</button>`,
  );
  $("#again").onclick = showNewGame;
}
async function runAI() {
  busy = true;
  render();
  await new Promise((resolve) => setTimeout(resolve, 650));
  state = aiTurn(state);
  busy = false;
  save();
  render();
  if (state.winner !== null) showResult();
  else
    notify(
      `Round ${state.round} · Your cities earned ${income(state, 0)} stars.`,
    );
}
async function endTurn() {
  if (busy || state.active !== 0 || state.winner !== null) return;
  act({ type: "end" });
  if (state.winner === null) await runAI();
}
function nextUnit() {
  const units = state.units.filter((u) => u.owner === 0 && !u.attacked);
  if (!units.length) {
    notify("All units have acted. End your turn to ready them.");
    return;
  }
  const u =
    units[(units.findIndex((u) => u.id === selectedUnit) + 1) % units.length];
  selectedUnit = u.id;
  selectedTile = u.tile;
  render();
}
$("#end-turn").onclick = endTurn;
$("#next-unit").onclick = nextUnit;
$("#research").onclick = showResearch;
$("#help").onclick = showHelp;
$("#new-game").onclick = showNewGame;
$("#zoom-in").onclick = () => world?.zoom(1.18);
$("#zoom-out").onclick = () => world?.zoom(1 / 1.18);
$("#reset-camera").onclick = () => world?.resetCamera();
$("#focus-camera").onclick = () => world?.focus();
$("#sound").onclick = () => {
  sound = !sound;
  $("#sound").classList.toggle("active", sound);
  $("#sound").setAttribute(
    "aria-label",
    sound ? "Disable sound" : "Enable sound",
  );
  beep();
};
$("#export").onclick = async () => {
  if (!world) {
    notify("Export needs a working 3D renderer.");
    return;
  }
  $("#export").disabled = true;
  notify("Preparing your explored island for Blender…");
  try {
    await world.exportGLB();
    notify(
      "GLB exported. Import it into Blender via File → Import → glTF 2.0.",
    );
  } catch {
    notify("Export failed. Try a smaller explored world or reload the page.");
  } finally {
    $("#export").disabled = false;
  }
};
$(".brand").onclick = (e) => {
  e.preventDefault();
  world?.resetCamera();
};
document.addEventListener("keydown", (e) => {
  if (
    e.repeat ||
    $("#dialog").open ||
    busy ||
    state.winner !== null ||
    ["INPUT", "SELECT", "BUTTON", "A"].includes(document.activeElement?.tagName)
  )
    return;
  if (e.key.toLowerCase() === "n") {
    e.preventDefault();
    nextUnit();
  }
  if (e.key.toLowerCase() === "e") {
    e.preventDefault();
    endTurn();
  }
});
render();
if (saveNotice) notify(saveNotice);
if (state.winner !== null) showResult();
else if (state.active === 1) runAI();
if (import.meta.env.DEV)
  window.__game = {
    getState: () => structuredClone(state),
    tileScreen: (id) => world?.tileScreen(id),
    artDiagnostics: () => world?.diagnostics(),
  };
