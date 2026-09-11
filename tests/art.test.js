import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Blender pack contains every runtime prototype, normals and portable PBR textures", () => {
  const file = readFileSync(
    new URL("../public/models/kingdom.glb", import.meta.url),
  );
  assert.equal(file.toString("utf8", 0, 4), "glTF");
  assert.equal(file.readUInt32LE(8), file.length);
  assert.ok(file.length < 8 * 1024 * 1024, "Keep the pack below 8 MiB");
  const doc = JSON.parse(file.toString("utf8", 20, 20 + file.readUInt32LE(12)));
  const names = [
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
  for (const name of names)
    assert.ok(
      doc.nodes.some((n) => n.name === name),
      `Missing ${name}`,
    );
  assert.ok(doc.materials.some((m) => m.name === "Faction_cloth"));
  assert.ok(
    doc.materials.filter(
      (m) => m.normalTexture && m.pbrMetallicRoughness.baseColorTexture,
    ).length >= 5,
  );
  assert.ok(
    doc.materials.some((m) => m.pbrMetallicRoughness.metallicFactor > 0.5),
  );
  for (const mesh of doc.meshes)
    for (const p of mesh.primitives)
      assert.ok(p.attributes.NORMAL !== undefined);
  assert.ok(
    doc.images.every((image) => image.bufferView !== undefined),
    "No external texture dependencies",
  );
});
