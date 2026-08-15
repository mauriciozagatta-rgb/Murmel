"use strict";
const assert = require("node:assert/strict");
const { loadApp } = require("../qa-harness");

const app = loadApp();

function v2Fixture() {
  return {
    version: 2,
    settings: { restSeconds: 90, weeklyGoal: 4, sound: true, vibration: true },
    bodyweight: { goalKg: 85, log: [], metrics: [] },
    plan: {
      push: ["db_flachbank", "db_schraegbank", "cable_seitheben"],
      pull: ["cable_latzug"],
      legs: ["db_goblet_squat", "cable_rdl", "ex1700000000"],
    },
    exercises: {
      db_flachbank: { name: "Flachbank KH-Drücken", unit: "kg", repMin: 8, repMax: 12, increment: 2, muscle: "chest" },
      db_schraegbank: { name: "Schrägbank KH-Drücken", unit: "kg", repMin: 8, repMax: 12, increment: 2, muscle: "chest" },
      cable_seitheben: { name: "Kabel-Seitheben", unit: "kg", repMin: 12, repMax: 15, increment: 1.25, muscle: "shoulders" },
      cable_latzug: { name: "Latzug (Stange)", unit: "kg", repMin: 8, repMax: 12, increment: 5, muscle: "back" },
      db_goblet_squat: { name: "Goblet Squat", unit: "kg", repMin: 8, repMax: 12, increment: 1, muscle: "quads" },
      cable_rdl: { name: "Kabel-RDL", unit: "kg", repMin: 10, repMax: 15, increment: 2.5, muscle: "hamstrings" },
      ex1700000000: { name: "Eigene Übung", unit: "kg", repMin: 8, repMax: 12, increment: 2.5, muscle: "other" },
    },
    sessions: [
      { id: "s1", type: "push", date: "2026-08-01", entries: [
        { exerciseId: "db_flachbank", sets: [{ kg: 40, reps: 10 }] },
        { exerciseId: "db_schraegbank", sets: [{ kg: 30, reps: 10 }] }, // will be quarantined
        { exerciseId: "cable_seitheben", sets: [{ kg: 10, reps: 12 }] }, // will be aliased
      ]},
      { id: "s2", type: "legs", date: "2026-08-02", entries: [
        { exerciseId: "ex1700000000", sets: [{ kg: 20, reps: 10 }] }, // custom, passthrough
        { exerciseId: "ghost_exercise_id", sets: [{ kg: 5, reps: 5 }] }, // genuine corruption, quarantined
      ]},
    ],
    draft: null,
  };
}

// idempotency: already-v3 data is untouched
const alreadyV3 = { version: 3, sessions: [{ id: "x" }] };
const idemp = app.call("migrate", alreadyV3);
assert.equal(idemp.report, null, "migrate() on already-v3 data must report no-op");
assert.equal(idemp.state, alreadyV3);

// real v2 -> v3 migration
const fixture = v2Fixture();
const { state, report } = app.call("migrate", fixture);

assert.equal(state.version, 3);
assert.equal(state._migrationComplete, true);
assert.ok(state._backup_v2, "pre-migration snapshot must be kept");
assert.equal(state._backup_v2.version, 2, "backup snapshot must be the pre-migration blob");

assert.ok(state.exercises.db_lateral_raise, "cable_seitheben must be aliased to db_lateral_raise");
assert.ok(!state.exercises.cable_seitheben, "old cable_seitheben key must be gone");
assert.ok(!state.exercises.db_schraegbank, "db_schraegbank has no v3 replacement and must be removed");
assert.ok(state.exercises.ex1700000000, "custom exercise must pass through untouched");

const s1 = state.sessions.find(s => s.id === "s1");
assert.equal(s1.entries.length, 2, "db_schraegbank entry must be dropped from the session, cable_seitheben entry kept+aliased");
assert.ok(s1.entries.some(e => e.exerciseId === "db_lateral_raise"), "session entry must follow the alias");

const s2 = state.sessions.find(s => s.id === "s2");
assert.equal(s2.entries.length, 1, "ghost_exercise_id entry must be dropped");
assert.equal(s2.entries[0].exerciseId, "ex1700000000");

assert.equal(state._orphaned.length, 2, "db_schraegbank and ghost_exercise_id references go to _orphaned");
assert.equal(report.sessionsCount, 2);
assert.equal(report.aliasedCount, 2);
assert.equal(report.quarantinedCount, 2);

assert.ok(state.plan.push.includes("db_lateral_raise") && !state.plan.push.includes("cable_seitheben"), "plan lists must follow aliases");
assert.ok(!state.plan.push.includes("db_schraegbank"), "plan lists must drop removed IDs");
assert.ok(state.plan.legs.includes("db_rdl") && !state.plan.legs.includes("cable_rdl"), "cable_rdl must be aliased in plan lists too");
assert.ok(state.plan.legs.includes("ex1700000000"), "custom IDs stay in plan lists");

// idempotency on the freshly migrated blob
const rerun = app.call("migrate", state);
assert.equal(rerun.report, null, "re-running migrate() on the just-migrated blob must be a no-op");

console.log("OK");
