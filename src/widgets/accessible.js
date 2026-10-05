export function renderAccessible(element, state, actions) {
  element.innerHTML = `<p class="hint">Number keys choose a paint color (0 unassigns). Escape cancels an edge. In BURY mode, → steps and Space runs/pauses. Shortcuts are ignored while typing in controls.</p><div class="accessible-actions"><button id="accessible-add">Add vertex</button><form id="accessible-edge"><label>From <select name="from" aria-label="Edge source">${state.graph.nodes.map((n) => `<option>${n.id}</option>`).join("")}</select></label><label>To <select name="to" aria-label="Edge target">${state.graph.nodes.map((n) => `<option>${n.id}</option>`).join("")}</select></label><button ${state.graph.nodes.length < 2 ? "disabled" : ""}>Add edge</button></form></div><div class="vertex-list">${state.graph.nodes.map((n) => `<label>Vertex ${n.id}<select aria-label="Vertex ${n.id} hamlet" data-vertex="${n.id}"><option value="none">Unassigned</option>${state.targets.map((_, h) => `<option value="${h}" ${state.colors[n.id] === h ? "selected" : ""}>H${h + 1}</option>`).join("")}</select></label>`).join("")}</div>`;
  element.querySelector("#accessible-add").onclick = actions.add;
  element.querySelector("#accessible-edge").onsubmit = (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    actions.edge(Number(data.get("from")), Number(data.get("to")));
  };
  element.querySelectorAll("[data-vertex]").forEach((select) => {
    select.onchange = () =>
      actions.color(
        Number(select.dataset.vertex),
        select.value === "none" ? null : Number(select.value),
      );
  });
}
