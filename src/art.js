import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ARMY_ASSETS, appearanceFor } from "./appearance.js";

export const ART_ASSETS = [
  "cottage",
  "keep",
  "tower",
  "market",
  "barracks",
  "workshop",
  "wall",
  "pine",
  "oak",
  "rocks",
  "mountain",
  "farm",
  "farm2",
  "lumber",
  "beacon",
  "scout",
  "guardian",
  "archer",
  "sentinel",
];
export async function loadArt() {
  const [gltf, armies] = await Promise.all(
    ["kingdom", "armies"].map((name) =>
      new GLTFLoader().loadAsync(
        `${import.meta.env.BASE_URL}models/${name}.glb`,
      ),
    ),
  );
  const prototypes = new Map([
    ...ART_ASSETS.map((name) => [name, gltf.scene.getObjectByName(name)]),
    ...ARMY_ASSETS.map((name) => [name, armies.scene.getObjectByName(name)]),
  ]);
  for (const [name, object] of prototypes)
    if (!object) throw new Error(`Missing Blender model: ${name}`);
  const factionMaterials = new Map();
  let teamColors = [0x75e4c0, 0xed9375];
  const library = {
    setColors(colors) {
      teamColors = colors;
    },
    add(
      parent,
      name,
      x = 0,
      y = 0,
      z = 0,
      scale = 1,
      owner = null,
      rotation = 0,
      skinVariant = 0,
    ) {
      const object = prototypes.get(name).clone(true);
      object.position.set(x, y, z);
      object.scale.multiplyScalar(scale);
      object.rotation.y += rotation;
      object.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = child.receiveShadow = true;
        if (
          ["Faction_cloth", "Faction_sail", "Beacon_crystal", "Skin"].includes(
            child.material.name,
          )
        ) {
          const key = `${child.material.uuid}:${owner}:${teamColors[owner]}:${child.material.name === "Skin" ? skinVariant : 0}`;
          if (!factionMaterials.has(key)) {
            const mat = child.material.clone();
            mat.color.set(owner === null ? 0x666d67 : teamColors[owner]);
            mat.color.multiplyScalar(0.65);
            if (child.material.name === "Faction_sail") {
              mat.color.lerp(new THREE.Color(0xe6dfc5), 0.35);
              mat.side = THREE.DoubleSide;
            }
            if (child.material.name === "Faction_cloth")
              mat.side = THREE.DoubleSide;
            if (child.material.name === "Skin")
              mat.color.set([0xb77750, 0xd5a17b, 0x825037][skinVariant % 3]);
            if (child.material.name === "Beacon_crystal") {
              mat.color.set(owner === null ? 0xe5ce83 : teamColors[owner]);
              mat.emissive.copy(mat.color).multiplyScalar(0.3);
            }
            factionMaterials.set(key, mat);
          }
          child.material = factionMaterials.get(key);
        }
      });
      parent.add(object);
      return object;
    },
    addArmy(parent, s, u) {
      const a = appearanceFor(s, u),
        g = new THREE.Group();
      parent.add(g);
      g.name = `Livery_${a.tribe}_${a.style}`;
      g.rotation.y = u.owner === 0 ? -0.35 : Math.PI - 0.35;
      g.position.y = a.naval || a.embarked ? -0.08 : 0.38;
      const scale = a.naval || a.embarked ? 0.78 : a.mounted ? 0.84 : 1;
      g.scale.setScalar(scale);
      library.add(g, a.body, 0, 0, 0, 1, u.owner, 0, a.skin);
      if (a.naval || a.embarked) library.add(g, a.prow, 0, 0, 0, 1, u.owner);
      if (a.embarked) {
        const passenger = new THREE.Group();
        passenger.position.set(0, 0.19, 0);
        passenger.scale.setScalar(0.55);
        g.add(passenger);
        library.add(
          passenger,
          a.mounted ? "unit_scout" : "unit_" + u.type,
          0,
          0,
          0,
          1,
          u.owner,
          0,
          a.skin,
        );
        library.add(passenger, a.outfit, 0, 0, 0, 1, u.owner);
      } else if (!a.naval)
        library.add(g, a.outfit, 0, a.mounted ? 0.27 : 0, 0, 1, u.owner);
      return g;
    },
  };
  return library;
}

// The editable hierarchy remains intact for picking/export. Rendering uses shared
// geometry/material batches, avoiding thousands of individual prop draw calls.
export function rebuildBatches(source, target) {
  for (const child of target.children) child.dispose(); // instance buffers only; shared art stays cached
  target.clear();
  source.updateMatrixWorld(true);
  const batches = new Map();
  source.traverse((object) => {
    if (!object.isMesh) return;
    const key = `${object.geometry.uuid}:${Array.isArray(object.material) ? object.material.map((m) => m.uuid).join() : object.material.uuid}`;
    if (!batches.has(key))
      batches.set(key, {
        geometry: object.geometry,
        material: object.material,
        transforms: [],
      });
    batches.get(key).transforms.push(object.matrixWorld.clone());
  });
  for (const { geometry, material, transforms } of batches.values()) {
    const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
    transforms.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    target.add(mesh);
  }
}
