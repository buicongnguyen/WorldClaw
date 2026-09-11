import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

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
  const gltf = await new GLTFLoader().loadAsync(
    `${import.meta.env.BASE_URL}models/kingdom.glb`,
  );
  const prototypes = new Map(
    ART_ASSETS.map((name) => [name, gltf.scene.getObjectByName(name)]),
  );
  for (const [name, object] of prototypes)
    if (!object) throw new Error(`Missing Blender model: ${name}`);
  const factionMaterials = new Map();
  let teamColors = [0x75e4c0, 0xed9375];
  return {
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
    ) {
      const object = prototypes.get(name).clone(true);
      object.position.set(x, y, z);
      object.scale.multiplyScalar(scale);
      object.rotation.y += rotation;
      object.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = child.receiveShadow = true;
        if (["Faction_cloth", "Beacon_crystal"].includes(child.material.name)) {
          const key = `${child.material.uuid}:${owner}:${teamColors[owner]}`;
          if (!factionMaterials.has(key)) {
            const mat = child.material.clone();
            mat.color.set(owner === null ? 0x666d67 : teamColors[owner]);
            mat.color.multiplyScalar(0.65);
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
  };
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
