"use strict";
const assert = require("node:assert/strict");
const { loadApp } = require("../qa-harness");

const app = loadApp();
const seed = app.get("SEED");

for (const id of ["cable_incline_press","db_arnold_press","cable_incline_fly","cable_straight_arm_pulldown","db_chest_supported_row","db_incline_curl","cable_leg_curl"]){
  const ex = seed.exercises[id];
  assert.ok(ex, id+" must exist in SEED.exercises");
  assert.ok(ex.name && ex.repMin>0 && ex.repMax>=ex.repMin && ex.increment>0 && ex.muscle, id+" must have a complete schema");
  assert.ok(["db","cable"].includes(ex.equipment), id+" must declare its equipment");
}
assert.equal(seed.exercises.cable_incline_press.equipment, "cable");
assert.equal(seed.exercises.cable_leg_curl.attachment, "cuffs");

assert.deepEqual([...seed.plan.push_bonus], ["cable_incline_press","db_arnold_press","cable_incline_fly","cable_trizeps_oh","db_lateral_raise"]);
assert.deepEqual([...seed.plan.pull_bonus], ["cable_straight_arm_pulldown","db_chest_supported_row","cable_rudern","cable_facepulls","db_incline_curl"]);
assert.ok(seed.plan.legs.includes("cable_leg_curl"));

// reused exercises must not have been duplicated or redefined
assert.equal(Object.keys(seed.exercises).filter(id=>id==="cable_trizeps_oh").length, 1);

console.log("OK");
