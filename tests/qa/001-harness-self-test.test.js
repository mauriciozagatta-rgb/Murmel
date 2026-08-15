"use strict";
const assert = require("node:assert/strict");
const { loadApp } = require("../qa-harness");

const app = loadApp();

assert.equal(app.S(), null, "S should be null before loadState() runs — nothing has booted the app yet");
assert.equal(app.get("SEED").version, 3, "SEED.version must be bumped to CURRENT_VERSION (3) as part of Task 1");
assert.equal(app.call("roundToInc", 21.3, 2.5), 22.5, "roundToInc is a pre-existing pure function — sanity check that call() can invoke real app code");

console.log("OK");
