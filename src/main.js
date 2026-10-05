import "./style.css";
import {
  MAX_NODES,
  balancedTargets,
  edgeId,
  inspectConstraints,
} from "./core/graph.js";
import { PRESETS } from "./core/presets.js";
import { createSession, previewStep, nextStep } from "./core/bury.js";
import { scoreGraph } from "./core/metric.js";
import { mountPresets } from "./widgets/presets.js";
import { renderConstraints } from "./widgets/constraints.js";
import { renderDrawing } from "./widgets/drawing.js";
import { createGraphView } from "./widgets/graph-view.js";
import { renderMetric } from "./widgets/metric.js";
import { renderPlayback, describeAction } from "./widgets/playback.js";
import { renderAccessible } from "./widgets/accessible.js";

const $ = (id) => document.getElementById(id);
const state = {
  graph: PRESETS[0].generate({ rows: 4, columns: 4 }),
  name: "4 × 4 grid",
  colors: {},
  k: 2,
  targets: [8, 8],
  balanced: true,
  color: 0,
  mode: "bury",
  tool: "move",
  edgeSource: null,
  pair: "all",
  showMatching: true,
  session: null,
  history: [],
  running: false,
  speed: 650,
  notice: "",
};
let timer = null;
function pause() {
  clearTimeout(timer);
  timer = null;
  state.running = false;
}
function resetRun(message = "") {
  pause();
  state.session = null;
  state.history = [];
  state.notice = message;
}
function graphChanged() {
  resetRun(
    "Graph edited. The next BURY step starts from the current coloring.",
  );
  state.name = "Custom graph";
  if (state.balanced)
    state.targets = balancedTargets(state.graph.nodes.length, state.k);
  render();
}
function paint(id, color) {
  resetRun("Manual colors are fixed when you continue with BURY.");
  if (color == null) delete state.colors[id];
  else state.colors[id] = color;
  state.mode = "manual";
  render();
}
function addVertex(position) {
  if (state.graph.nodes.length >= MAX_NODES) {
    state.notice = `The teaching canvas supports up to ${MAX_NODES} vertices.`;
    render();
    return;
  }
  const id = Math.max(0, ...state.graph.nodes.map((n) => n.id)) + 1;
  state.graph.nodes.push({
    id,
    x: position?.x ?? (id % 7) * 70,
    y: position?.y ?? Math.floor(id / 7) * 70,
  });
  graphChanged();
}
function addEdge(a, b) {
  if (a === b) {
    state.notice = "Choose two different vertices; this is a simple graph.";
    render();
    return;
  }
  if (state.graph.edges.some(([u, v]) => edgeId(u, v) === edgeId(a, b))) {
    state.notice = "That edge already exists.";
    render();
    return;
  }
  state.graph.edges.push([a, b]);
  graphChanged();
}
const graphView = createGraphView($("graph"), {
  nodeTap(id) {
    if (state.tool === "paint") paint(id, state.color);
    if (state.tool === "edge") {
      if (state.edgeSource == null) {
        state.edgeSource = id;
        render();
      } else {
        const source = state.edgeSource;
        state.edgeSource = null;
        addEdge(source, id);
      }
    }
    if (state.tool === "erase") {
      state.graph.nodes = state.graph.nodes.filter((n) => n.id !== id);
      state.graph.edges = state.graph.edges.filter(
        ([a, b]) => a !== id && b !== id,
      );
      delete state.colors[id];
      state.edgeSource = null;
      graphChanged();
    }
  },
  edgeTap(a, b) {
    if (state.tool === "erase") {
      state.graph.edges = state.graph.edges.filter(
        ([u, v]) => edgeId(u, v) !== edgeId(a, b),
      );
      graphChanged();
    }
  },
  backgroundTap(position) {
    if (state.tool === "vertex") addVertex(position);
    else if (state.edgeSource != null) {
      state.edgeSource = null;
      render();
    }
  },
  moveNode(id, position) {
    Object.assign(
      state.graph.nodes.find((n) => n.id === id),
      position,
    );
  },
});
function fresh() {
  resetRun("Colors cleared. Ready for the first BURY step.");
  state.colors = {};
  state.mode = "bury";
  state.tool = "move";
  state.edgeSource = null;
  render();
}
function step() {
  const validation = inspectConstraints(
    state.graph,
    state.colors,
    state.targets,
  );
  if (validation.errors.length || validation.complete) {
    pause();
    render();
    return;
  }
  state.mode = "bury";
  state.tool = "move";
  state.edgeSource = null;
  if (!state.session) {
    state.session = createSession(state.graph, state.colors, state.targets);
    state.history = [
      {
        session: structuredClone(state.session),
        score: scoreGraph(state.graph, state.colors, state.k).total,
      },
    ];
  }
  state.session = nextStep(state.graph, state.session);
  state.colors = { ...state.session.colors };
  state.history.push({
    session: structuredClone(state.session),
    score: scoreGraph(state.graph, state.colors, state.k).total,
  });
  state.notice = describeAction(state.session.last);
  if (state.session.done) {
    pause();
    state.notice += " Partition complete.";
  }
  $("announcement").textContent = `Step ${state.session.step}. ${state.notice}`;
  render();
}
function schedule() {
  timer = setTimeout(() => {
    step();
    if (state.running) schedule();
  }, state.speed);
}
function run() {
  if (state.running) {
    pause();
    state.notice = "Paused. Continue one step at a time or resume the run.";
    render();
    return;
  }
  const validation = inspectConstraints(
    state.graph,
    state.colors,
    state.targets,
  );
  if (validation.errors.length || validation.complete) return;
  state.running = true;
  step();
  if (state.running) schedule();
}
function selectColor(color) {
  pause();
  state.color = color;
  state.mode = "manual";
  state.tool = "paint";
  state.edgeSource = null;
  render();
}
function render() {
  const focused = document.activeElement;
  const focusSelector = focused?.id
    ? `#${focused.id}`
    : focused?.dataset.vertex
      ? `[data-vertex="${focused.dataset.vertex}"]`
      : focused?.dataset.tool
        ? `[data-tool="${focused.dataset.tool}"]`
        : focused?.dataset.color
          ? `[data-color="${focused.dataset.color}"]`
          : null;
  const pairDetailsOpen = document.querySelector(".pair-details")?.open;
  const validation = inspectConstraints(
    state.graph,
    state.colors,
    state.targets,
  );
  const metric = scoreGraph(state.graph, state.colors, state.k);
  const preview =
    validation.errors.length || validation.complete
      ? null
      : previewStep(
          state.graph,
          state.session ??
            createSession(state.graph, state.colors, state.targets),
        );
  $("graph-count").textContent =
    `${state.graph.nodes.length} vertices · ${state.graph.edges.length} edges`;
  $("canvas-badge").textContent = state.name;
  $("mode-manual").setAttribute("aria-pressed", state.mode === "manual");
  $("mode-bury").setAttribute("aria-pressed", state.mode === "bury");
  const instruction = {
    move:
      state.mode === "bury"
        ? "Drag to arrange · scroll to zoom · labels are ID · weight"
        : "Drag vertices to arrange · scroll to zoom",
    paint: `Click a vertex to ${state.color == null ? "unassign it" : `assign it to Hamlet ${state.color + 1}`}. Neighbors may share a color.`,
    vertex: "Click empty canvas to add a vertex.",
    edge:
      state.edgeSource == null
        ? "Click two vertices to connect them."
        : `Vertex ${state.edgeSource} selected. Click the other endpoint; Escape cancels.`,
    erase: "Click a vertex or edge to delete it.",
  };
  $("graph-instruction").textContent = instruction[state.tool];
  renderConstraints($("constraints-widget"), state, validation, {
    setK(k) {
      resetRun("Hamlet count changed; balanced sizes recalculated.");
      state.k = k;
      state.balanced = true;
      state.targets = balancedTargets(state.graph.nodes.length, k);
      state.pair = "all";
      if (state.color >= k) state.color = 0;
      Object.keys(state.colors).forEach((id) => {
        if (state.colors[id] >= k) delete state.colors[id];
      });
      render();
    },
    setBalanced(value) {
      resetRun();
      state.balanced = value;
      if (value)
        state.targets = balancedTargets(state.graph.nodes.length, state.k);
      render();
    },
    setTarget(h, value) {
      if (!Number.isInteger(value) || value < 0 || value > MAX_NODES) {
        state.notice = "Enter a whole hamlet size from 0 to 100.";
        render();
        return;
      }
      resetRun();
      state.targets[h] = value;
      render();
    },
  });
  renderDrawing($("drawing-widget"), state, {
    setTool(tool) {
      pause();
      state.tool = tool;
      state.edgeSource = null;
      if (tool === "paint") state.mode = "manual";
      render();
    },
    selectColor,
    clearColors() {
      resetRun("Colors cleared.");
      state.colors = {};
      render();
    },
  });
  renderMetric($("metric-widget"), state, metric, validation, {
    showMatching(value) {
      state.showMatching = value;
      render();
    },
    inspectPair(value) {
      state.pair = value;
      render();
    },
  });
  renderPlayback(
    $("playback-widget"),
    $("step-widget"),
    state,
    preview,
    validation,
    {
      step,
      run,
      fresh,
      back() {
        pause();
        if (state.history.length < 2) return;
        state.history.pop();
        state.session = structuredClone(state.history.at(-1).session);
        state.colors = { ...state.session.colors };
        state.notice = "Returned to the previous BURY step.";
        state.mode = "bury";
        state.tool = "move";
        state.edgeSource = null;
        render();
      },
      speed(value) {
        state.speed = value;
        if (state.running) {
          clearTimeout(timer);
          schedule();
        }
      },
    },
  );
  renderAccessible($("accessible-widget"), state, {
    add: () => {
      addVertex();
      graphView.fit();
    },
    edge: addEdge,
    color: paint,
  });
  graphView.render(state, preview, metric);
  if (pairDetailsOpen) document.querySelector(".pair-details").open = true;
  if (focusSelector)
    document.querySelector(focusSelector)?.focus({ preventScroll: true });
}
mountPresets($("presets-widget"), (graph, name) => {
  resetRun("New graph ready. All vertices are unassigned.");
  state.graph = graph;
  state.name = name;
  state.colors = {};
  state.edgeSource = null;
  state.pair = "all";
  if (state.balanced)
    state.targets = balancedTargets(graph.nodes.length, state.k);
  state.tool = graph.nodes.length ? "move" : "vertex";
  render();
  graphView.fit();
});
$("mode-manual").onclick = () => {
  pause();
  state.mode = "manual";
  state.tool = "paint";
  state.edgeSource = null;
  render();
};
$("mode-bury").onclick = () => {
  pause();
  state.mode = "bury";
  state.tool = "move";
  state.edgeSource = null;
  render();
};
$("fit-graph").onclick = graphView.fit;
$("zoom-in").onclick = () => graphView.zoom(1.2);
$("zoom-out").onclick = () => graphView.zoom(1 / 1.2);
document.addEventListener("keydown", (e) => {
  if (
    e.target.closest("input, select, textarea, [contenteditable]") ||
    e.ctrlKey ||
    e.metaKey ||
    e.altKey
  )
    return;
  if (/^[0-8]$/.test(e.key) && Number(e.key) <= state.k) {
    e.preventDefault();
    selectColor(e.key === "0" ? null : Number(e.key) - 1);
  }
  if (e.key === "Escape") {
    state.edgeSource = null;
    render();
  }
  if (state.mode === "bury" && e.key === "ArrowRight") {
    e.preventDefault();
    pause();
    step();
  }
  if (
    state.mode === "bury" &&
    e.code === "Space" &&
    !e.target.closest("button, a, summary")
  ) {
    e.preventDefault();
    run();
  }
});
document.addEventListener("focusin", (e) => {
  if (
    state.running &&
    e.target.matches(
      'input[type="number"], #preset, #hamlet-count, [data-vertex]',
    )
  ) {
    pause();
    state.notice = "Paused while you edit. Resume when ready.";
    render();
  }
});
render();
requestAnimationFrame(graphView.fit);

