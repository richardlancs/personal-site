// The 3D city's renderer tiers (app/components/city3d/tiers.ts): which tier
// a device gets, the numbers each tier is held to, and the step down.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { FLAT_QUERY } from "../app/components/city3d/flat.ts";
import { pickTier, readTierInput, SAVE_DATA_MB, stepDown, TIERS } from "../app/components/city3d/tiers.ts";

const desk = { coarse: false, narrow: false, renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060)", cores: 8, memoryGB: 8, saveData: false };

test("coarse pointers and the narrow layout get the mobile tier", () => {
  assert.equal(pickTier({ ...desk, coarse: true }), "mobile");
  assert.equal(pickTier({ ...desk, narrow: true }), "mobile");
});
test("integrated GPUs, few cores, little memory or Save-Data get the low tier", () => {
  for (const patch of [{ renderer: "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics)" }, { renderer: "ANGLE (AMD, AMD Radeon(TM) Graphics)" }, { cores: 4 }, { memoryGB: 4 }, { saveData: true }])
    assert.equal(pickTier({ ...desk, ...patch }), "low", JSON.stringify(patch));
});
test("Apple, discrete (Intel Arc included) and unknown renderers get high", () => {
  for (const renderer of ["ANGLE (Apple, Apple M2, OpenGL 4.1)", "ANGLE (Intel, Intel(R) Arc(TM) A770)", null]) assert.equal(pickTier({ ...desk, renderer }), "high", String(renderer));
});
test("?tier= wins", () => assert.equal(pickTier({ ...desk, forced: "mobile" }), "mobile"));
test("bloom only on desktop tiers; composer tiers turn the canvas's antialias off", () => {
  assert.equal(TIERS.mobile.bloom, null);
  assert.deepEqual([TIERS.high.dpr[1], TIERS.low.dpr[1], TIERS.mobile.dpr[1]], [1.75, 1.5, 1.25]);
  assert.deepEqual([TIERS.high.canvasAntialias, TIERS.low.canvasAntialias, TIERS.mobile.canvasAntialias], [false, false, true]);
  assert.equal(TIERS.high.bloom.threshold, 1);
  assert.ok(TIERS.high.drawCalls > TIERS.low.drawCalls && TIERS.low.drawCalls > TIERS.mobile.drawCalls);
});
test("the step down happens only from high, only when slow", () => {
  assert.equal(stepDown("high", 30), "low");
  assert.equal(stepDown("high", 12), "high");
  assert.equal(stepDown("low", 99), "low");
});

// Beyond the brief's cases

test("software renderers and other integrated GPUs get low; discrete Radeons stay high", () => {
  for (const renderer of ["ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)", "llvmpipe (LLVM 15.0.7, 256 bits)", "ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)", "AMD Radeon 780M Graphics"])
    assert.equal(pickTier({ ...desk, renderer }), "low", renderer);
  assert.equal(pickTier({ ...desk, renderer: "ANGLE (AMD, AMD Radeon RX 6800 XT Direct3D11 vs_5_0 ps_5_0, D3D11)" }), "high");
  assert.equal(pickTier({ ...desk, memoryGB: null }), "high");
});

test("the step down is 1.5x the high tier's target, and ignores a missing reading", () => {
  assert.equal(stepDown("high", 1.5 * TIERS.high.frameMs), "high");
  assert.equal(stepDown("high", 1.5 * TIERS.high.frameMs + 0.01), "low");
  assert.equal(stepDown("high", NaN), "high");
  assert.equal(stepDown("mobile", 99), "mobile");
});

test("the tiers keep the plan's numbers", () => {
  assert.deepEqual([TIERS.high.msaa, TIERS.low.msaa, TIERS.mobile.msaa], [4, 2, 0]);
  assert.deepEqual([TIERS.high.reflection, TIERS.low.reflection, TIERS.mobile.reflection], ["planar", "fake", "fake"]);
  assert.deepEqual([TIERS.high.shadowMap, TIERS.low.shadowMap, TIERS.mobile.shadowMap], [2048, 1024, 0]);
  assert.deepEqual([TIERS.high.frameMs, TIERS.low.frameMs, TIERS.mobile.frameMs], [12, 9, 8]);
  assert.deepEqual(TIERS.low.bloom, { scale: 0.25, levels: 4, threshold: 1, smoothing: 0.05 });
  // Measured from the build (budget.mjs city3dJs), rounded up to a tenth of a MB
  assert.equal(SAVE_DATA_MB, 0.3);
});

test("the flat query is the narrow layout's, imported from flat.ts", () => {
  const source = readFileSync(new URL("../app/components/city3d/tiers.ts", import.meta.url), "utf8");
  assert.match(source, /import \{ FLAT_QUERY \} from "\.\/flat\.ts"/);
  assert.doesNotMatch(source, /"\(orientation: portrait\)/, "no second copy of the query");
  assert.equal(FLAT_QUERY, "(orientation: portrait), (max-width: 767px), (max-height: 480px)");
});

// A fake GL context: RENDERER is 0x1F01; the debug extension's unmasked
// renderer 0x9246
function fakeGl({ renderer, unmasked }) {
  return {
    RENDERER: 0x1f01,
    getParameter: (p) => (p === 0x1f01 ? renderer : p === 0x9246 ? unmasked : null),
    getExtension: (name) => (name === "WEBGL_debug_renderer_info" && unmasked !== undefined ? { UNMASKED_RENDERER_WEBGL: 0x9246 } : null),
  };
}
const media = (on) => (q) => ({ matches: on.includes(q) });

test("readTierInput reads RENDERER, then the debug extension, then gives up", () => {
  const env = { nav: { hardwareConcurrency: 8, deviceMemory: 8 }, matchMedia: media([]) };
  assert.equal(readTierInput(fakeGl({ renderer: "ANGLE (Apple, Apple M2, OpenGL 4.1)" }), "", env).renderer, "ANGLE (Apple, Apple M2, OpenGL 4.1)");
  assert.equal(readTierInput(fakeGl({ renderer: "WebKit WebGL", unmasked: "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics)" }), "", env).renderer, "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics)");
  assert.equal(readTierInput(fakeGl({ renderer: "WebKit WebGL" }), "", env).renderer, null);
});

test("readTierInput reads the pointer, the layout, the device and ?tier=", () => {
  const gl = fakeGl({ renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060)" });
  const input = readTierInput(gl, "?tier=low&x=1", {
    nav: { hardwareConcurrency: 4, deviceMemory: 2, connection: { saveData: true } },
    matchMedia: media(["(pointer: coarse)", FLAT_QUERY]),
  });
  assert.deepEqual(input, { coarse: true, narrow: true, renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060)", cores: 4, memoryGB: 2, saveData: true, forced: "low" });
  assert.equal(pickTier(input), "low");

  // Nothing known: plenty of cores, unknown memory, no Save-Data, no forced tier
  const bare = readTierInput(gl, "?tier=ultra", { nav: {}, matchMedia: media([]) });
  assert.deepEqual(bare, { coarse: false, narrow: false, renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060)", cores: 8, memoryGB: null, saveData: false, forced: null });
  assert.equal(pickTier(bare), "high");
});

test("readTierInput honours a passed flat query", () => {
  const gl = fakeGl({ renderer: null });
  assert.equal(readTierInput(gl, "", { nav: {}, matchMedia: media(["(max-width: 1px)"]), flatQuery: "(max-width: 1px)" }).narrow, true);
});
