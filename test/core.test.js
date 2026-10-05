import test from "node:test";
import assert from "node:assert/strict";
import { createSession, nextStep, previewStep } from "../src/core/bury.js";
import { balancedTargets, inspectConstraints } from "../src/core/graph.js";
import { scoreGraph } from "../src/core/metric.js";
import { PRESETS } from "../src/core/presets.js";

const graph = (n, edges) => ({
  nodes: Array.from({ length: n }, (_, i) => ({ id: i + 1, x: i, y: 0 })),
  edges,
});
function finish(g, targets, colors = {}) {
  let session = createSession(g, colors, targets),
    steps = 0;
  while (!session.done) {
    assert.ok(
      steps++ < 2 * g.nodes.length + targets.length,
      "construction must terminate",
    );
    const previousCount = Object.keys(session.colors).length;
    session = nextStep(g, session);
    assert.ok(
      Object.keys(session.colors).length > previousCount,
      "each visible step must assign vertices",
    );
  }
  assert.equal(inspectConstraints(g, session.colors, targets).complete, true);
  return session;
}
test("paper Figure example: 4×4 grid, colored centers remain candidates", () => {
  const g = PRESETS[0].generate({ rows: 4, columns: 4 });
  let s = createSession(g, {}, [8, 8]);
  assert.equal(previewStep(g, s).costs[1], 3);
  s = nextStep(g, s);
  assert.deepEqual(Object.keys(s.colors).map(Number), [1, 2, 5]);
  assert.equal(previewStep(g, s).center, 2);
  s = nextStep(g, s);
  assert.deepEqual(Object.keys(s.colors).map(Number), [1, 2, 3, 5, 6]);
  s = nextStep(g, s);
  assert.equal(s.last.center, 5);
  assert.equal(s.last.cost, 1);
  s = nextStep(g, s);
  assert.equal(s.last.kind, "fallback");
  s = nextStep(g, s);
  assert.deepEqual(Object.keys(s.colors).map(Number), [1, 2, 3, 4, 5, 6, 7, 9]);
  s = nextStep(g, s);
  assert.equal(s.last.kind, "finish");
  assert.equal(s.done, true);
});
test("strict paper inequality rejects an exactly fitting neighborhood", () => {
  const g = graph(3, [
    [1, 3],
    [2, 3],
  ]);
  const s = nextStep(g, createSession(g, {}, [2, 1]));
  assert.equal(s.last.kind, "fallback");
  assert.deepEqual(s.colors, { 1: 0 });
  assert.deepEqual(finish(g, [2, 1]).colors, { 1: 0, 2: 0, 3: 1 });
});
test("VCG score counts maximum matchings, not cut edges", () => {
  const star = scoreGraph(
    graph(4, [
      [1, 2],
      [1, 3],
      [1, 4],
    ]),
    { 1: 0, 2: 1, 3: 1, 4: 1 },
    2,
  );
  assert.equal(star.total, 1);
  assert.equal(star.cutEdges, 3);
  const biclique = scoreGraph(
    graph(4, [
      [1, 3],
      [1, 4],
      [2, 3],
      [2, 4],
    ]),
    { 1: 0, 2: 0, 3: 1, 4: 1 },
    2,
  );
  assert.equal(biclique.total, 2);
  assert.equal(biclique.cutEdges, 4);
  const triangle = scoreGraph(
    graph(3, [
      [1, 2],
      [2, 3],
      [1, 3],
    ]),
    { 1: 0, 2: 1, 3: 2 },
    3,
  );
  assert.equal(triangle.total, 3);
});
test("augmenting paths reassign earlier edges to reach maximum cardinality", () => {
  const g = graph(4, [
    [1, 3],
    [1, 4],
    [2, 3],
  ]);
  const result = scoreGraph(g, { 1: 0, 2: 0, 3: 1, 4: 1 }, 2);
  assert.equal(result.total, 2);
  assert.deepEqual(new Set(result.pairs[0].edges), new Set(["1-4", "2-3"]));
});
test("matching size agrees with independent brute force for all 3×3 bipartite graphs", () => {
  const allEdges = [
    [1, 4],
    [1, 5],
    [1, 6],
    [2, 4],
    [2, 5],
    [2, 6],
    [3, 4],
    [3, 5],
    [3, 6],
  ];
  function brute(edges, i = 0, used = new Set()) {
    if (i === edges.length) return 0;
    const [a, b] = edges[i];
    let best = brute(edges, i + 1, used);
    if (!used.has(a) && !used.has(b))
      best = Math.max(best, 1 + brute(edges, i + 1, new Set([...used, a, b])));
    return best;
  }
  for (let mask = 0; mask < 512; mask++) {
    const edges = allEdges.filter((_, i) => (mask >> i) & 1);
    assert.equal(
      scoreGraph(graph(6, edges), { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1, 6: 1 }, 2)
        .total,
      brute(edges),
    );
  }
});
test("manual colors stay fixed; most-vacant hamlet is selected", () => {
  const g = graph(8, [
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 8],
  ]);
  const seeds = { 1: 0, 5: 1, 8: 2 };
  const s = createSession(g, seeds, [2, 4, 2]);
  assert.equal(previewStep(g, s).active, 1);
  const result = finish(g, [2, 4, 2], seeds);
  for (const [id, color] of Object.entries(seeds))
    assert.equal(result.colors[id], color);
  assert.equal(nextStep(g, result), result, "complete input is unchanged");
});
test("other hamlets are excluded from BURY weights but remain in the metric", () => {
  const g = graph(4, [
    [1, 2],
    [2, 3],
    [3, 4],
  ]);
  const s = createSession(g, { 1: 0 }, [1, 3]);
  assert.equal(previewStep(g, s).costs[2], 2);
  assert.equal(scoreGraph(g, finish(g, [1, 3], { 1: 0 }).colors, 2).total, 1);
});
test("partial score excludes unassigned vertices and internal edges", () => {
  assert.equal(
    scoreGraph(
      graph(3, [
        [1, 2],
        [2, 3],
      ]),
      { 1: 0, 2: 0 },
      2,
    ).total,
    0,
  );
});
test("impossible sizes and overfilled manual states are rejected", () => {
  const g = graph(3, []);
  assert.throws(() => createSession(g, {}, [1, 1]), /add up/);
  assert.throws(
    () => createSession(g, { 1: 0, 2: 0 }, [1, 2]),
    /over capacity/,
  );
  assert.throws(() => createSession(g, { 1: 3 }, [1, 2]), /unknown/);
  assert.throws(() => createSession(graph(0, []), {}, [0, 0]), /Add vertices/);
});
test("seeded graph presets reproduce topology and obey geometric locality", () => {
  const params = { count: 25, density: 0.4, radius: 0.3, seed: 42 };
  for (const preset of PRESETS.filter((p) =>
    ["random", "spatial"].includes(p.id),
  ))
    assert.deepEqual(preset.generate(params), preset.generate(params));
  const spatial = PRESETS.find((p) => p.id === "spatial").generate(params);
  for (const [a, b] of spatial.edges) {
    const u = spatial.nodes[a - 1],
      v = spatial.nodes[b - 1];
    assert.ok(Math.hypot(u.x - v.x, u.y - v.y) <= 135);
  }
});
test("termination, balance, and seed preservation across sparse/dense/disconnected inputs", () => {
  for (let seed = 0; seed < 30; seed++)
    for (const density of [0, 0.15, 0.7, 1])
      for (const k of [2, 3, 8]) {
        const g = PRESETS.find((p) => p.id === "random").generate({
          count: 25,
          density,
          seed,
        });
        const targets = balancedTargets(25, k);
        const seeds = Object.fromEntries(
          Array.from({ length: k }, (_, h) => [h + 1, h]),
        );
        const result = finish(g, targets, seeds);
        for (const [id, color] of Object.entries(seeds))
          assert.equal(result.colors[id], color);
      }
  finish(graph(3, []), [1, 1, 1, 0]);
});
