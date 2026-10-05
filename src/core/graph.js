export const MAX_NODES = 100;
export const PALETTE = [
  "#187c70",
  "#b25130",
  "#6463b5",
  "#8f7100",
  "#337aa9",
  "#b34f87",
  "#617529",
  "#865b42",
];
export const edgeId = (a, b) => [a, b].sort((x, y) => x - y).join("-");
export function adjacency(graph) {
  const result = new Map(graph.nodes.map((n) => [n.id, []]));
  for (const [a, b] of graph.edges) {
    result.get(a).push(b);
    result.get(b).push(a);
  }
  return result;
}
export function balancedTargets(n, k) {
  return Array.from(
    { length: k },
    (_, i) => Math.floor(n / k) + (i < n % k ? 1 : 0),
  );
}
export function inspectConstraints(graph, colors, targets) {
  const counts = targets.map(
    (_, h) => graph.nodes.filter((n) => colors[n.id] === h).length,
  );
  const uncolored = graph.nodes.filter((n) => colors[n.id] == null).length;
  const errors = [];
  if (!graph.nodes.length)
    errors.push("Add vertices or generate a graph to begin.");
  if (targets.some((t) => !Number.isInteger(t) || t < 0))
    errors.push("Hamlet sizes must be nonnegative whole numbers.");
  if (targets.reduce((a, b) => a + b, 0) !== graph.nodes.length)
    errors.push(`Target sizes must add up to ${graph.nodes.length} vertices.`);
  if (
    graph.nodes.some(
      (n) =>
        colors[n.id] != null &&
        (!Number.isInteger(colors[n.id]) ||
          colors[n.id] < 0 ||
          colors[n.id] >= targets.length),
    )
  )
    errors.push("A vertex has an unknown hamlet.");
  counts.forEach((count, h) => {
    if (count > targets[h])
      errors.push(
        `Hamlet ${h + 1} is over capacity: ${count} / ${targets[h]}.`,
      );
  });
  return {
    counts,
    uncolored,
    errors,
    complete: !errors.length && uncolored === 0,
  };
}
