// The city kit's neon, screens, signs and text textures
// (app/components/city3d/kit/{neon,signs,textures,glow}.ts). The kit's
// modules import three.js and each other without extensions, so these
// read their source rather than load them; tiers.ts is pure and loads.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { TIERS } from "../app/components/city3d/tiers.ts";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const neonSrc = read("app/components/city3d/kit/neon.ts");
const NEON_HDR = Number(neonSrc.match(/export const NEON_HDR = ([\d.]+)/)[1]);
const SCENE_TONES = Object.fromEntries([...neonSrc.match(/export const SCENE_TONES = \{([^}]*)\}/)[1].matchAll(/(\w+): "(#[0-9a-f]{6})"/gi)].map((m) => [m[1], m[2]]));

test("neon is HDR and sits above the bloom threshold", () => assert.ok(NEON_HDR > TIERS.high.bloom.threshold));
test("the scene's tones are cyan, rose and gold, never the interface's old names", () => {
  assert.deepEqual(Object.keys(SCENE_TONES).sort(), ["cyan", "gold", "rose"]);
  for (const f of ["neon.ts", "signs.ts"]) assert.doesNotMatch(read(`app/components/city3d/kit/${f}`), /\b(magenta|amber)\b/i);
});
test("a navigating sign draws the text it is given; a decorative one draws no letters", () => {
  const src = read("app/components/city3d/kit/signs.ts");
  assert.match(src, /export function buildSign\(/);
  const mark = src.split("export function buildMarkSign")[1].split("\nexport ")[0];
  assert.doesNotMatch(mark, /fillText|strokeText/);
});
test("textures read the city's fonts, and the park's textures are gone", () => {
  const src = read("app/components/city3d/kit/textures.ts");
  assert.match(src, /--font-rajdhani/);
  assert.match(src, /--font-nunito/);
  assert.doesNotMatch(src, /--font-fraunces|flagstones|carvedPanel|leafCluster/);
  assert.match(src, /export function textureBytes/);
});
test("the kit loads no font file of its own", () => assert.doesNotMatch(read("app/components/city3d/kit/signs.ts"), /FontFace|woff2/));

// Beyond the brief's cases

test("the riverside's board edge is the cyan tone, so a board drawn by buildSign keeps its look", () => assert.equal(SCENE_TONES.cyan, "#4fd8ee"));
test("neon is unlit, HDR through uNeon, and not tone mapped by the material", () => {
  const body = neonSrc.split("export function neonMaterial")[1].split("\nexport ")[0];
  assert.match(body, /MeshBasicMaterial/);
  assert.match(body, /toneMapped: false/);
  assert.match(body, /uNeon/);
  assert.match(body, /NEON_HDR/);
  assert.match(body, /onBeforeCompile/);
});
test("every kit material goes through shared(materialKey(...)) with a program key", () => {
  for (const f of ["neon.ts", "signs.ts"]) {
    const src = read(`app/components/city3d/kit/${f}`);
    const made = (src.match(/new THREE\.\w+Material\(/g) ?? []).length;
    const sharedCalls = (src.match(/shared\(/g) ?? []).length;
    assert.ok(sharedCalls >= made, `${f}: ${made} materials, ${sharedCalls} shared() calls`);
  }
  assert.match(neonSrc, /customProgramCacheKey/);
});
test("a sign's face lands on the interface's tones through the tone mapping (its inverse in the shader)", () => {
  assert.match(neonSrc, /NeutralToneMapping|untone/);
  assert.match(neonSrc, /0\.76|StartCompression/);
});
test("no Math.random, and no Chinese or Japanese characters, in the kit's parts", () => {
  for (const f of ["neon.ts", "signs.ts", "textures.ts", "glow.ts"]) {
    const src = read(`app/components/city3d/kit/${f}`);
    assert.doesNotMatch(src, /Math\.random/, f);
    assert.doesNotMatch(src, /[぀-ヿ㐀-鿿]/, f);
  }
});
test("glow.ts keeps glowUniforms, lampBeam and wash, and drops NEON", () => {
  const src = read("app/components/city3d/kit/glow.ts");
  for (const n of ["glowUniforms", "lampBeam", "wash"]) assert.match(src, new RegExp(`export (const|function) ${n}\\b`));
  assert.doesNotMatch(src, /export const NEON\b/);
});
test("textures.ts keeps what the city still uses and drops the park's surfaces", () => {
  const src = read("app/components/city3d/kit/textures.ts");
  for (const n of ["fonts", "textPanel", "textMask", "glowMask", "softDot", "clockFace", "fit"]) assert.match(src, new RegExp(`export (const|function) ${n}\\b`), n);
  for (const n of ["planks", "plaster", "facade", "roofTiles", "enamel", "groundTexture", "singleLeaves", "notice", "deadScreen", "windowPanes"]) assert.doesNotMatch(src, new RegExp(`export (const|function) ${n}\\b`), n);
});
test("mobile's stand-in for bloom is one instanced draw", () => {
  const body = neonSrc.split("export function glowSprites")[1].split("\nexport ")[0];
  assert.match(body, /InstancedMesh/);
  assert.match(body, /uNeon/);
});
