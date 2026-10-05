// Add a generator to PRESETS to expose it automatically in the preset widget.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function grid({ rows, columns }) {
  const nodes = [],
    edges = [];
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < columns; x++) {
      const id = y * columns + x + 1;
      nodes.push({ id, x: x * 85, y: y * 85 });
      if (x) edges.push([id - 1, id]);
      if (y) edges.push([id - columns, id]);
    }
  return { nodes, edges };
}
function randomGraph({ count, density, seed, radius }, spatial) {
  const random = rng(seed),
    nodes = [],
    edges = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI;
    nodes.push({
      id: i + 1,
      x: spatial ? random() * 450 : 225 + 210 * Math.cos(angle),
      y: spatial ? random() * 450 : 225 + 210 * Math.sin(angle),
    });
  }
  for (let i = 0; i < count; i++)
    for (let j = i + 1; j < count; j++) {
      const close =
        Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y) <=
        radius * 450;
      if ((!spatial || close) && random() < density) edges.push([i + 1, j + 1]);
    }
  return { nodes, edges };
}
function radial(count, star = false, complete = false) {
  const nodes = Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    x: star && i === 0 ? 225 : 225 + 210 * Math.cos((i * 2 * Math.PI) / count),
    y: star && i === 0 ? 225 : 225 + 210 * Math.sin((i * 2 * Math.PI) / count),
  }));
  const edges = [];
  for (let i = 1; i <= count; i++)
    for (let j = i + 1; j <= count; j++)
      if (
        complete ||
        (star ? i === 1 : j === i + 1 || (i === 1 && j === count))
      )
        edges.push([i, j]);
  return { nodes, edges };
}
export const PRESETS = [
  {
    id: "grid",
    name: "2D grid",
    description: "Nearest-neighbor square lattice.",
    fields: ["rows", "columns"],
    generate: grid,
  },
  {
    id: "random",
    name: "Random · any pair",
    description:
      "Every vertex pair is eligible; density is its edge probability.",
    fields: ["count", "density", "seed"],
    generate: (p) => randomGraph(p, false),
  },
  {
    id: "spatial",
    name: "Random · 2D local",
    description:
      "Only nearby vertices are eligible; edges may cross. This is spatial, not necessarily planar.",
    fields: ["count", "density", "radius", "seed"],
    generate: (p) => randomGraph(p, true),
  },
  {
    id: "ring",
    name: "Ring",
    description: "A cycle with two neighbors per vertex.",
    fields: ["count"],
    generate: (p) => radial(p.count),
  },
  {
    id: "star",
    name: "Star",
    description: "One hub, many leaves: a useful example of matching cost.",
    fields: ["count"],
    generate: (p) => radial(p.count, true),
  },
  {
    id: "complete",
    name: "Complete · all-to-all",
    description: "Every pair of vertices shares an edge.",
    fields: ["count"],
    generate: (p) => radial(p.count, false, true),
  },
  {
    id: "empty",
    name: "Blank canvas",
    description: "Draw your own graph with the vertex and edge tools.",
    fields: [],
    generate: () => ({ nodes: [], edges: [] }),
  },
];