// Optional progressive enhancement for browsers that support the proposed WebMCP API.
const context = document.modelContext;
if (context?.registerTool) {
  const lifecycle = new AbortController();
  const readState = () => ({
    graph: structuredClone(state.graph),
    colors: { ...state.colors },
    targets: [...state.targets],
    step: state.session?.step ?? 0,
    validation: inspectConstraints(state.graph, state.colors, state.targets),
    metric: scoreGraph(state.graph, state.colors, state.k),
  });
  const schema = {
    type: "object",
    properties: {},
    additionalProperties: false,
  };
  const emptyInput = (input) => {
    if (
      input == null ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      Object.keys(input).length
    )
      throw new Error("Expected an empty object.");
  };
  const toolDefs = [
    {
      name: "read_bury_playground",
      description:
        "Read the graph, assignment, constraints, and exact current VCG cost.",
      inputSchema: schema,
      annotations: { readOnlyHint: true },
      execute(input) {
        emptyInput(input);
        return readState();
      },
    },
    {
      name: "advance_bury_one_step",
      description:
        "Preserve current colors and execute one visible BURY construction step. Does not restart or recolor a complete partition.",
      inputSchema: schema,
      annotations: { readOnlyHint: false },
      execute(input) {
        emptyInput(input);
        const validation = inspectConstraints(
          state.graph,
          state.colors,
          state.targets,
        );
        if (validation.errors.length)
          throw new Error(validation.errors.join(" "));
        pause();
        step();
        return readState();
      },
    },
  ];
  for (const tool of toolDefs) {
    try {
      Promise.resolve(
        context.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {});
    } catch {
      /* The app does not require this optional API. */
    }
  }
  window.addEventListener("pagehide", () => lifecycle.abort(), { once: true });
}
