// The plate's framing (kit/plate.ts: viewWindow, coverFit, aimAt; the
// Director's use of them in City3D.tsx): from every pose a place uses, at
// every shape from a 21:9 monitor to a phone, the painting fills what must
// be filled (no edge ever shows), and on the narrow layout the painting is
// framed to the strip above the sheet, not the whole screen.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";

registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (error) {
      if (/^\.{1,2}\//.test(specifier) && !/\.[cm]?[jt]sx?$/.test(specifier)) return next(`${specifier}.ts`, context);
      throw error;
    }
  },
});

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const THREE = await import("three");
const { aimAt, coverFit, coverMargin, maxPull, plateFrame, viewWindow } = await import("../app/components/city3d/kit/plate.ts");
const { scenes } = await import("../app/components/city3d/scenes.ts");

// The camera at a pose (place coordinates), as the Director sets it, with
// a lens, a shift (setViewOffset) and an aspect; and the painting's fit
// from there: does the fitted painting cover the window?
function fitFrom(def, pose, { aspect, fov, shift = 0, shiftY = 0, fill = 1 }) {
  const cam = new THREE.PerspectiveCamera(fov, aspect, 0.1, 2000);
  const W = 1000, H = W / aspect;
  if (shift || shiftY) cam.setViewOffset(W, H, shift * W, shiftY * H, W, H);
  cam.updateProjectionMatrix();
  cam.position.set(...pose.pos);
  cam.lookAt(new THREE.Vector3(...pose.target));
  const frame = plateFrame(def);
  const home = new THREE.Matrix4().lookAt(new THREE.Vector3(...frame.eye), new THREE.Vector3(...frame.target), new THREE.Vector3(0, 1, 0)).setPosition(...frame.eye);
  const rel = new THREE.Matrix4().compose(cam.position, cam.quaternion, new THREE.Vector3(1, 1, 1)).premultiply(home.clone().invert());
  const win = viewWindow(cam.projectionMatrixInverse, rel, frame.distance, [0, maxPull(def.plate)], fill);
  const fit = coverFit(win, frame, coverMargin(def.plate), def.plate.look ?? null);
  const covers = win.x0 >= fit.cx - (fit.s * frame.width) / 2 - 1e-6 && win.x1 <= fit.cx + (fit.s * frame.width) / 2 + 1e-6 && win.y0 >= fit.cy - (fit.s * frame.height) / 2 - 1e-6 && win.y1 <= fit.cy + (fit.s * frame.height) / 2 + 1e-6;
  return { win, fit, frame, covers };
}

test("from the home pose the window is the lens's own, whatever the depth, and the fit is the plain cover", () => {
  for (const [id, def] of Object.entries(scenes)) {
    const { win, fit, frame } = fitFrom(def, def.home, { aspect: 16 / 10, fov: def.plateFrame.fov });
    const h = 2 * frame.distance * Math.tan(((def.plateFrame.fov / 2) * Math.PI) / 180);
    assert.ok(Math.abs(win.y1 - win.y0 - h) < 1e-6 * h, id);
    assert.ok(Math.abs(fit.cx) < 1e-9 || def.plate.look, id);
  }
});

test("every pose a place uses (home, every focus, enter and exit) is covered from 21:9 to a portrait phone", () => {
  const shapes = [21 / 9, 16 / 9, 16 / 10, 4 / 3, 390 / 844];
  for (const [id, def] of Object.entries(scenes)) {
    const poses = { home: def.home, enter: def.enter, exit: def.exit, ...def.focus };
    for (const aspect of shapes)
      for (const [name, pose] of Object.entries(poses)) {
        // a wide screen shifts the view to the panel's free half
        const shift = aspect > 1 && def.frame === "right" ? -0.2 : 0;
        const r = fitFrom(def, pose, { aspect, fov: def.fov, shift });
        assert.ok(r.covers, `${id} ${name} at ${aspect.toFixed(2)}`);
      }
  }
});

test("Projects' pan at 21:9 grows the painting rather than showing past its edge", () => {
  const def = scenes.towers;
  const pan = Object.values(def.focus)[0];
  const home = fitFrom(def, def.home, { aspect: 21 / 9, fov: def.fov, shift: -0.2 });
  const there = fitFrom(def, pan, { aspect: 21 / 9, fov: def.fov, shift: -0.2 });
  assert.ok(there.covers);
  assert.ok(there.fit.s >= home.fit.s - 1e-9);
});

test("the narrow layout: the strip between the bar and the sheet holds the painting's whole height on a portrait phone, its subject slid to the middle", () => {
  for (const [id, def] of Object.entries(scenes)) {
    const aspect = 390 / 844, fill = (0.46 * 844) / 844;
    const k = Math.min(1 / fill, (def.plate.aspect * 1) / aspect);
    const fov = (2 * Math.atan((Math.tan(((def.plateFrame.fov / 2) * Math.PI) / 180) * k) / coverMargin(def.plate)) * 180) / Math.PI;
    const r = fitFrom(def, def.home, { aspect, fov, fill });
    assert.ok(r.covers, id);
    // no more than the margin's growth: the strip shows the painting's height
    assert.ok(r.fit.s <= coverMargin(def.plate) + 1e-6, `${id}: s ${r.fit.s}`);
    const shown = (r.win.x1 - r.win.x0) / (r.frame.width * r.fit.s);
    assert.ok(shown > 0.4, `${id}: ${(shown * 100).toFixed(0)}% of the width (a whole-screen cover showed about 20%)`);
  }
  const city = read("app/components/city3d/City3D.tsx");
  assert.match(city, /plateView\.fill = bottom \/ size\.height;\s*plateView\.top = top \/ size\.height;/);
  assert.match(city, /fov = lens\(\(tan\(def\.plateFrame\.fov \/ 2\) \* k\) \/ coverMargin\(def\.plate\)\);/);
});

test("aimAt turns degrees off the home axis into the painting point there; coverFit slides toward the aim only as far as filling allows", () => {
  const def = scenes.bund;
  assert.deepEqual(aimAt(def, 0, 0), [0.5, 0.5]);
  const [u] = aimAt(def, 10, 0);
  assert.ok(u > 0.5);
  const frame = { width: 2, height: 1 };
  // a window half the painting: room to slide the aim to the axis
  const free = coverFit({ x0: -0.5, x1: 0.5, y0: -0.25, y1: 0.25 }, frame, 1, [0.25, 0.5]);
  assert.equal(free.s, 1);
  assert.ok(Math.abs(free.cx - 0.5) < 1e-9, "u 0.25 brought to the axis");
  // a window the painting's width: no room, held in
  const held = coverFit({ x0: -1, x1: 1, y0: -0.5, y1: 0.5 }, frame, 1, [0.1, 0.5]);
  assert.equal(held.cx, 0);
});
