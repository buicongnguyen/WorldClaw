// A derived overlay keeps legacy terrain and saved maps unchanged.
export function climateAt(s, t) {
  if (!s.climates || t.terrain !== "grass" || t.city || t.beacon)
    return "temperate";
  const size = s.size ?? 11;
  const center = (size - 1) / 2;
  // Guaranteed mirrored adaptation sites on the connected central approaches.
  if (t.x === center && Math.abs(t.z - center) === 1) return "desert";
  if (t.z === center && Math.abs(t.x - center) === 1) return "ice";
  const caps =
    size === 11
      ? [
          [2, 7],
          [8, 3],
        ]
      : [
          [3, 12],
          [13, 4],
        ];
  if (caps.some(([x, z]) => Math.abs(t.x - x) + Math.abs(t.z - z) <= 2))
    return "temperate";
  const mirror = t.id > (size * size - 1) / 2;
  const x = mirror ? size - 1 - t.x : t.x,
    z = mirror ? size - 1 - t.z : t.z;
  const region = (Math.floor(x / 3) + Math.floor(z / 3) + (s.seed % 5)) % 5;
  return region === 0 ? "desert" : region === 1 ? "ice" : "temperate";
}
