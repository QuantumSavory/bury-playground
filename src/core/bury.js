import { adjacency, inspectConstraints } from "./graph.js";

export function createSession(graph, colors, targets) {
  const validation = inspectConstraints(graph, colors, targets);
  if (validation.errors.length) throw new Error(validation.errors.join(" "));
  return {
    colors: { ...colors },
    targets: [...targets],
    active: null,
    processed: [],
    step: 0,
    done: validation.complete,
    last: null,
  };
}
// Fixed manual colors stay fixed. The most-vacant unfinished hamlet is filled next;
// equal vacancies break by hamlet index. With balanced blank input this is H1, H2, ….
function activeHamlet(graph, state) {
  const { counts } = inspectConstraints(graph, state.colors, state.targets);
  if (
    state.active != null &&
    counts[state.active] < state.targets[state.active]
  )
    return state.active;
  let chosen = null,
    largest = 0;
  state.targets.forEach((target, h) => {
    if (target - counts[h] > largest) {
      largest = target - counts[h];
      chosen = h;
    }
  });
  return chosen;
}
export function previewStep(graph, state) {
  if (state.done) return null;
  const active = activeHamlet(graph, state);
  if (active == null) return null;
  const processed = new Set(active === state.active ? state.processed : []);
  const adj = adjacency(graph);
  // Induce the residual graph on unassigned vertices and the active hamlet's seeds.
  const residual = graph.nodes
    .filter((n) => state.colors[n.id] == null || state.colors[n.id] === active)
    .sort((a, b) => a.id - b.id);
  const available = new Set(residual.map((n) => n.id));
  const uncolored = residual
    .filter((n) => state.colors[n.id] == null)
    .map((n) => n.id);
  const remaining =
    state.targets[active] -
    residual.filter((n) => state.colors[n.id] === active).length;
  const costs = {};
  for (const n of residual) {
    if (processed.has(n.id)) continue;
    costs[n.id] = [
      n.id,
      ...adj.get(n.id).filter((id) => available.has(id)),
    ].filter((id) => state.colors[id] == null).length;
  }
  // Paper's k-partition construction assigns the entire final residual region.
  if (remaining === uncolored.length)
    return {
      kind: "finish",
      active,
      remaining,
      cost: uncolored.length,
      center: null,
      newlyColored: uncolored,
      neighborhood: uncolored,
      costs,
    };
  // Zero-cost vertices are already buried; skip their bookkeeping-only iterations.
  const candidates = Object.keys(costs)
    .map(Number)
    .filter((id) => costs[id] > 0)
    .sort((a, b) => costs[a] - costs[b] || a - b);
  const center = candidates[0];
  // Algorithm 1 in the manuscript uses STRICT <. Do not silently change to <=.
  if (center != null && costs[center] < remaining) {
    const neighborhood = [
      center,
      ...adj.get(center).filter((id) => available.has(id)),
    ];
    return {
      kind: "bury",
      active,
      remaining,
      cost: costs[center],
      center,
      neighborhood,
      newlyColored: neighborhood.filter((id) => state.colors[id] == null),
      costs,
    };
  }
  const fallback = uncolored[0];
  return {
    kind: "fallback",
    active,
    remaining,
    cost: 1,
    minCost: center == null ? null : costs[center],
    center: fallback,
    neighborhood: [fallback],
    newlyColored: [fallback],
    costs,
  };
}
export function nextStep(graph, state) {
  const action = previewStep(graph, state);
  if (!action) return state;
  const colors = { ...state.colors };
  action.newlyColored.forEach((id) => {
    colors[id] = action.active;
  });
  const processed = action.active === state.active ? [...state.processed] : [];
  if (action.kind === "bury") processed.push(action.center);
  return {
    ...state,
    colors,
    active: action.active,
    processed,
    step: state.step + 1,
    done: graph.nodes.every((n) => colors[n.id] != null),
    last: action,
  };
}
