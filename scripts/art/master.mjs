// Manage the versioned desktop masters (docs/art/park/master-log.json).
//
//   node scripts/art/master.mjs init            log v00 (the original candidate)
//   node scripts/art/master.mjs status          list versions, mark the current one
//   node scripts/art/master.mjs guide <edit>    draw an edit's region on the current master
//   node scripts/art/master.mjs rollback <vNN>  make vNN current again (later versions stay on disk)
//   node scripts/art/master.mjs verify          check every master file against its logged hash

import { ART, EDITS_FILE, LOG_FILE, outline, readJson, sha256, writeJson } from "./lib.mjs";

const [command, arg] = process.argv.slice(2);
const log = readJson(LOG_FILE, []);
const active = () => log.filter((entry) => !entry.rolledBack);

if (command === "init") {
  if (log.length) throw new Error(`${LOG_FILE} already exists`);
  const file = `${ART}/masters/pk-d-v00.png`;
  log.push({
    version: "v00",
    file,
    sha256: sha256(file),
    date: new Date().toISOString().slice(0, 10),
    source: `${ART}/candidates/pk-d-c01.png`,
    note: "Original ChatGPT Images candidate c01, unchanged",
  });
  writeJson(LOG_FILE, log);
  console.log(`Logged ${file}`);
} else if (command === "status") {
  const current = active().at(-1);
  for (const entry of log) {
    const mark = entry === current ? "→" : entry.rolledBack ? "×" : " ";
    console.log(`${mark} ${entry.version}  ${entry.edit ?? "original"}  ${entry.file}`);
  }
} else if (command === "guide") {
  const { edits } = readJson(EDITS_FILE);
  const region = edits[arg];
  if (!region) throw new Error(`Unknown edit "${arg}"`);
  const out = `${ART}/guides/${arg}-region.png`;
  await outline(active().at(-1).file, region, out, `${arg.toUpperCase()}: ${region.name}`);
  console.log(`Wrote ${out}`);
} else if (command === "rollback") {
  const index = log.findIndex((entry) => entry.version === arg);
  if (index < 0) throw new Error(`No version ${arg}`);
  log.forEach((entry, i) => {
    if (i > index && !entry.rolledBack) entry.rolledBack = new Date().toISOString().slice(0, 10);
  });
  writeJson(LOG_FILE, log);
  console.log(`${arg} is current again; later versions are kept on disk and marked rolled back`);
} else if (command === "verify") {
  let ok = true;
  for (const entry of log) {
    const match = sha256(entry.file) === entry.sha256;
    ok &&= match;
    console.log(`${match ? "ok  " : "FAIL"} ${entry.version} ${entry.file}`);
  }
  if (!ok) process.exit(1);
} else {
  console.error("Usage: node scripts/art/master.mjs init|status|guide <edit>|rollback <vNN>|verify");
  process.exit(1);
}
