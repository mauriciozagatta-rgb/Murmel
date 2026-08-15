"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => /^\d+-.*\.test\.js$/.test(f)).sort();

let failed = 0;
for (const f of files) {
  const full = path.join(dir, f);
  try {
    execFileSync(process.execPath, [full], { stdio: "pipe", encoding: "utf8" });
    console.log("PASS  " + f);
  } catch (e) {
    failed++;
    console.log("FAIL  " + f);
    console.log((e.stdout || "") + (e.stderr || ""));
  }
}
console.log(`\n${files.length - failed}/${files.length} passed`);
process.exit(failed ? 1 : 0);
