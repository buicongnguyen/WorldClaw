import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SIZE, UNITS, reachable, targets } from "./game.js";

const colors = {
  grass: [0x85b88a, 0x93bf91, 0x78ac80],
  forest: [0x639878, 0x6da181],
  water: [0x377e8b, 0x438995],
  mountain: [0xb1b8a0],
  fog: [0x496d75, 0x527880],
};
export const factionColors = [0x75e4c0, 0xed9375];
export function createWorld(host, onPick) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x183e49);
  scene.fog = new THREE.Fog(0x183e49, 27, 60);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x183e49);
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute(
    "aria-label",
    "Interactive 3D island. Select tiles using the board or the tile navigator.",
  );
  renderer.domElement.tabIndex = 0;
  const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
  camera.position.set(14, 16, 18);
  camera.lookAt(0, 0, 0);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.minZoom = 0.7;
  controls.maxZoom = 2.8;
  controls.minPolarAngle = 0.3;
  controls.maxPolarAngle = 1.15;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  };
  scene.add(new THREE.HemisphereLight(0xe4ffeb, 0x35414f, 2.4));
  const sun = new THREE.DirectionalLight(0xffedd0, 3.1);
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
  scene.add(sun);
  const board = new THREE.Group();
  board.name = "CrownAndCanopy_ChartedWorld";
  scene.add(board);
  const overlays = new THREE.Group();
  scene.add(overlays);
  const labels = document.createElement("div");
  labels.className = "world-labels";
  host.appendChild(labels);
  const materials = new Map(),
    geometries = new Map();
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
  let tileMeshes = [],
    labelItems = [],
    lastSignature = "",
    state,
    selected;
  function tree(g, x, z, scale = 1) {
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
      g.position.set(t.x - 5, 0, t.z - 5);
      board.add(g);
      const palette = colors[terrain],
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
        tree(g, -0.19, -0.12, 0.85);
        tree(g, 0.2, 0.14, 0.68);
        tree(g, 0.21, -0.22, 0.64);
      }
      if (t.terrain === "mountain") {
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
      if (t.improved) {
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
      }
      if (t.city) {
        const c =
          t.owner === null ? 0x819baa : t.owner === 0 ? 0x337e70 : 0xbc6251;
        house(g, -0.2, 0.17, c, 0.9);
        house(g, 0.22, 0.12, c, 0.75);
        house(g, 0, -0.18, c, t.city.capital !== null ? 1.5 : 1.15);
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
          `${t.city.capital !== null ? "♛ " : ""}${t.city.name}`,
          t.x - 5,
          0.2,
          t.z - 4.55,
          `city-label owner-${t.owner}`,
        );
      }
      if (t.beacon) {
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
        addLabel("◇ BEACON", t.x - 5, 1.52, t.z - 5, "beacon-label");
      }
      if (
        !t.city &&
        !t.beacon &&
        !t.improved &&
        t.terrain === "grass" &&
        t.id % 3 === 0
      ) {
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
    }
    for (const u of s.units.filter((u) => seen.has(u.tile))) {
      const t = s.tiles[u.tile],
        g = new THREE.Group();
      g.name = `Unit_${u.id}_${u.type}`;
      g.position.set(t.x - 5, t.city ? 0.25 : 0, t.z - 5);
      board.add(g);
      const color = factionColors[u.owner];
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
      if (u.type === "guardian")
        mesh(g, "Box", [0.17, 0.24, 0.04], color, -0.15, 0.66, 0.13);
      addLabel(
        `${u.hp} ${u.owner === 0 && !u.attacked ? "•" : ""}`,
        t.x - 5,
        1.4 + (t.city ? 0.25 : 0),
        t.z - 5,
        `hp-label owner-${u.owner} ${u.moved && u.attacked ? "spent" : ""}`,
      );
    }
  }
  function update(s, selectedTile, selectedUnit) {
    state = s;
    selected = selectedTile;
    const signature = JSON.stringify([s.tiles, s.units, s.explored[0]]);
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
        t.x - 5,
        0.34,
        t.z - 5,
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
    const w = host.clientWidth,
      h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    const view = Math.max(8, (8.2 * h) / w);
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
    controls.target.set(0, 0, 0);
    camera.position.set(14, 16, 18);
    camera.zoom = 1;
    camera.updateProjectionMatrix();
    controls.update();
  }
  return {
    update,
    resetCamera,
    zoom: (n) => {
      camera.zoom = THREE.MathUtils.clamp(camera.zoom * n, 0.7, 2.8);
      camera.updateProjectionMatrix();
    },
    exportGLB: async () => {
      const { GLTFExporter } =
        await import("three/addons/exporters/GLTFExporter.js");
      const data = await new GLTFExporter().parseAsync(board, { binary: true });
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
        p = new THREE.Vector3(t.x - 5, 0.32, t.z - 5).project(camera);
      return {
        x: ((p.x + 1) * host.clientWidth) / 2,
        y: ((-p.y + 1) * host.clientHeight) / 2,
      };
    },
  };
}
