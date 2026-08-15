"use strict";
const assert = require("node:assert/strict");
const { loadApp } = require("../qa-harness");

const app = loadApp();
const seed = app.get("SEED");

assert.deepEqual(Object.keys(seed.plan).sort(), ["legs","pull_bonus","pull_main","push_bonus","push_main"]);
assert.ok(seed.exercises.db_lateral_raise, "cable_seitheben must be renamed in SEED itself, not just aliased at migration time");
assert.ok(!seed.exercises.db_schraegbank, "db_schraegbank must not exist in v3-native SEED");

assert.equal(app.call("planKeyFor", "push", "main"), "push_main");
assert.equal(app.call("planKeyFor", "push", "bonus"), "push_bonus");
assert.equal(app.call("planKeyFor", "legs", "bonus"), "legs", "legs has no bonus variant");

app.setS({ ...JSON.parse(JSON.stringify(seed)), gami:{} });
assert.deepEqual([...app.call("planExercisesFor", "push", "main")], [...app.S().plan.push_main]);
assert.deepEqual([...app.call("planExercisesAll", "push")], [...new Set([...app.S().plan.push_main, ...app.S().plan.push_bonus])]);

// togglePlan toggles main only; toggleBonusPlan toggles bonus only
const exId = app.S().plan.push_main[0];
assert.equal(app.call("planMembership", "push", exId), true);
app.call("togglePlan", "push", exId);
assert.equal(app.call("planMembership", "push", exId), false, "togglePlan removes from push_main");
assert.equal(app.S().plan.push_bonus.includes(exId), false, "togglePlan must not touch push_bonus");
app.call("togglePlan", "push", exId);
assert.equal(app.call("planMembership", "push", exId), true, "togglePlan re-adds to push_main");

app.call("toggleBonusPlan", "push", exId);
assert.equal(app.S().plan.push_bonus.includes(exId), true);
app.call("toggleBonusPlan", "push", exId);
assert.equal(app.S().plan.push_bonus.includes(exId), false);
app.call("toggleBonusPlan", "legs", "db_goblet_squat");
assert.equal(app.S().plan.legs.includes("db_goblet_squat"), true, "toggleBonusPlan on legs must be a no-op, not corrupt the legs list");

// startWithMood builds S.draft.entries from the right main/bonus list and stamps variant
app.setS({ ...JSON.parse(JSON.stringify(seed)), gami:{} });
app.S().cycle = { position: 0, completedCycles: 0, variant: "B" }; // B => pull is the bonus type
app.call("go", "session");
app.call("startWithMood", "pull", "ready", "bonus");
const draft = app.S().draft;
assert.equal(draft.type, "pull");
assert.equal(draft.variant, "bonus");
assert.deepEqual([...draft.entries.map(e=>e.exerciseId)], [...app.S().plan.pull_bonus]);

console.log("OK");
