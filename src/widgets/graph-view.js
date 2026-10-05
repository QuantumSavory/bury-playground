import cytoscape from "cytoscape";
import { PALETTE, edgeId } from "../core/graph.js";
export function createGraphView(container, actions) {
  const cy = cytoscape({
    container,
    elements: [],
    layout: { name: "preset" },
    minZoom: 0.25,
    maxZoom: 3,
    wheelSensitivity: 0.25,
    style: [
      {
        selector: "node",
        style: {
          "background-color": "data(color)",
          "border-width": 2,
          "border-color": "#fff",
          width: 34,
          height: 34,
          label: "data(label)",
          color: "data(textColor)",
          "font-family": "system-ui",
          "font-size": 11,
          "font-weight": 600,
          "text-valign": "center",
          "text-halign": "center",
          "overlay-opacity": 0,
        },
      },
      {
        selector: "edge",
        style: {
          width: 1.5,
          "line-color": "#bcc9ca",
          "curve-style": "straight",
          "overlay-opacity": 0,
        },
      },
      {
        selector: "edge.internal",
        style: { "line-color": "data(color)", opacity: 0.5 },
      },
      {
        selector: "edge.crossing",
        style: { "line-color": "#8b9c9d", width: 2 },
      },
      {
        selector: "edge.matching",
        style: {
          "line-color": "#243b46",
          width: 4,
          "line-style": "dashed",
          opacity: 1,
          "z-index": 2,
        },
      },
      { selector: ".dimmed", style: { opacity: 0.16 } },
      {
        selector: "node.neighborhood",
        style: { "border-color": "#accab8", "border-width": 5 },
      },
      {
        selector: "node.center",
        style: {
          "border-color": "#192f39",
          "border-width": 4,
          "outline-color": "#c8d9c7",
          "outline-width": 5,
          "outline-opacity": 0.65,
        },
      },
      {
        selector: "node.changed",
        style: {
          "underlay-color": "#e6bf66",
          "underlay-opacity": 0.55,
          "underlay-padding": 7,
        },
      },
      {
        selector: "node.edge-source",
        style: { "border-width": 5, "border-color": "#d59935" },
      },
    ],
  });
  cy.on("tap", "node", (e) => actions.nodeTap(Number(e.target.id())));
  cy.on("tap", "edge", (e) =>
    actions.edgeTap(e.target.data("a"), e.target.data("b")),
  );
  cy.on("tap", (e) => {
    if (e.target === cy) actions.backgroundTap(e.position);
  });
  cy.on("dragfree", "node", (e) =>
    actions.moveNode(Number(e.target.id()), e.target.position()),
  );
  let signature = "";
  function render(state, preview, metric) {
    const nextSignature = JSON.stringify([
      state.graph.nodes.map((n) => n.id),
      state.graph.edges,
    ]);
    if (nextSignature !== signature) {
      signature = nextSignature;
      cy.elements().remove();
      cy.add([
        ...state.graph.nodes.map((n) => ({
          data: {
            id: String(n.id),
            label: String(n.id),
            color: "#e0e7e5",
            textColor: "#2c4647",
          },
          position: { x: n.x, y: n.y },
        })),
        ...state.graph.edges.map(([a, b]) => ({
          data: {
            id: `e${edgeId(a, b)}`,
            source: String(a),
            target: String(b),
            a,
            b,
          },
        })),
      ]);
    }
    const matching = new Set(
      metric.pairs
        .filter((p) => state.pair === "all" || state.pair === `${p.a}-${p.b}`)
        .flatMap((p) => p.edges),
    );
    const pair =
      state.pair === "all" ? null : state.pair.split("-").map(Number);
    cy.batch(() => {
      cy.nodes().forEach((node) => {
        const id = Number(node.id()),
          h = state.colors[id];
        const position = state.graph.nodes.find((n) => n.id === id);
        node.position({ x: position.x, y: position.y });
        const cost = preview?.costs[id];
        const label =
          state.mode === "bury" && cost != null ? `${id}·${cost}` : String(id);
        node.data({
          label,
          color: h == null ? "#e0e7e5" : PALETTE[h],
          textColor: h == null ? "#2c4647" : "#ffffff",
        });
        node.toggleClass(
          "center",
          state.mode === "bury" && preview?.center === id,
        );
        node.toggleClass(
          "neighborhood",
          state.mode === "bury" && !!preview?.neighborhood.includes(id),
        );
        node.toggleClass(
          "changed",
          !!state.session?.last?.newlyColored.includes(id),
        );
        node.toggleClass("edge-source", state.edgeSource === id);
        node.toggleClass("dimmed", pair != null && !pair.includes(h));
      });
      cy.edges().forEach((edge) => {
        const a = state.colors[edge.data("a")],
          b = state.colors[edge.data("b")];
        const assigned = a != null && b != null;
        edge.data("color", assigned && a === b ? PALETTE[a] : "#bcc9ca");
        edge.toggleClass("internal", assigned && a === b);
        edge.toggleClass("crossing", assigned && a !== b);
        edge.toggleClass(
          "matching",
          state.showMatching && matching.has(edge.id().slice(1)),
        );
        edge.toggleClass(
          "dimmed",
          pair != null && !(pair.includes(a) && pair.includes(b) && a !== b),
        );
      });
      if (state.tool === "move") cy.nodes().grabify();
      else cy.nodes().ungrabify();
    });
    container.style.cursor =
      state.tool === "vertex"
        ? "crosshair"
        : state.tool === "move"
          ? "grab"
          : "pointer";
  }
  const fit = () => {
    cy.resize();
    if (cy.nodes().length) cy.fit(undefined, 55);
  };
  new ResizeObserver(fit).observe(container);
  return {
    render,
    fit,
    zoom: (factor) =>
      cy.zoom({
        level: cy.zoom() * factor,
        renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
      }),
  };
}
