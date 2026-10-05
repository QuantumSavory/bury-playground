import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.registeredTools = {};
    Object.defineProperty(document, "modelContext", {
      value: {
        registerTool(tool) {
          window.registeredTools[tool.name] = tool;
        },
      },
    });
  });
  await page.goto("/");
});
const read = (page) =>
  page.evaluate(() => window.registeredTools.read_bury_playground.execute({}));

test("step, back, finish, and restart a balanced graph", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await expect(page.locator("#graph-count")).toHaveText(
    "16 vertices · 24 edges",
  );
  await expect(page.locator("#step-widget h2")).toHaveText("Bury vertex 1");
  await page.getByRole("button", { name: "Next step" }).click();
  expect(Object.keys((await read(page)).colors)).toHaveLength(3);
  await expect(page.locator("#step-widget h2")).toHaveText("Bury vertex 2");
  await page.getByRole("button", { name: "Go back one BURY step" }).click();
  expect(Object.keys((await read(page)).colors)).toHaveLength(0);
  await page.locator("#speed").selectOption("180");
  await page.getByRole("button", { name: "Run to completion" }).click();
  await expect(page.locator(".constraint-status")).toContainText(
    "All vertices assigned",
    { timeout: 10000 },
  );
  const complete = await read(page);
  expect(complete.validation.counts).toEqual([8, 8]);
  expect(complete.metric.total).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: "Next step" })).toBeDisabled();
  await page.getByRole("button", { name: "Start from scratch" }).click();
  expect((await read(page)).validation.uncolored).toBe(16);
  expect(errors).toEqual([]);
});
test("manual colors are retained; overcapacity warns and prevents BURY", async ({
  page,
}) => {
  await page.getByText("Keyboard graph controls & vertex list").click();
  await page.getByLabel("Vertex 1 hamlet", { exact: true }).selectOption("1");
  await page.getByRole("button", { name: "Next step" }).click();
  expect((await read(page)).colors["1"]).toBe(1);
  await page.getByRole("button", { name: "Clear colors" }).click();
  for (let id = 1; id <= 9; id++)
    await page
      .getByLabel(`Vertex ${id} hamlet`, { exact: true })
      .selectOption("0");
  await expect(page.locator(".constraint-status")).toContainText(
    "over capacity: 9 / 8",
  );
  await expect(page.getByRole("button", { name: "Next step" })).toBeDisabled();
  await page
    .getByLabel("Vertex 9 hamlet", { exact: true })
    .selectOption("none");
  await expect(page.getByRole("button", { name: "Next step" })).toBeEnabled();
});
test("drawing tools add vertices/edges, hotkeys select colors, and delete works", async ({
  page,
}) => {
  await page.locator("#preset").selectOption("empty");
  await page.getByRole("button", { name: "Generate graph" }).click();
  const canvas = page.locator("#graph");
  await canvas.click({ position: { x: 120, y: 150 } });
  await canvas.click({ position: { x: 250, y: 250 } });
  await expect(page.locator("#graph-count")).toHaveText("2 vertices · 0 edges");
  // Canvas model is recovered only for exact screen coordinates; interactions remain real clicks.
  const nodePosition = (id) =>
    page.evaluate((id) => {
      const container = document.getElementById("graph");
      const p = container._cyreg.cy
        .getElementById(String(id))
        .renderedPosition();
      const box = container.getBoundingClientRect();
      return { x: box.x + p.x, y: box.y + p.y };
    }, id);
  await page.locator('[data-tool="edge"]').click();
  let p = await nodePosition(1);
  await page.mouse.click(p.x, p.y);
  p = await nodePosition(2);
  await page.mouse.click(p.x, p.y);
  await expect(page.locator("#graph-count")).toHaveText("2 vertices · 1 edges");
  await page.locator("h1").click();
  await page.keyboard.press("2");
  await expect(
    page.getByRole("button", { name: "Select Hamlet 2 color" }),
  ).toHaveAttribute("aria-pressed", "true");
  p = await nodePosition(1);
  await page.mouse.click(p.x, p.y);
  expect((await read(page)).colors["1"]).toBe(1);
  await page.locator('[data-tool="erase"]').click();
  p = await nodePosition(2);
  await page.mouse.click(p.x, p.y);
  await expect(page.locator("#graph-count")).toHaveText("1 vertices · 0 edges");
});
test("custom constraints, pair cost, and random graph presets", async ({
  page,
}) => {
  await page.locator("#balanced").uncheck();
  await page.getByLabel("Hamlet 1 target size").fill("7");
  await page.getByLabel("Hamlet 1 target size").blur();
  await expect(page.locator(".constraint-status")).toContainText(
    "add up to 16",
  );
  await page.getByLabel("Hamlet 2 target size").fill("9");
  await page.getByLabel("Hamlet 2 target size").blur();
  await expect(page.getByRole("button", { name: "Next step" })).toBeEnabled();
  await page.locator("#balanced").check();
  await page.locator("#preset").selectOption("random");
  await page.getByLabel("Edge probability").fill("1");
  await page.getByRole("button", { name: "Generate graph" }).click();
  await expect(page.locator("#graph-count")).toHaveText(
    "16 vertices · 120 edges",
  );
  await page.locator("#speed").selectOption("180");
  await page.getByRole("button", { name: "Run to completion" }).click();
  await expect(page.locator(".constraint-status")).toContainText(
    "All vertices assigned",
    { timeout: 10000 },
  );
  expect((await read(page)).metric.total).toBe(8);
  await page.locator("#inspect-pair").selectOption("0-1");
  await expect(page.locator("#inspect-pair")).toHaveValue("0-1");
  await page.locator("#preset").selectOption("spatial");
  await page.getByRole("button", { name: "Generate graph" }).click();
  expect((await read(page)).graph.nodes).toHaveLength(16);
});
test("optional WebMCP tools validate inputs and update visible state", async ({
  page,
}) => {
  expect(
    await page.evaluate(() => Object.keys(window.registeredTools)),
  ).toEqual(["read_bury_playground", "advance_bury_one_step"]);
  const result = await page.evaluate(() =>
    window.registeredTools.advance_bury_one_step.execute({}),
  );
  expect(result.step).toBe(1);
  await expect(page.locator(".step-counter")).toHaveText("STEP 1");
  const invalid = await page.evaluate(() => {
    try {
      window.registeredTools.advance_bury_one_step.execute({ restart: true });
      return false;
    } catch {
      return true;
    }
  });
  expect(invalid).toBe(true);
  expect((await read(page)).step).toBe(1);
});
test("phone and desktop layouts fit; page has no runtime errors", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.locator("#graph")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/playground-${width}.png`,
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});
