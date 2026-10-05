export function describeAction(action) {
  if (!action) return "";
  if (action.kind === "finish")
    return `Assign the final ${action.cost} vertices to H${action.active + 1}.`;
  if (action.kind === "fallback")
    return `No neighborhood has positive cost below ${action.remaining}. Assign vertex ${action.center} to H${action.active + 1}.`;
  return `Bury vertex ${action.center} in H${action.active + 1}: color ${action.cost} new ${action.cost === 1 ? "vertex" : "vertices"} in its closed neighborhood.`;
}
export function renderPlayback(
  element,
  stepElement,
  state,
  preview,
  validation,
  actions,
) {
  const disabled = validation.errors.length > 0 || validation.complete;
  const done = validation.complete;
  element.innerHTML = `<div class="playback-heading"><div><p class="section-number">04 / EXPLORE</p><h2>${state.mode === "manual" ? "Your turn to color" : "Watch BURY build a partition"}</h2></div><span class="step-counter">STEP ${state.session?.step ?? 0}</span></div><p class="hint">${state.mode === "manual" ? "Pick a hamlet color, then click vertices. Capacity warnings appear as you work. Switch to BURY to complete your partial coloring." : done ? "Every vertex has a home. BURY is finished; clear colors to construct a new partition." : "Next step continues from the current coloring. Existing manual assignments stay fixed."}</p><div class="playback-actions"><button id="back-step" aria-label="Go back one BURY step" ${state.history.length < 2 || state.running ? "disabled" : ""}>← Back</button><button id="next-step" class="button" ${disabled || state.running ? "disabled" : ""}>Next step →</button><button id="run-all" class="button primary" ${disabled && !state.running ? "disabled" : ""}>${state.running ? "Ⅱ Pause" : "▶ Run to completion"}</button></div><div class="playback-options"><button id="start-fresh" class="text-button" ${!state.graph.nodes.length ? "disabled" : ""}>↺ Start from scratch</button><label for="speed">Step speed <select id="speed"><option value="1200" ${state.speed === 1200 ? "selected" : ""}>Slow</option><option value="650" ${state.speed === 650 ? "selected" : ""}>Normal</option><option value="180" ${state.speed === 180 ? "selected" : ""}>Fast</option></select></label></div><p id="run-status" class="run-status" role="status">${state.notice || (done ? "Complete. This is a heuristic partition, not a guarantee of the global optimum." : "A step is one burial, one fallback assignment, or the final residual assignment.")}</p>`;
  element.querySelector("#back-step").onclick = actions.back;
  element.querySelector("#next-step").onclick = actions.step;
  element.querySelector("#run-all").onclick = actions.run;
  element.querySelector("#start-fresh").onclick = actions.fresh;
  element.querySelector("#speed").onchange = (e) =>
    actions.speed(Number(e.target.value));
  const action = preview;
  const last = state.session?.last;
  stepElement.innerHTML = `<p class="section-number">THE NEXT MOVE</p><h2>${done ? "Partition complete" : action ? (action.kind === "bury" ? `Bury vertex ${action.center}` : action.kind === "fallback" ? "Fill one remaining place" : "Finish the last hamlet") : "Ready when you are"}</h2>${action ? `<div class="step-facts"><div><span>Active hamlet</span><strong>H${action.active + 1}</strong></div><div><span>Remaining places, r</span><strong>${action.remaining}</strong></div><div><span>${action.kind === "bury" ? "Bury cost, w" : "Vertices to assign"}</span><strong>${action.cost}</strong></div></div><p>${describeAction(action)}</p>${action.kind === "bury" ? `<div class="decision">${action.cost} &lt; ${action.remaining} <span>→ neighborhood fits</span></div>` : action.kind === "fallback" ? `<div class="decision">w ≥ r <span>→ single-vertex fallback</span></div>` : ""}<p class="hint">${state.mode === "bury" ? "Node labels show vertex ID · current weight. The dark ring marks the next center." : "Switch to BURY to see the active weights and next neighborhood."}</p>` : `<p>${done ? "All target sizes are satisfied. Try a different graph, change the hamlet sizes, or experiment with your own coloring." : "Resolve the capacity warning to preview a BURY step."}</p>`}${last ? `<div class="last-move"><p class="eyebrow">LAST STEP</p><p>${describeAction(last)}</p><span class="hint">The gold halo marks newly assigned vertices.</span></div>` : ""}`;
}
