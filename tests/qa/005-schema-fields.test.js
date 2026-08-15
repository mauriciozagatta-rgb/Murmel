"use strict";
const assert = require("node:assert/strict");
const { loadApp } = require("../qa-harness");

const app = loadApp();

const ATTACHMENTS = app.get("ATTACHMENTS");
assert.deepEqual([...ATTACHMENTS], ["V-bar","straight-bar","rope","cuffs","strap","none"]);
const BENCH_POSITIONS = app.get("BENCH_POSITIONS");
assert.deepEqual([...BENCH_POSITIONS], [90,105,125,135,155,180,210]);

const seed = app.get("SEED");
assert.equal(seed.exercises.db_flachbank.equipment, "db");
assert.equal(seed.exercises.db_flachbank.benchPos, 180);
assert.equal(seed.exercises.cable_latzug.equipment, "cable");
assert.equal(seed.exercises.cable_latzug.pulleyPos, 18);
assert.equal(seed.exercises.cable_latzug.attachment, "straight-bar");
assert.equal(seed.exercises.cable_latzug.ratio, "1:1");
assert.equal(seed.exercises.cable_trizeps_oh.pulleyPos, 1);
assert.equal(seed.exercises.plank.equipment, "bodyweight");
assert.equal(seed.exercises.lunge_l1_split_squat.equipment, "bodyweight");

// vExEdit shows cable-only controls for a cable exercise, hides them for a DB one
app.setS(JSON.parse(JSON.stringify(seed)));
app.call("go", "exEdit", "cable_latzug");
const cableHtml = app.call("vExEdit");
assert.match(cableHtml, /Rollenposition/);
assert.match(cableHtml, /Anbauteil/);

app.call("go", "exEdit", "db_flachbank");
const dbHtml = app.call("vExEdit");
assert.doesNotMatch(dbHtml, /Rollenposition/, "a DB exercise must not show pulley/attachment controls");
assert.match(dbHtml, /Bankposition/, "a bench-eligible exercise (DB or cable) shows the bench-angle control");

console.log("OK");
