import { edgeId } from "./graph.js";
// Exact bipartite maximum matching by augmenting paths. Each hamlet pair is independent.
export function matchingBetween(graph, colors, a, b) {
  const neighbors = new Map(
    graph.nodes.filter((n) => colors[n.id] === a).map((n) => [n.id, []]),
  );
  for (const [u, v] of graph.edges) {
    if (colors[u] === a && colors[v] === b) neighbors.get(u).push(v);
    if (colors[v] === a && colors[u] === b) neighbors.get(v).push(u);
  }
  const matchedRight = new Map();
  function augment(u, seen) {
    for (const v of neighbors.get(u)) {
      if (seen.has(v)) continue;
      seen.add(v);
      if (!matchedRight.has(v) || augment(matchedRight.get(v), seen)) {
        matchedRight.set(v, u);
        return true;
      }
    }
    return false;
  }
  for (const u of neighbors.keys()) augment(u, new Set());
  return Array.from(matchedRight, ([v, u]) => edgeId(u, v));
}
export function scoreGraph(graph, colors, k) {
  const pairs = [];
  for (let a = 0; a < k; a++)
    for (let b = a + 1; b < k; b++) {
      const edges = matchingBetween(graph, colors, a, b);
      pairs.push({ a, b, size: edges.length, edges });
    }
  const cutEdges = graph.edges.filter(
    ([a, b]) =>
      colors[a] != null && colors[b] != null && colors[a] !== colors[b],
  ).length;
  return { total: pairs.reduce((sum, p) => sum + p.size, 0), cutEdges, pairs };
}
