export function renderMetric(element, state, metric, validation, actions) {
  const history = state.history.map((s) => s.score);
  const max = Math.max(1, ...history);
  const points = history
    .map(
      (score, i) =>
        `${10 + (i / Math.max(1, history.length - 1)) * 240},${66 - (score / max) * 52}`,
    )
    .join(" ");
  element.innerHTML = `<p class="section-number">03 / MEASURE</p><h2>Bell-pair cost <span class="info-dot" title="Exact cost of the paper's VCG protocol for the assigned vertices.">i</span></h2><div class="score-value">${metric.total}<span>Bell pairs</span></div><p class="score-status ${validation.complete ? "complete" : ""}">${validation.errors.length ? "Invalid constraints · provisional score" : validation.complete ? "Complete partition · VCG cost" : `Partial score · ${validation.uncolored} unassigned`}</p><div class="formula">F = Σ<sub>i&lt;j</sub> maximum matching(i, j)</div><p class="hint">Lower is better for a complete partition. Internal edges are free. Unassigned vertices are excluded.</p><div class="metric-comparison"><span>Cross-hamlet edges</span><strong>${metric.cutEdges}</strong></div><label class="check-label"><input id="show-matching" type="checkbox" ${state.showMatching ? "checked" : ""}> Highlight matching edges</label><label for="inspect-pair">Inspect a hamlet pair</label><select id="inspect-pair"><option value="all">All pairs · total ${metric.total}</option>${metric.pairs.map((p) => `<option value="${p.a}-${p.b}" ${state.pair === `${p.a}-${p.b}` ? "selected" : ""}>H${p.a + 1} ↔ H${p.b + 1} · ${p.size} Bell pair${p.size === 1 ? "" : "s"}</option>`).join("")}</select><details class="pair-details"><summary>Pair-by-pair breakdown</summary><table><thead><tr><th>Hamlets</th><th>Matching size</th></tr></thead><tbody>${metric.pairs.map((p) => `<tr><td>H${p.a + 1} ↔ H${p.b + 1}</td><td>${p.size}</td></tr>`).join("")}</tbody></table><p class="hint">Each pair is independent; a vertex can appear in matchings for different pairs.</p></details>${history.length > 1 ? `<div class="score-history"><p class="eyebrow">COST DURING THIS RUN</p><svg viewBox="0 0 260 80" role="img" aria-label="Provisional cost across ${history.length - 1} steps: ${history.join(", ")}"><path d="M10 14V66H250" fill="none" stroke="#dce3dd"/><polyline points="${points}" fill="none" stroke="#187c70" stroke-width="2.5" stroke-linejoin="round"/><circle cx="250" cy="${66 - (history.at(-1) / max) * 52}" r="3.5" fill="#187c70"/><text x="12" y="12">${max}</text><text x="10" y="79">start</text><text x="214" y="79">step ${history.length - 1}</text></svg><p class="hint last">This can rise as vertices are assigned; it is not an optimization trajectory.</p></div>` : ""}`;
  element.querySelector("#show-matching").onchange = (e) =>
    actions.showMatching(e.target.checked);
  element.querySelector("#inspect-pair").onchange = (e) =>
    actions.inspectPair(e.target.value);
}
