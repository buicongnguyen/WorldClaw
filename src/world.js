import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { loadArt, rebuildBatches } from "./art.js";
import { armyColor } from "./factions.js";
import { climateAt } from "./climate.js";
import { BUILDINGS } from "./progression.js";
import { SIZE, mapSize, UNITS, reachable, targets } from "./game.js";

const colors = {
  grass: [0x7d8a58, 0x869160, 0x73834f],
  desert: [0xc5a768, 0xd3b57a, 0xbfa067],
  ice: [0xb7d6db, 0xc9e1e4, 0xa9cbd4],
  forest: [0x576943, 0x637448],
  water: [0x3c6b71, 0x436f74],
  mountain: [0x8d8b76],
  fog: [0x526569, 0x596c70],
};
export function createWorld(host, onPick) {
  let factionColors = [0x75e4c0, 0xed9375];
  let boardSize = SIZE,
    center = (SIZE - 1) / 2;
  let needsFrame = true;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x183e49);
  scene.fog = new THREE.Fog(0x183e49, 27, 60);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = new RoomEnvironment();
  const environment = pmrem.fromScene(studio, 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.3;
  studio.dispose();
  pmrem.dispose();
  renderer.setClearColor(0x183e49);
  host.appendChild(renderer.domElement);
  renderer.domElement.dataset.art = "loading";
  renderer.domElement.setAttribute(
    "aria-label",
    "Interactive 3D island. Select tiles using the board or the tile navigator.",
  );
  renderer.domElement.tabIndex = 0;
  const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
  camera.position.set(14, 16, 18);
  camera.lookAt(0, 0, 0);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener("change", () => {
    needsFrame = true;
  });
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.minZoom = 0.7;
  controls.maxZoom = 5;
  controls.minPolarAngle = 0.3;
  controls.maxPolarAngle = 1.15;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  };
  scene.add(new THREE.HemisphereLight(0xd5e4ed, 0x4a4030, 0.9));
  const sun = new THREE.DirectionalLight(0xffdfb0, 2.8);
  sun.position.set(-8, 16, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -10,
    right: 10,
    top: 10,
    bottom: -10,
  });
  sun.shadow.bias = -0.001;
  sun.shadow.normalBias = 0.015;
  sun.shadow.radius = 3;
  scene.add(sun);
  const board = new THREE.Group();
  board.name = "CrownAndCanopy_ChartedWorld";
  scene.add(board);
  board.visible = false;
  const renderedBoard = new THREE.Group();
  scene.add(renderedBoard);
  let art = null;
  let artState = "loading";
  const overlays = new THREE.Group();
  scene.add(overlays);
  const labels = document.createElement("div");
  labels.className = "world-labels";
  host.appendChild(labels);
  const materials = new Map(),
    geometries = new Map();
  const groundCanvas = document.createElement("canvas");
  groundCanvas.width = groundCanvas.height = 128;
  const groundContext = groundCanvas.getContext("2d");
  const pixels = groundContext.createImageData(128, 128);
  for (let i = 0; i < 128 * 128; i++) {
    const grain = 190 + (((i * 73) ^ ((i >> 4) * 197)) % 57);
    pixels.data.set([grain, grain, grain, 255], i * 4);
  }
  groundContext.putImageData(pixels, 0, 0);
  const groundTexture = new THREE.CanvasTexture(groundCanvas);
  groundTexture.colorSpace = THREE.SRGBColorSpace;
  function material(color) {
    if (!materials.has(color))
      materials.set(
        color,
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.92,
          flatShading: true,
        }),
      );
    return materials.get(color);
  }
  function geometry(kind, values) {
    const key = kind + values.join(",");
    if (!geometries.has(key))
      geometries.set(key, new THREE[`${kind}Geometry`](...values));
    return geometries.get(key);
  }
  function mesh(parent, kind, dims, color, x, y, z) {
    const m = new THREE.Mesh(geometry(kind, dims), material(color));
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  const sea = mesh(scene, "Box", [200, 0.1, 200], 0x285c69, 0, -0.65, 0);
  sea.castShadow = false;
  sea.material = new THREE.MeshStandardMaterial({
    color: 0x365e68,
    roughness: 0.38,
    metalness: 0.22,
  });
  let tileMeshes = [],
    labelItems = [],
    lastSignature = "",
    state,
    selected;
  function tree(g, x, z, scale = 1) {
    if (art) {
      art.add(g, "pine", x, 0.32, z, scale);
      return;
    }
    mesh(
      g,
      "Cylinder",
      [0.045 * scale, 0.065 * scale, 0.3 * scale, 5],
      0x795c47,
      x,
      0.4 * scale,
      z,
    );
    mesh(
      g,
      "Cone",
      [0.28 * scale, 0.64 * scale, 5],
      0x265c4c,
      x,
      0.78 * scale,
      z,
    );
    mesh(
      g,
      "Cone",
      [0.23 * scale, 0.51 * scale, 5],
      0x397e5b,
      x,
      1.02 * scale,
      z,
    );
  }
  function house(g, x, z, tint, scale = 1) {
    if (art) {
      art.add(g, "cottage", x, 0.32, z, scale);
      return;
    }
    mesh(
      g,
      "Box",
      [0.3 * scale, 0.34 * scale, 0.3 * scale],
      0xf0e7cd,
      x,
      0.44 * scale,
      z,
    );
    const roof = mesh(
      g,
      "Cone",
      [0.29 * scale, 0.25 * scale, 4],
      tint,
      x,
      0.73 * scale,
      z,
    );
    roof.rotation.y = Math.PI / 4;
    mesh(
      g,
      "Box",
      [0.085 * scale, 0.17 * scale, 0.012],
      0x3c5355,
      x,
      0.4 * scale,
      z + 0.156 * scale,
    );
  }
  function addLabel(text, x, y, z, className) {
    const el = document.createElement("div");
    el.className = `world-label ${className}`;
    el.textContent = text;
    labels.appendChild(el);
    labelItems.push({ el, pos: new THREE.Vector3(x, y, z) });
  }
  function rebuild(s) {
    factionColors = [armyColor(s, 0), armyColor(s, 1)];
    art?.setColors(factionColors);
    board.clear();
    labels.replaceChildren();
    labelItems = [];
    tileMeshes = [];
    const seen = new Set(s.explored[0]);
    for (const t of s.tiles) {
      const known = seen.has(t.id),
        terrain = known ? t.terrain : "fog";
      const g = new THREE.Group();
      g.name = `Tile_${t.x}_${t.z}_${terrain}`;
      g.position.set(t.x - center, 0, t.z - center);
      board.add(g);
      const climate = climateAt(s, t);
      const palette =
          colors[known && climate !== "temperate" ? climate : terrain],
        color = palette[(t.id * 7 + s.seed) % palette.length];
      const h = terrain === "water" ? -0.05 : 0.16;
      const tile = mesh(
        g,
        "Box",
        [0.965, known && terrain !== "water" ? 0.6 : 0.24, 0.965],
        color,
        0,
        h - 0.14,
        0,
      );
      tile.userData.tile = t.id;
      tileMeshes.push(tile);
      if (known && terrain !== "water") {
        const earth = material(0x6b624d);
        const ground = material(color);
        ground.map = groundTexture;
        tile.material = [earth, earth, ground, earth, earth, earth];
      }
      if (!known) {
        if (t.id % 4 === 0)
          mesh(
            g,
            "Dodecahedron",
            [0.14, 0],
            0x6c8990,
            0.07,
            0.26,
            -0.02,
          ).scale.set(1.8, 0.45, 1.2);
        continue;
      }
      if (t.terrain === "water") {
        if (t.id % 3 === 0)
          mesh(g, "Box", [0.33, 0.012, 0.025], 0x65a3a6, -0.06, -0.055, 0.12);
        continue;
      }
      if (t.owner !== null) {
        const border = mesh(
          g,
          "Box",
          [0.87, 0.014, 0.06],
          factionColors[t.owner],
          0,
          0.325,
          0.435,
        );
        border.castShadow = false;
      }
      if (t.terrain === "forest" && !t.improved) {
        tree(g, -0.19, -0.12, 0.8);
        tree(g, 0.2, 0.14, 0.62);
        if (art && t.id % 3 === 0) art.add(g, "oak", 0.22, 0.32, -0.22, 0.65);
        else tree(g, 0.21, -0.22, 0.6);
      }
      if (t.terrain === "mountain" && art) {
        art.add(g, "mountain", 0, 0.32, 0, 1, null, t.id * 0.73);
      } else if (t.terrain === "mountain") {
        const mountain = mesh(
          g,
          "Cone",
          [0.53, 1.15, 5],
          0x9faeaa,
          -0.03,
          0.83,
          -0.04,
        );
        mountain.rotation.y = 0.5;
        mesh(
          g,
          "Cone",
          [0.24, 0.5, 5],
          0xf3f0da,
          -0.03,
          1.25,
          -0.04,
        ).rotation.y = 0.5;
        mesh(g, "Cone", [0.27, 0.55, 5], 0x81958e, 0.25, 0.54, 0.23);
      }
      if (t.improved && art) {
        art.add(
          g,
          BUILDINGS[t.building]?.model ??
            (t.building === "estate" ? "farm" : t.building),
          0,
          0.32,
          0,
          1,
        );
        if (t.building === "greenhouse" || t.building === "icefarm")
          mesh(g, "Box", [0.24, 0.22, 0.28], 0xb6e3ef, 0.22, 0.51, 0.2);
        if (t.building === "oasis" || t.building === "oasis2")
          mesh(
            g,
            "Cylinder",
            [0.13, 0.14, 0.03, 16],
            0x4c9cbb,
            -0.2,
            0.35,
            0.22,
          );
      } else if (t.improved) {
        for (let j = 0; j < 4; j++)
          mesh(
            g,
            "Box",
            [0.65, 0.065, 0.08],
            j % 2 ? 0xe3bf68 : 0x9b773e,
            0,
            0.34,
            -0.25 + j * 0.16,
          );
        mesh(g, "Box", [0.035, 0.23, 0.035], 0xe3d2aa, -0.34, 0.4, -0.3);
        if (t.building === "farm2") house(g, 0.18, -0.2, 0xe3bf68, 0.7);
        if (t.building === "lumber") {
          tree(g, -0.18, -0.15, 0.65);
          for (let j = 0; j < 3; j++)
            mesh(g, "Box", [0.5, 0.1, 0.12], 0x795c47, 0, 0.4 + j * 0.09, 0.17);
        }
      }
      if (t.road) {
        mesh(g, "Box", [0.94, 0.025, 0.16], 0xc3b994, 0, 0.335, 0);
        mesh(g, "Box", [0.16, 0.025, 0.94], 0xc3b994, 0, 0.337, 0);
      }
      if (t.city && art) {
        for (let i = 0; i < 12; i++)
          mesh(
            g,
            "Box",
            [0.12, 0.018, 0.09],
            0x96917c,
            -0.37 + (i % 4) * 0.25,
            0.34,
            -0.35 + Math.floor(i / 4) * 0.34,
          );
        art.add(
          g,
          t.city.capital !== null || t.city.level > 1 ? "keep" : "cottage",
          0,
          0.32,
          -0.15,
          1,
          t.owner,
        );
        art.add(g, "cottage", -0.27, 0.32, 0.23, 0.67, t.owner);
        art.add(g, "cottage", 0.27, 0.32, 0.22, 0.6, t.owner);
        if (t.city.specialization)
          art.add(g, t.city.specialization, 0.29, 0.32, -0.26, 0.65, t.owner);
        if (t.city.level >= 3)
          art.add(g, "tower", -0.32, 0.32, -0.28, 0.86, t.owner);
        if (t.city.fortification === "walls")
          for (const z of [-0.43, 0.43])
            art.add(g, "wall", 0, 0.32, z, 1, t.owner);
        if (t.city.fortification === "workshop")
          art.add(g, "workshop", 0.25, 0.32, 0.23, 0.65, t.owner);
        if (t.occupation) mesh(g, "Octahedron", [0.12, 0], 0xffb879, 0, 1.5, 0);
        mesh(
          g,
          "Cylinder",
          [0.014, 0.014, 0.62, 8],
          0x7b6647,
          0.39,
          0.62,
          -0.38,
        );
        mesh(
          g,
          "Box",
          [0.19, 0.12, 0.012],
          t.owner === null ? 0xb7b29a : factionColors[t.owner],
          0.47,
          0.89,
          -0.38,
        );
        addLabel(
          `${t.occupation ? "⚑ " : t.city.capital !== null ? "♛ " : ""}${t.city.name}${t.city.level > 1 ? ` ${["", "I", "II", "III"][t.city.level]}` : ""}`,
          t.x - center,
          0.2,
          t.z - center + 0.45,
          `city-label owner-${t.owner}`,
        );
      } else if (t.city) {
        const c =
          t.owner === null ? 0x819baa : t.owner === 0 ? 0x337e70 : 0xbc6251;
        house(g, -0.2, 0.17, c, 0.9);
        house(g, 0.22, 0.12, c, 0.75);
        house(g, 0, -0.18, c, t.city.capital !== null ? 1.5 : 1.15);
        if (t.city.level >= 2) house(g, -0.3, -0.28, c, 0.65);
        if (t.city.specialization === "market") {
          mesh(g, "Box", [0.42, 0.07, 0.25], 0xe3bf68, 0.15, 0.85, 0.28).name =
            "Market_awning";
        }
        if (t.city.specialization === "barracks") {
          mesh(g, "Box", [0.23, 0.33, 0.09], 0x75e4c0, -0.3, 0.75, 0.33).name =
            "Barracks_shield";
        }
        if (t.city.level >= 3)
          mesh(g, "Box", [0.18, 1.1, 0.18], 0xd4d6c4, -0.34, 0.8, -0.32);
        if (t.city.fortification === "walls")
          for (const z of [-0.43, 0.43])
            mesh(g, "Box", [0.9, 0.3, 0.08], 0xa5b9b3, 0, 0.46, z).name =
              "Stronghold_wall";
        if (t.city.fortification === "workshop")
          mesh(g, "Box", [0.13, 0.6, 0.13], 0x795c47, 0.28, 0.85, 0.2).name =
            "Workshop_chimney";
        if (t.occupation)
          mesh(g, "Octahedron", [0.18, 0], 0xffb879, 0, 1.8, 0).name =
            "Occupation_marker";
        mesh(g, "Cylinder", [0.025, 0.025, 0.9, 5], 0xc5ac73, 0.32, 0.76, -0.3);
        mesh(
          g,
          "Box",
          [0.24, 0.16, 0.02],
          t.owner === null ? 0xd8d4c1 : factionColors[t.owner],
          0.43,
          1.1,
          -0.3,
        );
        addLabel(
          `${t.occupation ? "⚑ " : t.city.capital !== null ? "♛ " : ""}${t.city.name}${t.city.level > 1 ? ` ${["", "I", "II", "III"][t.city.level]}` : ""}`,
          t.x - center,
          0.2,
          t.z - center + 0.45,
          `city-label owner-${t.owner}`,
        );
      }
      if (t.beacon && art) {
        art.add(g, "beacon", 0, 0.32, 0, 1, t.owner);
        addLabel("◇ BEACON", t.x - center, 1.52, t.z - center, "beacon-label");
      } else if (t.beacon) {
        mesh(g, "Cylinder", [0.31, 0.37, 0.12, 6], 0xcac3a4, 0, 0.36, 0);
        mesh(g, "Cylinder", [0.1, 0.15, 0.55, 5], 0xebe1ba, 0, 0.67, 0);
        const crystal = mesh(
          g,
          "Octahedron",
          [0.23, 0],
          t.owner === null ? 0xfbd77d : factionColors[t.owner],
          0,
          1.12,
          0,
        );
        crystal.rotation.y = 0.3;
        addLabel("◇ BEACON", t.x - center, 1.52, t.z - center, "beacon-label");
      }
      if (
        !t.city &&
        !t.beacon &&
        !t.improved &&
        t.terrain === "grass" &&
        t.id % 3 === 0
      ) {
        if (art) art.add(g, "rocks", 0.2, 0.32, -0.2, 0.23, null, t.id);
        for (let i = 0; i < 3; i++)
          mesh(
            g,
            "Dodecahedron",
            [0.05, 0],
            0xeacd72,
            -0.25 + i * 0.13,
            0.34,
            -0.25,
          );
      }
      if (art && !t.city && !t.beacon && !t.improved && t.terrain === "grass") {
        for (let i = 0; i < 7; i++) {
          const x = ((t.id * 17 + i * 37) % 89) / 100 - 0.44,
            z = ((t.id * 29 + i * 19) % 87) / 100 - 0.43;
          mesh(g, "Cone", [0.028, 0.1, 3], 0x576439, x, 0.37, z);
        }
      }
    }
    for (const u of s.units.filter((u) => seen.has(u.tile))) {
      const t = s.tiles[u.tile],
        g = new THREE.Group();
      g.name = `Unit_${u.id}_${u.type}`;
      const unitElevation = t.terrain === "mountain" ? 0.95 : t.city ? 0.25 : 0;
      g.position.set(t.x - center, unitElevation, t.z - center);
      board.add(g);
      const color = factionColors[u.owner];
      if (t.terrain === "water" && !art && UNITS[u.type].domain !== "water") {
        // Keep amphibious armies visually supported above the sea surface.
        const frozen = s.players[u.owner].tech.includes("frozenpaths");
        mesh(
          g,
          "Box",
          [0.62, 0.14, 0.62],
          frozen ? 0xc4edf5 : 0x88664b,
          0,
          0.23,
          0,
        );
      }
      if (art) {
        if (t.terrain !== "water")
          mesh(g, "Cylinder", [0.23, 0.26, 0.045, 24], color, 0, 0.35, 0);
        art.addArmy(g, s, u);
        if (u.rank)
          mesh(
            g,
            "Octahedron",
            [0.065 + u.rank * 0.015, 0],
            0xe6bf65,
            0,
            UNITS[u.type].mounted ? 1.78 : 1.42,
            0,
          );
        addLabel(
          `${u.hp} ${u.owner === 0 && !u.attacked ? "•" : ""}`,
          t.x - center,
          (UNITS[u.type].mounted
            ? 1.9
            : UNITS[u.type].domain === "water"
              ? 1
              : 1.5) + unitElevation,
          t.z - center,
          `hp-label owner-${u.owner} ${u.moved && u.attacked ? "spent" : ""}`,
        );
        continue;
      }
      if (UNITS[u.type].domain === "water") {
        mesh(g, "Box", [0.48, 0.2, 0.82], 0x88664b, 0, 0.04, 0).name =
          "Fallback_hull";
        mesh(g, "Cylinder", [0.025, 0.025, 0.85, 6], 0xc5ac73, 0, 0.5, 0);
        mesh(g, "Box", [0.38, 0.42, 0.035], color, 0.12, 0.65, 0);
        addLabel(
          `${UNITS[u.type].name} · ${u.hp}`,
          t.x - center,
          1.1,
          t.z - center,
          `hp-label owner-${u.owner}`,
        );
        continue;
      }
      mesh(g, "Cylinder", [0.23, 0.28, 0.08, 12], 0x314e50, 0, 0.36, 0.05);
      mesh(g, "Cylinder", [0.19, 0.22, 0.045, 12], color, 0, 0.415, 0.05);
      mesh(
        g,
        "Cone",
        [0.15, 0.32, 6],
        u.owner === 0 ? 0x235e59 : 0x8c4943,
        0,
        0.6,
        0.05,
      );
      mesh(g, "Sphere", [0.105, 6, 4], 0xffdcaa, 0, 0.85, 0.05);
      mesh(
        g,
        "Cone",
        [0.15, u.type === "scout" ? 0.22 : 0.12, 5],
        color,
        0,
        0.99,
        0.05,
      );
      const weapon = mesh(
        g,
        "Box",
        [0.035, u.type === "archer" ? 0.42 : 0.55, 0.035],
        u.type === "archer" ? 0xb5854a : 0xe0e8db,
        0.19,
        0.7,
        0.07,
      );
      weapon.rotation.z = -0.2;
      if (u.type === "guardian" || u.type === "sentinel")
        mesh(g, "Box", [0.17, 0.24, 0.04], color, -0.15, 0.66, 0.13);
      if (u.type === "sentinel")
        mesh(g, "Box", [0.24, 0.08, 0.12], 0xc6ccca, 0, 0.78, 0.05);
      if (u.rank)
        mesh(
          g,
          "Octahedron",
          [0.075 + u.rank * 0.02, 0],
          0xfbd77d,
          0,
          1.2,
          0.05,
        ).name = `Veteran_rank_${u.rank}`;
      addLabel(
        `${u.hp} ${u.owner === 0 && !u.attacked ? "•" : ""}`,
        t.x - center,
        1.4 + unitElevation,
        t.z - center,
        `hp-label owner-${u.owner} ${u.moved && u.attacked ? "spent" : ""}`,
      );
    }
    rebuildBatches(board, renderedBoard);
    renderer.shadowMap.needsUpdate = true;
    needsFrame = true;
  }
  function update(s, selectedTile, selectedUnit) {
    needsFrame = true;
    if (boardSize !== mapSize(s)) {
      boardSize = mapSize(s);
      center = (boardSize - 1) / 2;
      resize();
      resetCamera();
      Object.assign(sun.shadow.camera, {
        left: -boardSize,
        right: boardSize,
        top: boardSize,
        bottom: -boardSize,
      });
      sun.shadow.camera.updateProjectionMatrix();
    }
    state = s;
    selected = selectedTile;
    const signature = JSON.stringify([
      s.tiles,
      s.units,
      s.explored[0],
      s.players.map((p) => [p.faction, p.livery]),
      s.climates,
    ]);
    if (signature !== lastSignature) {
      rebuild(s);
      lastSignature = signature;
    }
    overlays.clear();
    const u = s.units.find((u) => u.id === selectedUnit);
    const mark = (id, c, radius) => {
      const t = s.tiles[id];
      const ring = mesh(
        overlays,
        "Ring",
        [radius - 0.035, radius, 4],
        c,
        t.x - center,
        t.terrain === "mountain" ? 1.3 : 0.34,
        t.z - center,
      );
      ring.rotation.x = -Math.PI / 2;
      ring.rotation.z = Math.PI / 4;
      ring.material = material(c);
      ring.castShadow = false;
    };
    if (selectedTile !== null && s.explored[0].includes(selectedTile))
      mark(selectedTile, 0xffe6a2, 0.68);
    if (s.active === 0) {
      for (const t of reachable(s, u)) mark(t, 0x7bf9d6, 0.5);
      for (const v of targets(s, u)) mark(v.tile, 0xff9d82, 0.56);
    }
  }
  const resize = () => {
    needsFrame = true;
    const w = host.clientWidth,
      h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    const view = (Math.max(8, (8.2 * h) / w) * boardSize) / SIZE;
    camera.left = (-view * w) / h;
    camera.right = (view * w) / h;
    camera.top = view;
    camera.bottom = -view;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  const raycaster = new THREE.Raycaster(),
    pointer = new THREE.Vector2();
  let down = null;
  renderer.domElement.addEventListener("pointerdown", (e) => {
    down = { x: e.clientX, y: e.clientY, time: performance.now() };
  });
  renderer.domElement.addEventListener("pointerup", (e) => {
    if (
      !down ||
      Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6 ||
      performance.now() - down.time > 600 ||
      e.button !== 0
    )
      return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(tileMeshes, false);
    if (hits.length) onPick(hits[0].object.userData.tile);
    down = null;
  });
  const position = new THREE.Vector3();
  renderer.setAnimationLoop(() => {
    if (document.hidden) return;
    controls.update();
    if (!needsFrame) return;
    needsFrame = false;
    renderer.render(scene, camera);
    const w = host.clientWidth,
      h = host.clientHeight;
    const occupied = [];
    for (const l of [...labelItems].sort(
      (a, b) =>
        Number(b.el.classList.contains("hp-label")) -
        Number(a.el.classList.contains("hp-label")),
    )) {
      position.copy(l.pos).project(camera);
      const x = ((position.x + 1) * w) / 2;
      let y = ((-position.y + 1) * h) / 2;
      const width = l.el.offsetWidth || 50,
        height = l.el.offsetHeight || 16;
      for (
        let step = 0;
        step < 4 &&
        occupied.some(
          (r) =>
            Math.abs(r.x - x) < (r.width + width) / 2 + 2 &&
            Math.abs(r.y - y) < (r.height + height) / 2 + 2,
        );
        step++
      )
        y += height + 2;
      l.el.style.transform = `translate(-50%, -50%) translate(${x}px,${y}px)`;
      l.el.hidden =
        position.z > 1 ||
        Math.abs(position.x) > 1.1 ||
        Math.abs(position.y) > 1.1;
      if (!l.el.hidden) occupied.push({ x, y, width, height });
    }
  });
  function resetCamera() {
    needsFrame = true;
    controls.target.set(0, 0, 0);
    camera.position.set(14, 16, 18);
    camera.zoom = 1;
    camera.updateProjectionMatrix();
    controls.update();
  }
  const ready = loadArt()
    .then((library) => {
      art = library;
      artState = "ready";
      renderer.domElement.dataset.art = "ready";
      if (state) {
        rebuild(state);
        lastSignature = JSON.stringify([
          state.tiles,
          state.units,
          state.explored[0],
          state.players.map((p) => [p.faction, p.livery]),
          state.climates,
        ]);
      }
      return true;
    })
    .catch((error) => {
      artState = "fallback";
      renderer.domElement.dataset.art = "fallback";
      console.warn("Detailed art unavailable; using playable fallback.", error);
      return false;
    });
  return {
    ready,
    diagnostics: () => ({
      art: artState,
      drawCalls: renderer.info.render.calls,
      renderedFrames: renderer.info.render.frame,
      triangles: renderer.info.render.triangles,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
      batches: renderedBoard.children.length,
    }),
    focus: () => {
      if (selected === null || !state?.explored[0].includes(selected)) return;
      const t = state.tiles[selected],
        target = new THREE.Vector3(t.x - center, 0, t.z - center);
      const delta = target.clone().sub(controls.target);
      controls.target.copy(target);
      camera.position.add(delta);
      camera.zoom = 3.2;
      camera.updateProjectionMatrix();
      controls.update();
    },
    update,
    resetCamera,
    zoom: (n) => {
      needsFrame = true;
      camera.zoom = THREE.MathUtils.clamp(camera.zoom * n, 0.7, 5);
      camera.updateProjectionMatrix();
    },
    exportGLB: async () => {
      const { GLTFExporter } =
        await import("three/addons/exporters/GLTFExporter.js");
      await ready;
      const data = await new GLTFExporter().parseAsync(board, {
        binary: true,
        onlyVisible: false,
      });
      const url = URL.createObjectURL(
        new Blob([data], { type: "model/gltf-binary" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `crown-canopy-${state.seed}.glb`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    tileScreen: (id) => {
      const t = state.tiles[id],
        p = new THREE.Vector3(t.x - center, 0.32, t.z - center).project(camera);
      return {
        x: ((p.x + 1) * host.clientWidth) / 2,
        y: ((-p.y + 1) * host.clientHeight) / 2,
      };
    },
  };
}
