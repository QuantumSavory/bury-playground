# BURY playground · Quantum Hamlets

**[Open the interactive playground](https://quantumsavory.github.io/bury-playground/)** · **[Read the paper](https://arxiv.org/abs/2603.06387)** · **[QuantumHamlets.jl](https://github.com/QuantumSavory/QuantumHamlets.jl)**

A small, self-contained teaching app for **BURY**, the graph-state partitioning heuristic introduced in **Quantum Hamlets: Distributed Compilation of Large Algorithmic Graph States** by Anthony Micciche, Naphan Benchasattabuse, Andrew McGregor, Michal Hajdušek, Rodney Van Meter, and Stefan Krastanov.

The paper studies assigning graph-state qubits to distributed quantum processors (hamlets) while reducing long-range Bell-pair consumption. Read it for the physical motivation, the vertex cover grafting (VCG) generation protocol, algorithm analysis, and applications to measurement-based quantum computing. This app concentrates on BURY alone.

## Try it

1. Generate a **2D grid**, **random graph with any-pair connectivity**, **spatial 2D random graph**, **ring**, **star**, or **complete graph**. Random generators expose probability and seed; spatial graphs also expose a distance cutoff. Or choose **Blank canvas**.
2. Use **Vertex** to add nodes, **Edge** to connect two nodes, **Move** to drag, and **Delete** to remove a vertex or edge. Pan the background, scroll to zoom, and use **Fit** to recenter.
3. Choose 2–8 hamlets and balanced target sizes, or enter custom exact sizes. Targets must sum to the vertex count. Overfilled hamlets produce warnings and block BURY.
4. In **Manual color**, choose a color and click vertices. Keys **1–8** select hamlets; **0** unassigns. Equal-colored neighbors are allowed: this is partitioning, not proper graph coloring.
5. Select **BURY**, then **Next step** or **Run to completion**. Continue from a partial manual assignment or **Start from scratch**. Watch weights, the next neighborhood, new assignments, capacity use, and the exact score. **Back**, **Pause**, and speed controls support a live lesson.
6. Inspect a hamlet pair to highlight its maximum matching. A star is a useful lesson: many crossing edges can need just one Bell pair under VCG.

In BURY mode, **Right Arrow** steps and **Space** runs/pauses when focus is outside controls with native Space behavior. Shortcuts do not intercept text entry. The expandable vertex list provides keyboard coloring and graph creation. The graph is limited to 100 vertices to keep the lesson legible and responsive. No account, backend, external runtime CDN, or telemetry is required. State stays in memory; reloading starts over.

## Scientific conventions

The figure of merit is

\[
F = \sum_{i<j} \nu\bigl(G[V_i,V_j]\bigr),
\]

where each term is the cardinality of a **maximum bipartite matching** across one hamlet pair. This is the Bell-pair consumption of the paper's **VCG** protocol. It is not the number of cut edges and is not claimed to be a protocol-independent minimum. Internal edges contribute nothing. Different pairs are independent, so their highlighted matchings need not form a single global matching. The score always uses the original graph, including edges to completed hamlets.

The manuscript's Algorithm 1 and its surrounding discussion determine the construction:

- A vertex's weight counts uncolored vertices in its closed neighborhood in the active graph. Initially it is degree + 1.
- Pick the minimum positive weight globally, breaking ties by vertex ID. Already-colored vertices remain eligible when they still have uncolored active neighbors.
- Bury a neighborhood if **w < r**, where r is remaining space. Otherwise assign one uncolored vertex, choosing the lowest ID for reproducibility. Recompute weights after either action.
- Vertices with zero cost are already buried; their no-op bookkeeping steps are omitted.
- Once a hamlet is full, remove it from the active graph and continue. Assign the final residual vertices together.

**Paper/code difference:** Algorithm 1 of the manuscript uses strict **w < r**; the [Julia reference implementation](https://github.com/QuantumSavory/QuantumHamlets.jl/blob/master/src/QuantumHamlets.jl) uses **w ≤ r**. This app deliberately follows the manuscript. Tie-breaking and fallback choices can also produce different final partitions. It is a teaching implementation, not a bit-for-bit port of the Julia package.

**Manual continuation and custom sizes:** the paper's dynamic-compilation discussion proposes precoloring and remaining capacities, filling the most-vacant hamlet next. This app uses that extension, holding manual colors fixed and excluding other colored hamlets from the current active graph. Equal vacancy counts break by hamlet index. Balanced blank input follows hamlets in index order. A finished manual partition is already terminal: BURY does not recolor it. Clear some colors to resume, or start fresh.

**Completion, not iterative optimization:** BURY constructs one partition; it does not repeatedly refine a completed assignment or guarantee a global optimum. Partial scores exclude unassigned vertices and can increase during construction. On later hamlets, “buried” refers only to the residual graph. All-to-all connectivity between QPUs is assumed, independently of whether the input graph state has 2D-local edges. The app models static graph-state placement, not the physical generation protocol's ancilla resources or measurement scheduling.

## Run locally

Requires Node.js 22.12+ (Node 24 LTS is used in CI).

```sh
npm ci
npm run dev
```

```sh
npm test                 # algorithm, constraints, presets, exact matching
npm run build           # standalone static output in dist/
npm run preview         # serve the production build
npx playwright install chromium
npm run test:browser    # editing, playback, warnings, keyboard, responsive layout
```

Deploy the contents of `dist/` to any static host. Vite's relative asset base makes the build work under a GitHub Pages repository path. Production needs only static file serving; npm is a development/build dependency.

## Small architecture

| Responsibility                                     | Files                                  |
| -------------------------------------------------- | -------------------------------------- |
| Serializable graph data, colors, sizes, validation | `src/core/graph.js`                    |
| Pure BURY session, next-step preview and execution | `src/core/bury.js`                     |
| Exact augmenting-path bipartite matching and score | `src/core/metric.js`                   |
| Graph family registry and seeded generators        | `src/core/presets.js`                  |
| Independent preset and drawing widgets             | `src/widgets/presets.js`, `drawing.js` |
| Cytoscape visualization adapter                    | `src/widgets/graph-view.js`            |
| Capacity, metric, playback and accessible controls | `src/widgets/`                         |
| App state and action wiring                        | `src/main.js`                          |
| Presentation and explanatory content               | `index.html`, `src/style.css`          |

**Adding a preset:** add an entry to `PRESETS` with `id`, `name`, `description`, `fields`, and a pure `generate(params)` function returning `{ nodes: [{ id, x, y }], edges: [[sourceId, targetId]] }`. The preset widget discovers it automatically. Add any new parameter definitions to the field map in `src/widgets/presets.js`. The drawing widget and BURY engine need no changes. Graphs are simple, undirected, and have unique positive integer IDs.

**Library decisions:** [Cytoscape.js](https://js.cytoscape.org/) is the sole runtime dependency: it already supplies graph rendering, hit-testing, dragging, pan/zoom, styles, and mutations. Two-click edge creation needs no extension. [D3's drag](https://d3js.org/d3-drag) and [zoom](https://d3js.org/d3-zoom) primitives were considered, but would require more bespoke graph interaction code. Native HTML controls and a small SVG polyline suffice for forms and score history; a component framework and chart library would add little here. [Vite](https://vite.dev/guide/static-deploy.html) bundles the dependency into a static site. Node's test runner checks the pure functions; Playwright checks the app.

Browsers supporting the proposed `document.modelContext` interface additionally receive optional read-state and advance-one-step tools. They call the same actions as the UI. Unsupported browsers use the ordinary app unchanged. A simulated interface validates the adapters in browser tests; native browser WebMCP interoperability has not been verified.

## Validation and publishing

Tests cover the paper's 4×4 grid first steps, the strict-threshold boundary, already-colored candidate centers, fixed manual colors, residual-graph weights, infeasible constraints, disconnected and dense graph termination, seeded generators, and exact matching against brute-force enumeration of all 512 simple 3×3 bipartite graphs. Browser tests exercise the user workflows and check 390px, 768px, and 1440px layouts.

The GitHub Actions workflow tests and builds the app, then deploys `dist/` to GitHub Pages on pushes to `main`. Pages must be configured to use **GitHub Actions**. See [GitHub's Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Cite the research

```bibtex
@misc{micciche2026quantumhamlets,
  title = {Quantum Hamlets: Distributed Compilation of Large Algorithmic Graph States},
  author = {Anthony Micciche and Naphan Benchasattabuse and Andrew McGregor
            and Michal Hajdu{\v{s}}ek and Rodney Van Meter and Stefan Krastanov},
  year = {2026},
  eprint = {2603.06387},
  archivePrefix = {arXiv},
  primaryClass = {quant-ph},
  url = {https://arxiv.org/abs/2603.06387}
}
```

The app code is MIT licensed. The linked paper and Julia package retain their own licenses.
