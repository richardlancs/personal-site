// Nothing 3D reaches the 2D page (docs/superpowers/plans/2026-11-19-shanghai-3d.md,
// Review Focus 1): from app/page.tsx and app/layout.tsx, every relative
// import (static, and import(), but not `import type`) is followed through
// .ts/.tsx and index files. None of them may import three, R3F,
// postprocessing, or anything under components/city3d/ other than
// city3d/store.ts, which may itself import only react and app/lib/. And the
// park's folders are gone.
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { test } from "node:test";

const root = new URL("../", import.meta.url).pathname;

// The specifiers a file loads at run time: `import x from`, `export … from`,
// side-effect imports and import(); not `import type` or `export type`
function specifiers(src) {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const out = [];
  for (const m of code.matchAll(/^\s*(import|export)\s+(type\s+)?([^;]*?)\s+from\s+["']([^"']+)["']/gm)) if (!m[2]) out.push(m[4]);
  for (const m of code.matchAll(/^\s*import\s+["']([^"']+)["']/gm)) out.push(m[1]);
  for (const m of code.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)) out.push(m[1]);
  return out;
}

function resolveFile(from, spec) {
  const base = join(dirname(from), spec);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")])
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  return null;
}

function graph(entries) {
  const seen = new Map(); // file -> its specifiers
  const queue = entries.map((e) => join(root, e));
  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    const specs = specifiers(readFileSync(file, "utf8"));
    seen.set(file, specs);
    for (const spec of specs) {
      if (!spec.startsWith(".")) continue;
      const next = resolveFile(file, spec);
      if (next && /\.(ts|tsx)$/.test(next)) queue.push(next);
    }
  }
  return seen;
}

test("nothing the 2D page imports reaches three, R3F, postprocessing or city3d", () => {
  const seen = graph(["app/page.tsx", "app/layout.tsx"]);
  assert.ok(seen.size > 20, `the walk reached the page's modules (${seen.size})`);
  const store = join(root, "app/components/city3d/store.ts");
  for (const [file, specs] of seen) {
    const rel = relative(root, file);
    assert.ok(!/components\/(world3d|world|locations)\//.test(rel), `${rel}: a park file`);
    if (rel.startsWith("app/components/city3d/")) assert.equal(file, store, `${rel} is reachable from /`);
    for (const spec of specs) {
      assert.ok(!/^(three|@react-three\/|postprocessing)/.test(spec), `${rel} imports ${spec}`);
      if (spec.startsWith(".")) {
        const target = resolveFile(file, spec);
        if (target?.includes("/components/city3d/")) assert.equal(target, store, `${rel} imports ${spec}`);
      }
    }
  }
  // The store is shared (Still view uses it): React and app/lib only
  for (const spec of specifiers(readFileSync(store, "utf8"))) {
    if (spec === "react") continue;
    const target = resolveFile(store, spec);
    assert.ok(target && relative(root, target).startsWith("app/lib/"), `city3d/store.ts imports ${spec}`);
  }
});

test("the park's code is gone", () => {
  for (const dir of ["app/components/world3d", "app/components/world", "app/components/locations", "app/globals.css"]) assert.ok(!existsSync(join(root, dir)), dir);
});
