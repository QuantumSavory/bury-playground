import { PRESETS } from "../core/presets.js";
const fields = {
  rows: { label: "Rows", min: 2, max: 10, value: 4 },
  columns: { label: "Columns", min: 2, max: 10, value: 4 },
  count: { label: "Vertices", min: 3, max: 100, value: 16 },
  density: {
    label: "Edge probability",
    min: 0,
    max: 1,
    step: 0.05,
    value: 0.2,
  },
  radius: {
    label: "Local radius (fraction of width)",
    min: 0.1,
    max: 1.5,
    step: 0.05,
    value: 0.35,
  },
  seed: { label: "Random seed", min: 0, max: 999999, value: 42 },
};
export function mountPresets(element, onGenerate) {
  element.innerHTML = `<p class="section-number">01 / BUILD</p><h2>Start with a graph</h2><form id="preset-form"><label for="preset">Graph family</label><select id="preset">${PRESETS.map((p) => `<option value="${p.id}">${p.name}</option>`).join("")}</select><p id="preset-description" class="hint"></p><div id="preset-fields" class="field-grid"></div><button class="button full-width" type="submit">Generate graph <span>↗</span></button></form><p class="hint last">Generating replaces the current graph and coloring.</p>`;
  const select = element.querySelector("#preset");
  function renderFields() {
    const preset = PRESETS.find((p) => p.id === select.value);
    element.querySelector("#preset-description").textContent =
      preset.description;
    element.querySelector("#preset-fields").innerHTML = preset.fields
      .map((name) => {
        const f = fields[name];
        return `<div class="${name === "radius" ? "wide" : ""}"><label for="param-${name}">${f.label}</label><input type="number" id="param-${name}" name="${name}" min="${f.min}" max="${f.max}" step="${f.step ?? 1}" value="${f.value}" required></div>`;
      })
      .join("");
  }
  select.addEventListener("change", renderFields);
  element.querySelector("form").addEventListener("submit", (event) => {
    event.preventDefault();
    const preset = PRESETS.find((p) => p.id === select.value);
    const params = Object.fromEntries(
      Array.from(new FormData(event.target), ([key, value]) => [
        key,
        Number(value),
      ]),
    );
    onGenerate(
      preset.generate(params),
      preset.id === "grid"
        ? `${params.rows} × ${params.columns} grid`
        : preset.name,
    );
  });
  renderFields();
}
