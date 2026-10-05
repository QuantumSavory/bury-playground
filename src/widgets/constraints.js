import { PALETTE } from "../core/graph.js";
export function renderConstraints(element, state, validation, actions) {
  element.innerHTML = `<p class="section-number">02 / CONSTRAIN</p><h2>Size your hamlets</h2><label for="hamlet-count">Number of hamlets</label><select id="hamlet-count">${Array.from(
    { length: 7 },
    (_, i) => i + 2,
  )
    .map((k) => `<option ${k === state.k ? "selected" : ""}>${k}</option>`)
    .join(
      "",
    )}</select><label class="check-label"><input id="balanced" type="checkbox" ${state.balanced ? "checked" : ""}> Balance sizes automatically</label><p class="hint">Each vertex needs one home. ${state.balanced ? "Sizes differ by at most one." : "Set exact sizes; their sum must equal the vertex count."}</p><div class="capacity-list">${state.targets.map((target, h) => `<div class="capacity-row ${validation.counts[h] > target ? "over" : ""}"><span class="color-dot" style="--color:${PALETTE[h]}"></span><label for="capacity-${h}">H${h + 1}</label><div class="capacity-track"><span style="width:${target ? Math.min(100, (validation.counts[h] / target) * 100) : 0}%;background:${PALETTE[h]}"></span></div><span class="used">${validation.counts[h]} /</span><input id="capacity-${h}" aria-label="Hamlet ${h + 1} target size" type="number" min="0" max="100" step="1" value="${target}" ${state.balanced ? "disabled" : ""}></div>`).join("")}</div><div class="constraint-status ${validation.errors.length ? "warning" : validation.complete ? "success" : ""}" role="status">${validation.errors.length ? validation.errors.map((e) => `<p>${e}</p>`).join("") : validation.complete ? "✓ All vertices assigned. Sizes satisfied." : `${validation.uncolored} unassigned · ${state.targets.reduce((a, b) => a + b, 0)} total places`}</div><p class="hint last">These are graph-state qubits per QPU; protocol ancillas are not modeled.</p>`;
  element.querySelector("#hamlet-count").onchange = (e) =>
    actions.setK(Number(e.target.value));
  element.querySelector("#balanced").onchange = (e) =>
    actions.setBalanced(e.target.checked);
  element.querySelectorAll('[id^="capacity-"]').forEach((input, h) => {
    input.onchange = () =>
      actions.setTarget(h, input.value === "" ? NaN : Number(input.value));
  });
}
