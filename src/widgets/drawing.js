import { PALETTE } from "../core/graph.js";
export function renderDrawing(element, state, actions) {
  const tools = [
    ["move", "↖", "Move"],
    ["paint", "●", "Color"],
    ["vertex", "+", "Vertex"],
    ["edge", "⌁", "Edge"],
    ["erase", "×", "Delete"],
  ];
  element.innerHTML = `<div class="drawing-toolbar" role="group" aria-label="Graph tools">${tools.map(([id, icon, label]) => `<button data-tool="${id}" aria-pressed="${state.tool === id}" title="${label}"><span aria-hidden="true">${icon}</span> ${label}</button>`).join("")}<button id="clear-colors" class="clear-colors">Clear colors</button></div><div class="palette-bar"><span>Paint with</span><div class="palette" role="group" aria-label="Hamlet colors">${state.targets.map((_, h) => `<button data-color="${h}" style="--color:${PALETTE[h]}" aria-label="Select Hamlet ${h + 1} color" aria-pressed="${state.color === h}" title="Hamlet ${h + 1} · press ${h + 1}">${h + 1}</button>`).join("")}<button data-color="none" class="unassigned-color" aria-label="Select unassigned color" aria-pressed="${state.color == null}" title="Unassign · press 0">0</button></div><span class="shortcut-hint">keys 1–${state.k} · 0 to unassign</span></div>`;
  element.querySelectorAll("[data-tool]").forEach((button) => {
    button.onclick = () => actions.setTool(button.dataset.tool);
  });
  element.querySelectorAll("[data-color]").forEach((button) => {
    button.onclick = () =>
      actions.selectColor(
        button.dataset.color === "none" ? null : Number(button.dataset.color),
      );
  });
  element.querySelector("#clear-colors").onclick = actions.clearColors;
}
